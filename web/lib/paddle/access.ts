/**
 * Who gets paid features, expressed as pure functions over mirrored state.
 *
 * Deliberately free of `server-only` and of any database import: this is the
 * policy, and policy should be testable without a Mongo connection or a Next
 * request. ./mirror.ts does the I/O and re-exports these.
 */

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled";

export interface AccessInput {
  status: SubscriptionStatus;
  /** Present while a cancel or pause is pending. Not itself a revocation. */
  scheduledChange?: { action: string; at: Date };
}

/**
 * Whether a subscription entitles the account to paid features right now.
 *
 * `trialing` counts: the trial is the product. `past_due` also counts — Paddle
 * Retain is still retrying the card, and locking someone out mid-dunning loses
 * customers who were always going to pay. Show a banner instead.
 *
 * A pending cancel or pause deliberately does not revoke. The customer paid
 * through the end of the period, and Paddle flips `status` on its own when the
 * scheduled change lands. Revoking early is the classic bug here: it takes
 * access away the moment someone clicks cancel, which they did not agree to.
 */
export function grantsAccess(subscription: AccessInput | null): boolean {
  if (!subscription) return false;
  return (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due"
  );
}

/** What the account page should say, which is not the same question. */
export function accessState(
  subscription: AccessInput | null,
): "none" | "active" | "trialing" | "dunning" | "cancel-scheduled" | "pause-scheduled" | "paused" | "canceled" {
  if (!subscription) return "none";
  if (subscription.scheduledChange && grantsAccess(subscription)) {
    return subscription.scheduledChange.action === "pause"
      ? "pause-scheduled"
      : "cancel-scheduled";
  }
  switch (subscription.status) {
    case "past_due":
      return "dunning";
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "paused":
      return "paused";
    case "canceled":
      return "canceled";
  }
}
