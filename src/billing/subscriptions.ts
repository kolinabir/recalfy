import { Injectable, Logger } from '@nestjs/common';

import { UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { ACCESS_STATUSES } from './entitlements';

/**
 * How long a *yes* is trusted without asking Mongo again. Sixty seconds is
 * chosen against the only cost of being wrong in this direction: someone who
 * cancels keeps talking for up to a minute. That is nothing.
 *
 * A *no* is never cached, and that asymmetry is the whole point. The expensive
 * mistake is locking out somebody who just paid — their subscription lands via
 * webhook seconds after checkout, and a cached "no" would leave them staring at
 * a paywall notice while the money is already gone from their account.
 */
const YES_TTL_MS = 60_000;

/**
 * "Has this account paid?" — the question the bot could not previously ask.
 *
 * The billing tables are mirrored from Paddle by the web app's webhook, so
 * this is a plain indexed read: no Paddle call, no dependency on Paddle being
 * reachable, and nothing here ever writes.
 */
@Injectable()
export class Subscriptions {
  private readonly logger = new Logger(Subscriptions.name);
  /** userId → instant the cached "yes" stops being trusted. */
  private readonly granted = new Map<UserId, number>();

  constructor(private readonly mongo: MongoService) {}

  async hasAccess(userId: UserId): Promise<boolean> {
    const until = this.granted.get(userId);
    if (until !== undefined && until > Date.now()) return true;

    // The filter *is* the policy: `by_account` is { userId, status }, so this
    // is one index hit, and a status outside ACCESS_STATUSES simply matches
    // nothing. A pending cancel leaves status `active` and so still matches —
    // which is correct, the period was paid for.
    const row = await this.mongo.paddleSubscriptions.findOne(
      { userId, status: { $in: [...ACCESS_STATUSES] } },
      { projection: { _id: 1 } },
    );

    if (!row) {
      this.granted.delete(userId);
      return false;
    }

    this.granted.set(userId, Date.now() + YES_TTL_MS);
    return true;
  }

  /**
   * Drops a cached "yes". Nothing calls this yet — billing changes reach this
   * process only through Mongo — but it is the seam an admin command or a
   * future ping from the web app would use, and it keeps the cache from being
   * a thing you can only wait out.
   */
  forget(userId: UserId): void {
    this.granted.delete(userId);
    this.logger.debug(`Dropped cached access for ${userId}`);
  }
}
