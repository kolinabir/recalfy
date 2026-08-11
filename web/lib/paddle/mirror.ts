import "server-only";

import { db } from "@/lib/mongo";
import { type SubscriptionStatus, grantsAccess } from "./access";

// The access policy lives in ./access.ts so it can be tested without a
// database. Re-exported here so callers keep importing one module.
export { grantsAccess, accessState } from "./access";
export type { SubscriptionStatus } from "./access";

/**
 * Paddle's state, mirrored into Mongo so the app can answer "is this account
 * paid?" without a round trip. Webhooks write here; everything else reads.
 *
 * Paddle ids are the `_id`s, which is what makes replays harmless: an upsert
 * keyed on the id converges no matter how many times the same delivery lands.
 */

export interface PaddleCustomerDoc {
  /** `ctm_01h...` */
  _id: string;
  email: string;
  /**
   * The Better Auth account id, carried through checkout as `customData` so
   * the join never depends on the email, which the customer can change in the
   * portal at any time.
   */
  userId?: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface PaddleSubscriptionDoc {
  /** `sub_01h...` */
  _id: string;
  customerId: string;
  userId?: string;
  status: SubscriptionStatus;
  priceId: string;
  productId: string;
  /**
   * Set while a cancel or pause is pending. The subscription is still
   * `active` until it lands — see `grantsAccess`.
   */
  scheduledChange?: { action: string; at: Date };
  /**
   * Paddle's own timestamp for the event that produced this row. Deliveries
   * are not ordered, so a retry of an older event can arrive after a newer
   * one; writes older than what we hold are dropped rather than applied.
   */
  occurredAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

export const PADDLE_COLLECTIONS = {
  customers: "paddleCustomers",
  subscriptions: "paddleSubscriptions",
} as const;

export function customers() {
  return db.collection<PaddleCustomerDoc>(PADDLE_COLLECTIONS.customers);
}

export function subscriptions() {
  return db.collection<PaddleSubscriptionDoc>(PADDLE_COLLECTIONS.subscriptions);
}

export async function upsertCustomer(input: {
  customerId: string;
  email?: string;
  userId?: string;
}): Promise<void> {
  const now = new Date();

  await customers().updateOne(
    { _id: input.customerId },
    {
      // Only ever widen what we know. Events that omit a field — a
      // transaction with no email expanded, a customer.updated with no
      // custom_data — must not erase what an earlier event established.
      $set: { updatedAt: now, ...(input.email ? { email: input.email } : {}) },
      // `email` is only named here when $set did not already claim it —
      // Mongo rejects an update touching the same path twice.
      $setOnInsert: { createdAt: now, ...(input.email ? {} : { email: "" }) },
    },
    { upsert: true },
  );

  if (!input.userId) return;

  // `userId` is bound in a second, guarded write rather than in the $set above,
  // because it is the account this customer's money and invoices belong to and
  // it arrives from `custom_data` — which the browser sets when it opens the
  // checkout. Paddle's signature proves Paddle sent the event; it proves
  // nothing about who chose that value. So the binding is write-once: it takes
  // only when the row has no account yet, or already names this one.
  //
  // Without this filter, anyone who can open a checkout could repoint an
  // existing customer row at their own account and inherit that customer's
  // portal, payment method and invoice history.
  try {
    const bound = await customers().updateOne(
      {
        _id: input.customerId,
        $or: [{ userId: { $exists: false } }, { userId: input.userId }],
      },
      { $set: { userId: input.userId, updatedAt: now } },
    );

    if (bound.matchedCount === 0) {
      // Either a genuine re-link that needs a human, or someone trying to claim
      // another account's customer. Both are worth seeing; neither is applied.
      console.warn(
        `[paddle] refused to rebind customer ${input.customerId} to ${input.userId}: already bound to a different account`,
      );
    }
  } catch (error) {
    // The mirror image of the case above, and the one the filter cannot catch:
    // the filter matches, then the unique `by_account` index rejects the write
    // because this account already names a *different* customer. It happens
    // whenever one account buys twice against two Paddle customers — a sandbox
    // test and then a live purchase into the same database being the way we
    // found it.
    //
    // This must not throw. Binding a customer is bookkeeping for the portal and
    // the invoice list; the subscription is what grants access, and it is
    // written after this call. Letting the collision escape returned 500 to
    // Paddle, so the subscription never landed and a paying customer saw no
    // plan — for the three days Paddle spends retrying, and then forever.
    if (!isDuplicateKey(error)) throw error;
    console.warn(
      `[paddle] left customer ${input.customerId} unbound: account ${input.userId} already names another customer`,
    );
  }
}

export async function upsertSubscription(input: {
  subscriptionId: string;
  customerId: string;
  userId?: string;
  status: SubscriptionStatus;
  priceId: string;
  productId: string;
  scheduledChange?: { action: string; at: Date };
  occurredAt: Date;
}): Promise<void> {
  const now = new Date();

  const set = {
    customerId: input.customerId,
    status: input.status,
    priceId: input.priceId,
    productId: input.productId,
    occurredAt: input.occurredAt,
    updatedAt: now,
    // userId is deliberately absent — see the guarded bind below.
    // Absent means no pending change — the field has to be removed, not left
    // behind, when Paddle clears it.
    ...(input.scheduledChange ? { scheduledChange: input.scheduledChange } : {}),
  };

  try {
    await subscriptions().updateOne(
      // The occurredAt guard is the whole out-of-order defence: an event older
      // than the row it would overwrite matches nothing and is discarded.
      { _id: input.subscriptionId, occurredAt: { $lte: input.occurredAt } },
      {
        $set: set,
        $setOnInsert: { createdAt: now },
        ...(input.scheduledChange ? {} : { $unset: { scheduledChange: "" } }),
      },
      { upsert: true },
    );
  } catch (error) {
    // A row newer than this event exists, so the guard matched nothing and the
    // upsert turned into an insert that collided on _id. That is precisely the
    // stale delivery we wanted to drop — swallowing it lets the route return
    // 2xx, where rethrowing would make Paddle retry an event we will never
    // apply. Anything else is a real failure and must still fail the request.
    if (!isDuplicateKey(error)) throw error;
  }

  if (!input.userId) return;

  // Write-once, for the same reason as the customer binding: this decides
  // whose account a subscription unlocks, and it comes from browser-supplied
  // custom_data. A later event may not move it to a different account.
  const bound = await subscriptions().updateOne(
    {
      _id: input.subscriptionId,
      $or: [{ userId: { $exists: false } }, { userId: input.userId }],
    },
    { $set: { userId: input.userId, updatedAt: now } },
  );

  if (bound.matchedCount === 0) {
    console.warn(
      `[paddle] refused to rebind subscription ${input.subscriptionId} to ${input.userId}: already bound to a different account`,
    );
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/** The subscription an account's access should be judged on, if any. */
export async function subscriptionForUser(
  userId: string,
): Promise<PaddleSubscriptionDoc | null> {
  const rows = await subscriptions().find({ userId }).toArray();
  if (rows.length === 0) return null;
  // More than one only happens if someone resubscribes after cancelling; the
  // live one is the answer, and the newest is the tie-break.
  const live = rows.filter((row) => grantsAccess(row));
  const pool = live.length > 0 ? live : rows;
  return pool.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export async function hasPaidAccess(userId: string): Promise<boolean> {
  return grantsAccess(await subscriptionForUser(userId));
}
