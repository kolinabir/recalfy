import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { Limits } from '../billing/entitlements';
import { Paywall } from '../billing/paywall';
import { UserStore } from '../memory/user.store';
import { ReminderDoc } from '../mongo/collections';
import { deferredUntil } from './quiet-hours';
import { ReminderStore } from './reminder.store';

const TICK_MS = 30_000;
/** Guards against one slow tick monopolising the process. */
const MAX_PER_TICK = 20;

export type DueHandler = (reminder: ReminderDoc, limits: Limits) => Promise<void>;

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

  constructor(
    private readonly reminders: ReminderStore,
    private readonly paywall: Paywall,
    private readonly users: UserStore,
  ) {}

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
   *
   * Whether a reminder may go out at all is decided here rather than in a
   * handler, because both answers change what happens to the row — a handler
   * that quietly declined would still be followed by `complete`, which is how
   * a deferred reminder would get marked sent and lost.
   */
  private async deliver(reminder: ReminderDoc): Promise<void> {
    try {
      const now = new Date();
      const limits = await this.paywall.permits(reminder.userId);

      // No plan: consume the row rather than leave it pending, or the tick
      // re-claims it every 30 seconds for as long as the account stays lapsed.
      // A recurring series keeps rolling forward and resumes when they pay.
      if (!limits) {
        this.logger.log(`Suppressed ${reminder._id.toHexString()}: no active plan`);
        await this.reminders.complete(reminder, now);
        return;
      }

      const user = limits.quietHours ? await this.users.ensure(reminder.userId) : null;
      const until = user ? deferredUntil(now, user.quiet, user.tz) : null;
      if (until) {
        await this.reminders.defer(reminder, until);
        return;
      }

      for (const handler of this.handlers) {
        await handler(reminder, limits);
      }
      await this.reminders.complete(reminder, now);
    } catch (error) {
      this.logger.error(`Delivery failed for ${reminder._id.toHexString()}: ${message(error)}`);
    }
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
