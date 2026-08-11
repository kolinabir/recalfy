import { Injectable, Logger } from '@nestjs/common';

import { Outbox } from '../channels/outbox';
import { UserId } from '../mongo/collections';
import { Subscriptions } from './subscriptions';

/**
 * How often a lapsed account is told why nothing is happening. Once a day:
 * often enough that the answer is never more than a message away, rare enough
 * that someone typing into a dead bot is not answered by a wall of the same
 * paragraph.
 *
 * Held in memory, so a restart re-arms it. That is the harmless direction —
 * one extra explanation — and it saves a collection whose only job would be
 * remembering that we already apologised.
 */
const NOTICE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const LAPSED_NOTICE =
  "Your Recalfy plan isn't active, so I've stopped picking up messages.\n\n" +
  'Nothing has been deleted — every fact, reminder and receipt is exactly ' +
  'where you left it, and it stays that way.\n\n' +
  'Start a plan at recalfy.com/dashboard/billing and I carry on mid-sentence.';

/**
 * The gate between a linked account and everything that costs money — the
 * model call, the storage write, the WhatsApp template.
 *
 * Linking already requires a plan (the web app gates `/api/link/*`), but that
 * check happens once, at the door. Without this one, cancelling changed
 * nothing: the bot kept answering, kept firing reminders, and kept sending the
 * daily brief, indefinitely and at our expense.
 */
@Injectable()
export class Paywall {
  private readonly logger = new Logger(Paywall.name);
  /** userId → instant the next lapsed notice may be sent. */
  private readonly noticed = new Map<UserId, number>();

  constructor(
    private readonly subscriptions: Subscriptions,
    private readonly outbox: Outbox,
  ) {}

  /**
   * For anything unprompted — a due reminder, the daily brief. Silent by
   * design: someone who stopped paying should not be pinged by the product
   * they stopped paying for, and a template send to a lapsed WhatsApp account
   * would be billed to us.
   */
  async permits(userId: UserId): Promise<boolean> {
    return this.subscriptions.hasAccess(userId);
  }

  /**
   * For a message the user just sent. Same question, plus the explanation —
   * silence here would read as a broken bot rather than an expired plan, and
   * the fix is one link away.
   *
   * Returns false *before* the message is logged or the model is called, which
   * is the point: a lapsed account costs one indexed read and, at most, one
   * message a day.
   */
  async admits(userId: UserId): Promise<boolean> {
    if (await this.subscriptions.hasAccess(userId)) return true;

    const now = Date.now();
    const nextNotice = this.noticed.get(userId);
    if (nextNotice === undefined || nextNotice <= now) {
      this.noticed.set(userId, now + NOTICE_COOLDOWN_MS);
      this.logger.log(`Turned away ${userId}: no active plan`);
      await this.outbox.reply(userId, LAPSED_NOTICE);
    }

    return false;
  }
}
