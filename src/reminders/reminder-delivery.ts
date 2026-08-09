import { Injectable, OnModuleInit } from '@nestjs/common';

import { ReminderDoc } from '../mongo/collections';
import { Ingress } from '../telegram/ingress';
import { ReminderScheduler } from './reminder.scheduler';

/**
 * Puts due reminders on Telegram. The only place the scheduler and the
 * messaging layer meet — which is what keeps either replaceable.
 */
@Injectable()
export class ReminderDelivery implements OnModuleInit {
  constructor(
    private readonly scheduler: ReminderScheduler,
    private readonly ingress: Ingress,
  ) {}

  onModuleInit(): void {
    this.scheduler.onDue((reminder) => this.send(reminder));
  }

  private send(reminder: ReminderDoc): Promise<void> {
    return this.ingress.send(reminder.userId, `⏰ ${reminder.text}`);
  }
}
