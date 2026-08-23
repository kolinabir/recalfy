import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { parseAction } from '../channels/action-data';
import { CHANNEL_ADAPTERS, ChannelAdapter, InboundAction } from '../channels/channel';
import { MemoryStore } from '../memory/memory.store';
import { ReminderStore } from '../reminders/reminder.store';
import { TopicMirror } from '../topics/topic-mirror';
import { UNDO, undone, undoneLine } from './undo';

/**
 * "Actually, don't remember that."
 *
 * Subscribes to button presses the same way BotService subscribes to
 * messages — an adapter fans out, and whoever minted the button recognises
 * its own payload. Nothing about Telegram reaches this file.
 *
 * The press names ids; it does not name a user. Whose ids they are comes from
 * the linked account the press arrived on, so a payload copied from someone
 * else's chat deletes nothing: the store scopes every write by userId and a
 * mismatch simply matches no rows.
 */
@Injectable()
export class UndoService implements OnModuleInit {
  private readonly logger = new Logger(UndoService.name);

  constructor(
    @Inject(CHANNEL_ADAPTERS) private readonly adapters: ChannelAdapter[],
    private readonly memories: MemoryStore,
    private readonly reminders: ReminderStore,
    private readonly topics: TopicMirror,
  ) {}

  onModuleInit(): void {
    for (const adapter of this.adapters) {
      adapter.onAction((action) => this.handle(action));
    }
  }

  private async handle({ userId, data, settle }: InboundAction): Promise<boolean> {
    const parsed = parseAction(data);
    if (parsed?.kind !== UNDO) return false;

    const { saved, scheduled } = undone(parsed.parts);
    const dropped = await this.memories.forget(userId, [...saved]);

    // Sequential rather than parallel: cancelling is a handful of tiny writes
    // and the user is already waiting on the button, so the simple form wins.
    let cancelled = 0;
    for (const id of scheduled) {
      if (await this.reminders.cancel(userId, id)) cancelled += 1;
    }

    // Already gone — pressed twice, or forgotten in conversation since. Still
    // ours to answer, and the answer is the same either way: it isn't there.
    await settle(undoneLine(dropped.length || saved.length, cancelled || scheduled.length));
    this.logger.log(
      `undo → dropped ${dropped.length}/${saved.length} facts, ` +
        `cancelled ${cancelled}/${scheduled.length} reminders for ${userId}`,
    );

    // The tabs said those facts were there a second ago. Undo has to reach
    // them too, or the chat disagrees with itself.
    if (dropped.length > 0) await this.topics.sync(userId);
    return true;
  }
}
