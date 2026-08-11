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
  return value;
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
        { label: "Channels", value: "One" },
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
        { label: "Channels", value: "All of them" },
      ],
      features: [
        "Everything in Keep",
        "Telegram and WhatsApp at once, one memory across both — and every new channel the day it ships",
        "Nightly encrypted backups you can download",
        "Recurring reminders and quiet hours",
        "Priority on the faster model, so replies land in under a second",
        "Answers from a human, usually the one who wrote it",
      ],
      priceId: {
        month: priceId("PADDLE_PRICE_ARCHIVE_MONTH"),
        year: priceId("PADDLE_PRICE_ARCHIVE_YEAR"),
      },
    },
  ];
}
