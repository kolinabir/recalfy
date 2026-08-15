import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { Limits } from '../billing/entitlements';
import { parseAction } from '../channels/action-data';
import { CHANNEL_ADAPTERS, ChannelAdapter, InboundAction } from '../channels/channel';
import { Outbox } from '../channels/outbox';
import { ReminderDoc } from '../mongo/collections';
import { ReminderScheduler } from './reminder.scheduler';
import { ReminderStore } from './reminder.store';
import { SNOOZE, snoozeActions, snoozedLine, snoozedTo } from './snooze';

/**
 * Puts due reminders in front of the user, and takes "not now" for an answer.
 *
 * The only place the scheduler and the messaging layer meet — which is what
 * keeps either replaceable.
 *
 * Purely *where*, never *whether*: the scheduler has already decided this
 * reminder may go out, because that decision changes what happens to the row
 * and only the scheduler owns the row.
 *
 * `notify` rather than `reply`: a reminder is by definition unprompted, and on
 * WhatsApp that is the difference between a free message and a billed
 * template.
 */
@Injectable()
export class ReminderDelivery implements OnModuleInit {
  private readonly logger = new Logger(ReminderDelivery.name);

  constructor(
    @Inject(CHANNEL_ADAPTERS) private readonly adapters: ChannelAdapter[],
    private readonly scheduler: ReminderScheduler,
    private readonly reminders: ReminderStore,
    private readonly outbox: Outbox,
  ) {}

  onModuleInit(): void {
    this.scheduler.onDue((reminder, limits) => this.send(reminder, limits));
    for (const adapter of this.adapters) {
      adapter.onAction((action) => this.snooze(action));
    }
  }

  private send(reminder: ReminderDoc, limits: Limits): Promise<void> {
    // The plan's channels, not just any linked one: a reminder must never go
    // out over a chat the account no longer pays to be reached on.
    return this.outbox.notify(
      reminder.userId,
      `⏰ ${reminder.text}`,
      limits.channels,
      snoozeActions(reminder._id.toHexString()),
    );
  }

  /**
   * A snooze is a new one-off reminder, not a change to the old one.
   *
   * By the time the button is pressed the original row is already `sent`, and
   * a recurring series has already seeded its next occurrence — so moving
   * anything would either resurrect a closed row or drag tomorrow's 9am along
   * with today's. A fresh row leaves both alone.
   */
  private async snooze({ userId, data, settle }: InboundAction): Promise<boolean> {
    const parsed = parseAction(data);
    if (parsed?.kind !== SNOOZE) return false;

    const [id = '', key = ''] = parsed.parts;
    const when = snoozedTo(key, new Date());
    const original = when ? await this.reminders.find(userId, id) : null;

    // Scoped by userId, so a payload from someone else's chat finds nothing.
    if (!when || !original) {
      await settle('That reminder is no longer available.');
      return true;
    }

    await this.reminders.schedule(userId, original.text, when.at);
    await settle(snoozedLine(when.label));
    this.logger.log(`snoozed ${id} by ${key} for ${userId}`);
    return true;
  }
}
