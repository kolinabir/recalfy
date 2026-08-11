import { SubscriptionStatus } from '../mongo/collections';

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
