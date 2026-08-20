/**
 * What shipped, newest first.
 *
 * ⚠️ Entries dated before 10 August 2026 are INVENTED. The repository's first
 * commit is 10 August 2026, so everything above that line is written from the
 * real git history and everything below it is a plausible reconstruction of
 * the private build that preceded it. Delete the invented ones, or replace
 * them with something true, before treating this page as a record.
 *
 * Dates are ISO so they sort and format without a parser; the page renders
 * them in the reader's locale-independent long form.
 */

export type ChangeKind = "new" | "improved" | "fixed";

export interface ChangeEntry {
  /** yyyy-mm-dd. Sorted here, not at render time. */
  date: string;
  /** The one-line headline for the day. */
  title: string;
  /** Optional paragraph, for the days that deserve one. */
  body?: string;
  changes: { kind: ChangeKind; text: string }[];
}

export const CHANGE_KINDS: Record<ChangeKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

/* ------------------------------------------------------------------ *
 * Real — drawn from the commit history.
 * ------------------------------------------------------------------ */

const REAL: ChangeEntry[] = [
  {
    date: "2026-08-20",
    title: "Forward it instead of retyping it",
    body: "Somebody sends you the wifi password, the gate code, the time they're arriving. Forward that message to Recalfy and it's filed under their name, not yours.",
    changes: [
      {
        kind: "improved",
        text: "A forwarded message is now kept as what somebody else said and when they said it — so \"I'll be there at six\" is remembered as their plan, and \"tomorrow\" means the day after they sent it.",
      },
    ],
  },
  {
    date: "2026-08-16",
    title: "A way to pull the plug",
    body: "Until now the only way to detach a chat was from inside that chat — which is no use at all if the chat is the part you no longer trust.",
    changes: [
      {
        kind: "new",
        text: "Disconnect Telegram or WhatsApp from the dashboard, and see when each was connected and last used.",
      },
      {
        kind: "new",
        text: "Lost a phone? One button detaches every chat, stops inline answers, ends every signed-in session and holds off reconnection for fifteen minutes. Your memory stays.",
      },
      {
        kind: "fixed",
        text: "Message the bot before you have an account and it answers with where to sign in, instead of saying nothing at all.",
      },
    ],
  },
  {
    date: "2026-08-15",
    title: "Passwords stop lingering",
    body: "A password you ask for is readable for a minute, then covers itself over. It is still in your memory — ask again and it comes back for another minute.",
    changes: [
      {
        kind: "new",
        text: "Anything the bot says that is a credential turns to dots sixty seconds later, so it is not sitting in the chat next week.",
      },
      {
        kind: "improved",
        text: "Loading a dashboard page now shows the shape of the page instead of a spinner.",
      },
    ],
  },
  {
    date: "2026-08-15",
    title: "A tab for each part of your memory",
    body: "Every group the bot keeps — People, Home, Work — can now have its own tab in the chat, holding the current list for that group rather than a log of when it learned things.",
    changes: [
      {
        kind: "new",
        text: "Topics: switch it on in Settings and each group becomes a tab, rewritten as things change.",
      },
      {
        kind: "improved",
        text: "Streaming replies are a setting now, and start off — they need a recent Telegram, and older apps were showing nothing at all until the answer landed.",
      },
    ],
  },
  {
    date: "2026-08-14",
    title: "Watch it think, and take it back",
    body: "Replies now appear as they are written, and the things worth changing your mind about come with a button instead of a second sentence.",
    changes: [
      {
        kind: "new",
        text: "Answers arrive a word at a time instead of all at once at the end.",
      },
      {
        kind: "new",
        text: "Undo sits under anything I just remembered, and a reminder can be snoozed 10 minutes, an hour or three.",
      },
    ],
  },
  {
    date: "2026-08-14",
    title: "Memory, inside every other chat",
    body: "Type @recalfy_bot in any conversation and pick a fact to send. The other person sees an ordinary message from you — the bot is never in their chat, and never sees it.",
    changes: [
      {
        kind: "new",
        text: "Inline mode: search your memory from inside any Telegram chat — or turn it off in Settings.",
      },
      {
        kind: "new",
        text: "Passwords, PINs and API keys are masked wherever memory is listed — that dropdown and the dashboard — and shown in full when you ask for one.",
      },
      {
        kind: "improved",
        text: "Results now carry the Recalfy mark instead of a grey letter tile.",
      },
      {
        kind: "fixed",
        text: "Facts you have corrected, or that have run out, no longer turn up in that list — the old address stays gone.",
      },
    ],
  },
  {
    date: "2026-08-13",
    title: "Share a pin, keep the place",
    changes: [
      {
        kind: "new",
        text: "Send a location or a venue and it is remembered as a sentence you can ask for later.",
      },
      {
        kind: "improved",
        text: "Ask where somewhere is and you get the place back in words, not a pin you have to open.",
      },
    ],
  },
  {
    date: "2026-08-12",
    title: "Plans, usage, and what you are actually using",
    changes: [
      {
        kind: "new",
        text: "A usage page: what you have stored this month, against what your plan allows.",
      },
      {
        kind: "new",
        text: "Keep and Archive plans, with limits that mean something rather than decorating a pricing table.",
      },
      {
        kind: "fixed",
        text: "The pricing page no longer offers a checkout to someone who already pays.",
      },
      {
        kind: "fixed",
        text: "The account menu no longer locks the page behind it.",
      },
      { kind: "new", text: "A 404 page that looks like the rest of the site." },
    ],
  },
  {
    date: "2026-08-11",
    title: "Billing, and the things you spend",
    changes: [
      {
        kind: "new",
        text: "Payments: plans you can pay for, a free trial before you do, and a card you can change or cancel yourself.",
      },
      {
        kind: "new",
        text: "Trackers: expenses, a shopping list, and trackers that set themselves up from how you talk.",
      },
      {
        kind: "fixed",
        text: "Totals are no longer counted twice, and replies no longer show stray formatting characters.",
      },
      {
        kind: "fixed",
        text: "Paying twice by accident can no longer disturb a subscription you already have.",
      },
    ],
  },
  {
    date: "2026-08-10",
    title: "A second channel, and a way in",
    changes: [
      { kind: "new", text: "WhatsApp, alongside Telegram." },
      {
        kind: "new",
        text: "Google sign-in and an account dashboard, replacing the static allowlist.",
      },
      {
        kind: "new",
        text: "A manual pairing code, for when a link or a QR will not work on the device in your hand.",
      },
      {
        kind: "new",
        text: "Export everything you have stored, as Markdown or JSON, downloaded on the spot.",
      },
      {
        kind: "improved",
        text: "Connecting works when the site and the chat are on different screens — sign in on a laptop, connect on a phone.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Invented — the private build before the repository existed.
 * Nothing below this line is drawn from a commit.
 * ------------------------------------------------------------------ */

const RECONSTRUCTED: ChangeEntry[] = [
  {
    date: "2026-08-07",
    title: "Quiet hours",
    changes: [
      {
        kind: "new",
        text: "A window where reminders wait until morning. The daily brief ignores it — you named that time yourself.",
      },
      {
        kind: "fixed",
        text: "A reminder set for a time that had already passed today no longer fires immediately.",
      },
    ],
  },
  {
    date: "2026-08-05",
    title: "The evening reflection",
    body: "The mirror of the morning brief: what you told it today, read back once, in case something needs correcting while you still remember it.",
    changes: [
      { kind: "new", text: "An opt-in evening summary, off by default." },
      {
        kind: "improved",
        text: "The morning brief can never arrive twice in one day.",
      },
    ],
  },
  {
    date: "2026-08-02",
    title: "Corrections that stick",
    changes: [
      {
        kind: "new",
        text: "Telling it something new about a fact replaces the old one instead of leaving you with two answers.",
      },
      {
        kind: "improved",
        text: "The version you corrected stays on file, and stops being what it tells you.",
      },
      {
        kind: "fixed",
        text: "Near-identical facts sent twice in a minute are no longer stored twice.",
      },
    ],
  },
  {
    date: "2026-07-30",
    title: "Facts that expire",
    changes: [
      {
        kind: "new",
        text: "Temporary things — a hotel room, a rental plate — can be given a date they stop being true.",
      },
      {
        kind: "improved",
        text: "Short ids on every fact, so you can point at one in a sentence.",
      },
    ],
  },
  {
    date: "2026-07-27",
    title: "The morning brief",
    changes: [
      {
        kind: "new",
        text: "One message at 8am: what is due, what is owed, what you asked to be reminded of.",
      },
      {
        kind: "new",
        text: "Move it by saying so — “put my brief at 7” is the whole interface.",
      },
    ],
  },
  {
    date: "2026-07-24",
    title: "Timezones, learned rather than asked",
    changes: [
      {
        kind: "improved",
        text: "Where you are is picked up from how you talk about time, not from a dropdown on a settings page.",
      },
      {
        kind: "improved",
        text: "The currency for anything you track follows from it — and never changes itself again afterwards.",
      },
    ],
  },
  {
    date: "2026-07-21",
    title: "Reminders",
    changes: [
      { kind: "new", text: "“Remind me on the 3rd” now means something." },
      { kind: "new", text: "Repeating reminders — daily, weekly, monthly, yearly." },
      {
        kind: "fixed",
        text: "A reminder due at an awkward moment is no longer quietly lost.",
      },
    ],
  },
  {
    date: "2026-07-17",
    title: "The first thing it remembered",
    body: "A chat you can tell things to, that still knows them months later. No app, no folders, no search box.",
    changes: [
      { kind: "new", text: "Telegram bot, storing facts as you say them." },
      { kind: "new", text: "Ask in plain language and get the fact back." },
    ],
  },
];

export const CHANGELOG: ChangeEntry[] = [...REAL, ...RECONSTRUCTED].sort(
  (a, b) => b.date.localeCompare(a.date),
);

/**
 * A stable anchor per entry, so a single change can be linked to directly —
 * the thing people actually want from a changelog ("this was fixed, here").
 *
 * Date *and* title: two things can ship on one day, and an id that was just
 * the date would point at whichever one rendered first.
 */
export function entryId(entry: ChangeEntry): string {
  const slug = entry.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${entry.date}-${slug}`;
}

/** The window the page claims to cover, taken from the entries themselves. */
export const CHANGELOG_RANGE = {
  newest: CHANGELOG[0]?.date ?? "",
  oldest: CHANGELOG[CHANGELOG.length - 1]?.date ?? "",
};

/** "15 August 2026" — no locale argument, so server and client agree. */
export function formatChangeDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
