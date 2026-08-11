import { Channel, SubscriptionStatus } from '../mongo/collections';

/**
 * Which subscription states buy access, as data rather than a chain of `||`,
 * because the bot asks the question as a Mongo filter and not as a predicate.
 *
 * This is the same policy as `web/lib/paddle/access.ts`, restated because the
 * two halves are separate builds and the bot must not import the web app's
 * server code. `test/entitlements.test.ts` asserts the two agree on every
 * status, so the copy cannot drift silently.
 *
 * The reasoning, in brief — the web module carries the long version:
 * - `trialing` counts. The trial is the product.
 * - `past_due` counts. Paddle Retain is still trying the card, and locking
 *   someone out mid-dunning loses customers who were always going to pay.
 * - A pending cancel or pause does not revoke. Those keep `status: active`
 *   with `scheduledChange` set, and the customer paid through the period.
 * - `paused` and `canceled` do not count.
 */
export const ACCESS_STATUSES: readonly SubscriptionStatus[] = [
  'active',
  'trialing',
  'past_due',
];

export function statusGrantsAccess(status: SubscriptionStatus): boolean {
  return ACCESS_STATUSES.includes(status);
}

export type Tier = 'keep' | 'archive';

/**
 * What a plan actually permits — the only billing vocabulary the rest of the
 * bot is allowed to learn.
 *
 * Deliberately *not* a tier name. Call sites ask "may this account do the
 * thing", never "is this account on Keep", so adding a plan or moving a limit
 * is an edit to LIMITS below and nowhere else. Delete this type and five call
 * sites grow their own `tier === 'keep'` comparison, each free to disagree
 * with the pricing page.
 */
export interface Limits {
  /** Live facts this account may hold. `null` is unlimited. */
  memories: number | null;
  recurringReminders: boolean;
  quietHours: boolean;
  /** Chat networks this account may be reached on, in no particular order. */
  channels: readonly Channel[];
}

/**
 * The pricing table, as code. Every value here is a promise made on
 * recalfy.com/pricing — `web/lib/plan-comparison.ts` is the same table in
 * prose, and the two must say the same thing.
 */
export const LIMITS: Record<Tier, Limits> = {
  keep: {
    memories: 2_000,
    recurringReminders: false,
    quietHours: false,
    // Telegram only. Not "one channel of your choice" — a fixed network is
    // simpler to enforce and simpler to explain, and WhatsApp is the one that
    // costs us money per template send.
    channels: ['telegram'],
  },
  archive: {
    memories: null,
    recurringReminders: true,
    quietHours: true,
    channels: ['telegram', 'whatsapp'],
  },
};

/**
 * Maps the price someone is actually paying to what it buys.
 *
 * An unrecognised price resolves to **archive**, the most generous tier, and
 * that direction is deliberate. `web/lib/paddle/plan.ts` already refuses to
 * downgrade an unknown price for the same reason: it means the catalogue moved
 * under a live subscription, and the customer still has a real, paid plan.
 * Guessing "keep" would cap a paying customer's memory and silently take away
 * features they are being charged for; guessing "archive" costs nothing.
 */
export function limitsForPrice(priceId: string, prices: TierPrices): Limits {
  return LIMITS[tierForPrice(priceId, prices) ?? 'archive'];
}

export function tierForPrice(priceId: string, prices: TierPrices): Tier | null {
  for (const tier of ['keep', 'archive'] as const) {
    if (prices[tier].includes(priceId)) return tier;
  }
  return null;
}

/** The price ids that identify each tier — monthly and yearly together. */
export type TierPrices = Record<Tier, readonly string[]>;
