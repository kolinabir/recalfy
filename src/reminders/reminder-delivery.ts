import { Injectable, OnModuleInit } from '@nestjs/common';

import { Outbox } from '../channels/outbox';
import { ReminderDoc } from '../mongo/collections';
import { ReminderScheduler } from './reminder.scheduler';

/**
 * Puts due reminders in front of the user. The only place the scheduler and
 * the messaging layer meet — which is what keeps either replaceable.
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
    this.scheduler.onDue((reminder) => this.send(reminder));
  }

  private send(reminder: ReminderDoc): Promise<void> {
    return this.outbox.notify(reminder.userId, `⏰ ${reminder.text}`);
  }
}
