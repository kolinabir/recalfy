/**
 * The two plans, line by line.
 *
 * Every row here has to be true of the shipped product — a comparison table is
 * the page people screenshot and hold you to. `true` means included, `false`
 * means genuinely absent, and a string is the actual value or limit.
 *
 * Most rows are the same on both plans on purpose: the honest shape of this
 * product is that Keep is the whole thing with a ceiling, not a crippled
 * version of it. A table that manufactured differences would be lying about
 * what you get for six dollars.
 */

export type Cell = boolean | string;

export type ComparisonRow = {
  label: string;
  /** Shown under the label when the row needs a word of context. */
  note?: string;
  keep: Cell;
  archive: Cell;
};

export type ComparisonGroup = {
  title: string;
  rows: ComparisonRow[];
};

export const COMPARISON: ComparisonGroup[] = [
  {
    title: "Memory",
    rows: [
      {
        label: "Facts kept",
        note: "Roughly a decade of ordinary use before 2,000 is close.",
        keep: "2,000",
        archive: "Unlimited",
      },
      {
        label: "Every fact stored as its own record",
        keep: true,
        archive: true,
      },
      {
        label: "Corrections replace instead of piling up",
        keep: true,
        archive: true,
      },
      {
        label: "Whole memory read on every message",
        note: "No search index, no embeddings, nothing sampled.",
        keep: true,
        archive: true,
      },
      { label: "Forget anything by asking, in words", keep: true, archive: true },
    ],
  },
  {
    title: "Reminders",
    rows: [
      { label: "One-off reminders", keep: "Unlimited", archive: "Unlimited" },
      { label: "Resolved in your timezone", keep: true, archive: true },
      { label: "Read back before they're set", keep: true, archive: true },
      { label: "Recurring reminders", keep: false, archive: true },
      {
        label: "Quiet hours",
        note: "Reminders due overnight wait until the window ends.",
        keep: false,
        archive: true,
      },
    ],
  },
  {
    title: "Where it lives",
    rows: [
      { label: "Chat apps", keep: "Telegram", archive: "All of them" },
      { label: "Telegram", keep: true, archive: true },
      { label: "WhatsApp", keep: false, archive: true },
      {
        label: "Both at once, one memory across them",
        keep: false,
        archive: true,
      },
      {
        label: "Every new channel the day it ships",
        note: "Slack, Discord, iMessage and Signal are on the way.",
        keep: false,
        archive: true,
      },
    ],
  },
  {
    title: "Money and habits",
    rows: [
      {
        label: "Expenses logged by sentence",
        note: "“coffee 180” — categorised, counted, no app opened.",
        keep: true,
        archive: true,
      },
      { label: "Monthly budgets, set by saying one", keep: true, archive: true },
      {
        label: "A shopping list that becomes the ledger",
        keep: true,
        archive: true,
      },
      {
        label: "Trackers it sets up itself",
        note: "Water, gym, weight, pages — summed, counted or latest.",
        keep: true,
        archive: true,
      },
    ],
  },
  {
    title: "Your data",
    rows: [
      { label: "Export as plain markdown or JSON", keep: true, archive: true },
      { label: "Never trained on, never sold", keep: true, archive: true },
      // Two rows were removed from this group rather than reworded, because a
      // comparison table is the page people screenshot and hold you to:
      // "Delete everything, permanently" (there is no purge, in the bot or the
      // dashboard) and "Nightly encrypted backups you can download" (the only
      // backup is a server-side mongodump). Put each back the day it is built.
    ],
  },
  {
    title: "Speed and support",
    rows: [
      // "Under a second" was a latency promise against a third-party model
      // API that nothing in this system can hold to. Reply speed is the same
      // on both plans, so it is not a row.
      {
        label: "Support",
        keep: "Email",
        archive: "A human, usually the one who wrote it",
      },
    ],
  },
];
