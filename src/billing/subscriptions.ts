import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV, Env } from '../config/env';
import { UserId } from '../mongo/collections';
import { ACCESS_STATUSES, LIMITS, Limits, limitsForPrice } from './entitlements';
import { MongoService } from '../mongo/mongo.service';

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

interface Cached {
  limits: Limits;
  until: number;
}

/**
 * "What has this account paid for?" — one method, and the only place in the
 * bot that reads a subscription row.
 *
 * It answers in capabilities rather than plan names (see `Limits`), so no
 * caller ever learns that tiers exist. The billing tables are mirrored from
 * Paddle by the web app's webhook, so this is a plain indexed read: no Paddle
 * call, no dependency on Paddle being reachable, and nothing here ever writes.
 */
@Injectable()
export class Subscriptions {
  private readonly logger = new Logger(Subscriptions.name);
  private readonly granted = new Map<UserId, Cached>();

  constructor(
    private readonly mongo: MongoService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** What this account may do, or `null` when it has no live plan at all. */
  async limitsFor(userId: UserId): Promise<Limits | null> {
    // A self-hosted install has no plans and no Paddle. Everything, always.
    if (this.env.selfHosted) return LIMITS.archive;

    const hit = this.granted.get(userId);
    if (hit && hit.until > Date.now()) return hit.limits;

    // The filter *is* the access policy: `by_account` is { userId, status },
    // so a status outside ACCESS_STATUSES simply matches nothing. A pending
    // cancel leaves status `active` and so still matches — correct, because
    // the period was paid for.
    //
    // Newest first, matching `subscriptionForUser` in web/lib/paddle/mirror.ts.
    // An account can hold two rows in an access status — cancel, then
    // resubscribe on a different tier — and an unsorted findOne picks
    // arbitrarily. The half that guesses the older row would enforce the
    // cheaper plan against a customer the dashboard shows on the dearer one.
    const [row] = await this.mongo.paddleSubscriptions
      .find({ userId, status: { $in: [...ACCESS_STATUSES] } }, { projection: { priceId: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (!row) {
      this.granted.delete(userId);
      return null;
    }

    const limits = limitsForPrice(row.priceId, this.env.tierPrices);
    this.granted.set(userId, { limits, until: Date.now() + YES_TTL_MS });
    return limits;
  }

  /**
   * Drops a cached plan. Nothing calls this yet — billing changes reach this
   * process only through Mongo — but it is the seam an admin command or a
   * future ping from the web app would use, and it keeps the cache from being
   * a thing you can only wait out.
   */
  forget(userId: UserId): void {
    this.granted.delete(userId);
    this.logger.debug(`Dropped cached plan for ${userId}`);
  }
}
