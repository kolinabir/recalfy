import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { Paywall } from '../billing/paywall';
import { BrainService, Reply } from '../brain/brain.service';
import { Action } from '../channels/channel';
import { CHANNEL_ADAPTERS, ChannelAdapter, InboundMessage } from '../channels/channel';
import { Outbox } from '../channels/outbox';
import { UserStore } from '../memory/user.store';
import { needsTopicSync } from '../topics/needs-sync';
import { TopicMirror } from '../topics/topic-mirror';
import { ConversationLog } from './conversation-log';
import { mergeTurn, turnKey } from './merge-turn';
import { Responder } from './responder';
import { TurnQueue } from './turn-queue';
import { undoAction } from './undo';

/**
 * The one place inbound messages become outbound ones. Reads as the shape of
 * a turn: identify, acknowledge, log, think, reply.
 *
 * Messages do not go straight in. They pass through a TurnQueue, which holds
 * them for a moment so a burst becomes one turn, and which keeps two turns for
 * the same conversation from running at once — see turn-queue.ts for the bug
 * that bought both.
 *
 * There are no commands. Everything the user types is ordinary conversation,
 * and the model decides whether that means answering, remembering, forgetting,
 * or scheduling.
 */
@Injectable()
export class BotService implements OnModuleInit {
  constructor(
    @Inject(CHANNEL_ADAPTERS) private readonly adapters: ChannelAdapter[],
    private readonly outbox: Outbox,
    private readonly paywall: Paywall,
    private readonly users: UserStore,
    private readonly log: ConversationLog,
    private readonly brain: BrainService,
    private readonly responder: Responder,
    private readonly topics: TopicMirror,
  ) {}

  private readonly logger = new Logger(BotService.name);

  private readonly turns = new TurnQueue<InboundMessage>(
    (messages) => this.handle(mergeTurn(messages)),
    (error: unknown) => this.logger.error(`Turn failed: ${message(error)}`),
  );

  onModuleInit(): void {
    for (const adapter of this.adapters) {
      adapter.onMessage(async (inbound) => {
        this.turns.add(turnKey(inbound), inbound);
      });
    }
  }

  private async handle({
    userId,
    address,
    text,
    messageId,
    threadId,
    receivedAt,
  }: InboundMessage): Promise<void> {
    // Before persistence and before the model, for the same reason the link
    // check runs before both: everything below this line costs money. The
    // limits come back from the same call, so nothing downstream has to ask
    // billing anything a second time.
    const limits = await this.paywall.admit(userId, address.channel);
    if (!limits) return;

    const user = await this.users.ensure(userId);

    // Before anything slow, so a reminder that fires mid-conversation goes to
    // the chat they are actually in — and so WhatsApp's 24-hour window is
    // measured from the message we just received.
    await this.users.noteInbound(userId, address.channel, receivedAt);

    // "typing…" covers the wait either way. It used to be skipped when
    // streaming, on the theory that a half-written sentence says more — but
    // the first token can be seconds away, and a draft painted before there
    // are any words is a placeholder that cannot be taken back down.
    await this.outbox.typing(userId);

    const draft =
      user.streaming === true
        ? await this.outbox.draft(userId, draftId(messageId), threadId)
        : null;

    const sourceMessageId = await this.log.record(userId, 'user', text);
    const reply = await this.brain.handle(
      userId,
      text,
      receivedAt,
      sourceMessageId,
      limits,
      (partial) => draft?.show(partial),
    );

    // Before the real message, never after: the finished reply supersedes the
    // draft, and a frame landing behind it would repaint what it replaced.
    await draft?.settle();
    // Back into the thread it was asked in — see InboundMessage.threadId.
    await this.responder.reply(userId, reply.text, { actions: actionsFor(reply), threadId });

    // After the reply, never before: redrawing tabs is bookkeeping, and the
    // person is waiting on the sentence. The mirror swallows its own failures.
    if (needsTopicSync(user, reply.memoryChanged)) {
      await this.topics.sync(userId, receivedAt);
    }
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function actionsFor(reply: Reply): Action[] {
  const undo = undoAction(reply);
  return undo ? [undo] : [];
}

/**
 * Frames of one reply share an id so they replace each other. The inbound
 * message id is already unique per chat and already a number everywhere it
 * comes from a numeric network; the fallback covers the rest, where the only
 * requirement is "non-zero".
 */
function draftId(messageId: string): number {
  const numeric = Number(messageId);
  return Number.isSafeInteger(numeric) && numeric !== 0 ? numeric : Date.now() % 2_147_483_647;
}
