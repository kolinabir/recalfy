import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { Paywall } from '../billing/paywall';
import { BrainService } from '../brain/brain.service';
import { CHANNEL_ADAPTERS, ChannelAdapter, InboundMessage } from '../channels/channel';
import { Outbox } from '../channels/outbox';
import { UserStore } from '../memory/user.store';
import { ConversationLog } from './conversation-log';
import { Responder } from './responder';

/**
 * The one place inbound messages become outbound ones. Reads as the shape of
 * a turn: identify, acknowledge, log, think, reply.
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
  ) {}

  onModuleInit(): void {
    for (const adapter of this.adapters) {
      adapter.onMessage((message) => this.handle(message));
    }
  }

  private async handle({ userId, address, text, receivedAt }: InboundMessage): Promise<void> {
    // Before persistence and before the model, for the same reason the link
    // check runs before both: everything below this line costs money. The
    // limits come back from the same call, so nothing downstream has to ask
    // billing anything a second time.
    const limits = await this.paywall.admit(userId, address.channel);
    if (!limits) return;

    await this.users.ensure(userId);

    // Before anything slow, so a reminder that fires mid-conversation goes to
    // the chat they are actually in — and so WhatsApp's 24-hour window is
    // measured from the message we just received.
    await this.users.noteInbound(userId, address.channel, receivedAt);
    await this.outbox.typing(userId);

    const sourceMessageId = await this.log.record(userId, 'user', text);
    const reply = await this.brain.handle(userId, text, receivedAt, sourceMessageId, limits);

    await this.responder.reply(userId, reply);
  }
}
