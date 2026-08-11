import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { Paywall } from '../billing/paywall';
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
  private readonly logger = new Logger(ReminderDelivery.name);

  constructor(
    private readonly scheduler: ReminderScheduler,
    private readonly outbox: Outbox,
    private readonly paywall: Paywall,
  ) {}

  onModuleInit(): void {
    this.scheduler.onDue((reminder) => this.send(reminder));
  }

  private async send(reminder: ReminderDoc): Promise<void> {
    // The reminder is still marked delivered by the scheduler, which is
    // deliberate: leaving it pending would have the tick pick it up again
    // every 30 seconds for as long as the account stays lapsed. A recurring
    // series keeps rolling forward and resumes on its own the day they pay.
    if (!(await this.paywall.permits(reminder.userId))) {
      this.logger.log(`Suppressed reminder ${reminder._id.toHexString()}: no active plan`);
      return;
    }

    await this.outbox.notify(reminder.userId, `⏰ ${reminder.text}`);
  }
}
