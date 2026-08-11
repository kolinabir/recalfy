import { Injectable, OnModuleInit } from '@nestjs/common';

import { Limits } from '../billing/entitlements';
import { Outbox } from '../channels/outbox';
import { ReminderDoc } from '../mongo/collections';
import { ReminderScheduler } from './reminder.scheduler';

/**
 * Puts due reminders in front of the user. The only place the scheduler and
 * the messaging layer meet — which is what keeps either replaceable.
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
  constructor(
    private readonly scheduler: ReminderScheduler,
    private readonly outbox: Outbox,
  ) {}

  onModuleInit(): void {
    this.scheduler.onDue((reminder, limits) => this.send(reminder, limits));
  }

  private send(reminder: ReminderDoc, limits: Limits): Promise<void> {
    // The plan's channels, not just any linked one: a reminder must never go
    // out over a chat the account no longer pays to be reached on.
    return this.outbox.notify(reminder.userId, `⏰ ${reminder.text}`, limits.channels);
  }
}
