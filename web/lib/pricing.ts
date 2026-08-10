export type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  featured?: boolean;
  cta: string;
  includes: string[];
  limits: { label: string; value: string }[];
};

export const PLANS: Plan[] = [
  {
    id: "keep",
    name: "Keep",
    tagline: "For one head that holds too much.",
    monthly: 6,
    yearly: 60,
    cta: "Start with Keep",
    limits: [
      { label: "Memories", value: "2,000" },
      { label: "Reminders", value: "Unlimited" },
      { label: "Channels", value: "One" },
    ],
    includes: [
      "Every fact stored as its own record, with corrections that replace instead of pile up",
      "Reminders resolved in your timezone and read back before they're set",
      "Export the whole memory as plain markdown or JSON, any day",
      "Forget anything by asking, in words",
    ],
  },
  {
    id: "archive",
    name: "Archive",
    tagline: "For a memory you expect to keep for years.",
    monthly: 14,
    yearly: 140,
    featured: true,
    cta: "Start with Archive",
    limits: [
      { label: "Memories", value: "Unlimited" },
      { label: "Reminders", value: "Unlimited" },
      { label: "Channels", value: "All of them" },
    ],
    includes: [
      "Everything in Keep",
      "Telegram and WhatsApp at once, one memory across both — and every new channel the day it ships",
      "Nightly encrypted backups you can download",
      "Recurring reminders and quiet hours",
      "Priority on the faster model, so replies land in under a second",
      "Answers from a human, usually the one who wrote it",
    ],
  },
];

export const SELF_HOST = {
  name: "Self-hosted",
  tagline: "Run it yourself, on your own box.",
  points: [
    "The whole thing is one process and one Mongo database",
    "Bring your own model key — the provider is a config line, not a rewrite",
    "No telemetry, no account, no us",
  ],
};

export function priceFor(plan: Plan, cycle: "monthly" | "yearly") {
  return cycle === "monthly"
    ? { amount: plan.monthly, per: "month" }
    : { amount: Math.round(plan.yearly / 12), per: "month, billed yearly" };
}
