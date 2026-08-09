import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { ReminderDoc } from '../mongo/collections';
import { ReminderStore } from './reminder.store';

const TICK_MS = 30_000;
/** Guards against one slow tick monopolising the process. */
const MAX_PER_TICK = 20;

export type DueHandler = (reminder: ReminderDoc) => Promise<void>;

/**
 * The clock. Claims due reminders and hands them to whoever registered for
 * them — it knows nothing about Telegram.
 *
 * A 30-second poll over an indexed `{ status, dueAt }` is the whole design:
 * no Redis, no job runner, and it survives a restart because the queue is
 * the database.
 */
@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);
  private readonly handlers: DueHandler[] = [];
  private ticking = false;

  constructor(private readonly reminders: ReminderStore) {}

  onDue(handler: DueHandler): void {
    this.handlers.push(handler);
  }

  @Interval(TICK_MS)
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.reminders.releaseStaleClaims(new Date());
      await this.drain();
    } catch (error) {
      this.logger.error(`Tick failed: ${message(error)}`);
    } finally {
      this.ticking = false;
    }
  }

  private async drain(): Promise<void> {
    for (let sent = 0; sent < MAX_PER_TICK; sent++) {
      const due = await this.reminders.claimNextDue(new Date());
      if (!due) return;
      await this.deliver(due);
    }
    this.logger.warn(`Hit the ${MAX_PER_TICK}-per-tick cap; the rest wait for the next tick`);
  }

  /**
   * A failed delivery is deliberately left in `claimed`: releaseStaleClaims
   * puts it back after five minutes rather than hot-looping on a broken send.
   */
  private async deliver(reminder: ReminderDoc): Promise<void> {
    try {
      for (const handler of this.handlers) {
        await handler(reminder);
      }
      await this.reminders.complete(reminder, new Date());
    } catch (error) {
      this.logger.error(`Delivery failed for ${reminder._id.toHexString()}: ${message(error)}`);
    }
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
