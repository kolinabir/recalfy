/**
 * What Paddle account we are talking to, and what we sell. Shared by the
 * pricing page, the checkout overlay, the webhook, and the portal.
 *
 * Nothing here is secret — price ids and the client token are public by
 * design. The API key and the webhook signing secret live in ./server.ts,
 * which is `server-only`.
 */

export type Cycle = "month" | "year";

export interface Tier {
  /** Matches the `id` the marketing page already uses in its links. */
  id: "keep" | "archive";
  name: string;
  description: string;
  features: string[];
  /** The three-up figures above the feature list. */
  limits: { label: string; value: string }[];
  featured?: boolean;
  cta: string;
  priceId: Record<Cycle, string>;
  /**
   * Every price id that means this tier, including ones we no longer sell and
   * ones belonging to the other Paddle environment. Used for recognition only
   * — `priceId` above is what a checkout receives.
   */
  knownPriceIds: string[];
  /**
   * Launch pricing. `now` is the USD amount Paddle actually charges; `list` is
   * what the plan costs once the early-bird period ends. Only the ratio between
   * them is used — the struck-through figure is derived by scaling whatever
   * Paddle quotes the visitor, so a rupee price is never crossed out with a
   * dollar one. Retire the early bird by deleting this field.
   */
  earlyBird?: { now: Record<Cycle, number>; list: Record<Cycle, number> };
}

/**
 * The environment is read, never defaulted. A missing var throws at import
 * time rather than quietly pointing production traffic at sandbox — the one
 * mistake here that bills real cards against test prices.
 */
export function paddleEnvironment(): "sandbox" | "production" {
  const value = process.env.NEXT_PUBLIC_PADDLE_ENV;
  if (value !== "sandbox" && value !== "production") {
    throw new Error(
      `NEXT_PUBLIC_PADDLE_ENV must be "sandbox" or "production", got ${value ?? "undefined"}.`,
    );
  }
  return value;
}

export function paddleClientToken(): string {
  // Written out in full rather than via a variable: Next inlines
  // `process.env.NEXT_PUBLIC_*` only when it sees the literal member access.
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) throw new Error("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set.");
  return token;
}

/**
 * Price ids are environment-scoped — a sandbox `pri_...` does not exist in
 * production — so they come from the environment too, and a typo fails the
 * page rather than silently rendering a tier with no price.
 */
function priceId(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  // The first is the one we sell. Any others are recognised but never offered
  // — see `knownPriceIds`.
  return value.split(",")[0].trim();
}

/**
 * Every price id that should be *recognised* as this tier, which is not the
 * same set as the one we sell.
 *
 * Each `PADDLE_PRICE_*` variable may list several ids, comma-separated. Only
 * the first is ever put in a checkout; the rest exist so an environment can
 * still name a tier it did not sell. That happens whenever the Paddle
 * environment and the database disagree — a local sandbox build reading the
 * production database being the ordinary case — and without it a real,
 * paid-for subscription renders as the anonymous "Subscription" fallback.
 *
 * Retiring a price is the other use: keep it listed and existing customers
 * keep their plan's name after the catalogue moves on.
 */
function priceIds(name: string): string[] {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Edit copy here; the amounts are Paddle's and are never written down in this
 * repo. Anything shown to a visitor comes from PricePreview's
 * `formattedTotals`, already localized and tax-correct for their country.
 */
export function tiers(): Tier[] {
  return [
    {
      id: "keep",
      name: "Keep",
      description: "For one head that holds too much.",
      cta: "Start with Keep",
      limits: [
        { label: "Memories", value: "2,000" },
        { label: "Reminders", value: "Unlimited" },
        { label: "Channels", value: "Telegram" },
      ],
      features: [
        "Every fact stored as its own record, with corrections that replace instead of pile up",
        "Reminders resolved in your timezone and read back before they're set",
        "Export the whole memory as plain markdown or JSON, any day",
        "Forget anything by asking, in words",
      ],
      priceId: {
        month: priceId("PADDLE_PRICE_KEEP_MONTH"),
        year: priceId("PADDLE_PRICE_KEEP_YEAR"),
      },
      knownPriceIds: [
        ...priceIds("PADDLE_PRICE_KEEP_MONTH"),
        ...priceIds("PADDLE_PRICE_KEEP_YEAR"),
      ],
      earlyBird: {
        now: { month: 6, year: 50 },
        list: { month: 8, year: 67 },
      },
    },
    {
      id: "archive",
      name: "Archive",
      description: "For a memory you expect to keep for years.",
      featured: true,
      cta: "Start with Archive",
      limits: [
        { label: "Memories", value: "Unlimited" },
        { label: "Reminders", value: "Unlimited" },
        { label: "Channels", value: "Telegram" },
      ],
      features: [
        "Everything in Keep",
        "Every new chat app the day it ships, with one memory across all of them",
        "Recurring reminders, and quiet hours so nothing wakes you",
        "Answers from a human, usually the one who wrote it",
      ],
      priceId: {
        month: priceId("PADDLE_PRICE_ARCHIVE_MONTH"),
        year: priceId("PADDLE_PRICE_ARCHIVE_YEAR"),
      },
      knownPriceIds: [
        ...priceIds("PADDLE_PRICE_ARCHIVE_MONTH"),
        ...priceIds("PADDLE_PRICE_ARCHIVE_YEAR"),
      ],
      earlyBird: {
        now: { month: 14, year: 120 },
        list: { month: 18, year: 154 },
      },
    },
  ];
}
