import "server-only";

import type { Channel } from "@/lib/channels";
import { TIER_CHANNELS, accessState, grantsAccess } from "./access";
import { type Cycle, tiers } from "./config";
import { subscriptionForUser } from "./mirror";

// Re-exported so callers keep importing one module, as with `grantsAccess`.
export { TIER_CHANNELS } from "./access";

/**
 * "What has this account bought, and what does that let them do?" — the one
 * question the dashboard, the connect flow, and the billing page all ask.
 *
 * Reads the mirror rather than Paddle: webhooks keep it current, and a page
 * render should not depend on Paddle being reachable.
 */

export interface Plan {
  /** Tier id, or null when the price is not one we currently sell. */
  id: "keep" | "archive" | null;
  name: string;
  cycle: Cycle | null;
  state: ReturnType<typeof accessState>;
  /** Whether paid features are unlocked right now. */
  active: boolean;
  /** Set while a cancel or pause is pending. */
  endsAt: Date | null;
}

export const NO_PLAN: Plan = {
  id: null,
  name: "No plan",
  cycle: null,
  state: "none",
  active: false,
  endsAt: null,
};

export async function planForUser(userId: string): Promise<Plan> {
  const subscription = await subscriptionForUser(userId);
  if (!subscription) return NO_PLAN;

  // Map the price back to a tier. An unrecognised price is not an error — it
  // means the catalogue changed under a live subscription, and that customer
  // still has a real, active plan we must not silently downgrade.
  let id: Plan["id"] = null;
  let name = "Subscription";
  let cycle: Cycle | null = null;

  for (const tier of tiers()) {
    for (const key of ["month", "year"] as const) {
      if (tier.priceId[key] === subscription.priceId) {
        id = tier.id;
        name = tier.name;
        cycle = key;
      }
    }
  }

  return {
    id,
    name,
    cycle,
    state: accessState(subscription),
    active: grantsAccess(subscription),
    // Only a cancel or pause ends anything. A scheduled `resume` also lands
    // in this field, and reporting that date as "ends" would tell someone
    // their plan stops on the day it actually restarts.
    endsAt:
      subscription.scheduledChange &&
      subscription.scheduledChange.action !== "resume"
        ? subscription.scheduledChange.at
        : null,
  };
}

/**
 * The gate for anything a plan buys. Deliberately a single function so there
 * is one place to change if free tiers or comps ever appear.
 */
export async function requirePaidAccess(userId: string): Promise<boolean> {
  return (await planForUser(userId)).active;
}

export type ChannelVerdict = "ok" | "payment-required" | "not-on-plan";

/**
 * May this account connect this chat right now?
 *
 * An active plan on an unrecognised price (`id === null`) gets the most
 * generous answer, for the same reason `planForUser` refuses to name a tier
 * for one: the catalogue moved under a live subscription, and refusing them a
 * channel they are paying for is worse than allowing one they are not.
 */
export async function channelVerdict(
  userId: string,
  channel: Channel,
): Promise<ChannelVerdict> {
  const plan = await planForUser(userId);
  if (!plan.active) return "payment-required";

  const allowed = plan.id ? TIER_CHANNELS[plan.id] : TIER_CHANNELS.archive;
  return allowed.includes(channel) ? "ok" : "not-on-plan";
}
