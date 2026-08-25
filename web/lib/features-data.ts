import {
  Activity,
  ArrowLeftRight,
  AtSign,
  BellRing,
  Clock,
  Download,
  EyeOff,
  Globe,
  Layers,
  ListChecks,
  PanelsTopLeft,
  Asterisk,
  Target,
  Trash2,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Every capability, named once.
 *
 * Lifted out of the component when the list outgrew the home page: sixteen
 * cards is a reference, not a pitch, and a reference needs its own page and
 * its own structured data. This is the single source for both.
 */
export type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const FEATURES: Feature[] = [
  {
    icon: Layers,
    title: "Atomic facts",
    body: "Every statement stored on its own, so one can be changed without touching the rest.",
  },
  {
    icon: ArrowLeftRight,
    title: "Supersession",
    body: "A correction retires the old fact instead of stacking on top of it.",
  },
  {
    icon: BellRing,
    title: "Unprompted reminders",
    body: "It messages you first, at the time you mentioned once, weeks ago — and one tap moves it later.",
  },
  {
    icon: Clock,
    title: "Timezone-aware",
    body: "It infers where you are and resolves “at 5” into a real, confirmed moment.",
  },
  {
    icon: Trash2,
    title: "Forget on request",
    body: "“Forget everything about the old flat” removes exactly those records — and tells you what went.",
  },
  {
    icon: Download,
    title: "Plain-markdown export",
    body: "The same document the model reads, downloadable any day you like.",
  },
  {
    icon: EyeOff,
    title: "Never trained on",
    body: "No training, no sharing, no analytics on the contents of your memory.",
  },
  {
    icon: Globe,
    title: "Channel-portable",
    body: "Add a second chat app and the whole memory is already there.",
  },
  {
    icon: Wallet,
    title: "Spending, by sentence",
    body: "“coffee 180” is a logged expense, categorised, counted, no app opened.",
  },
  {
    icon: ListChecks,
    title: "A list that becomes the ledger",
    body: "“buy filters” waits on your list; buying them turns that same line into the expense.",
  },
  {
    icon: Target,
    title: "Budgets and goals",
    body: "State a monthly cap or a daily target once, and every total is measured against it.",
  },
  {
    icon: Activity,
    title: "Trackers it sets up itself",
    body: "Water, gym, weight, pages — it picks sum, count, or latest reading to fit the thing.",
  },
  {
    icon: AtSign,
    title: "Memory in any chat",
    body: "Type @recalfy_bot mid-conversation and send a fact straight to whoever asked. They never see the bot.",
  },
  {
    icon: PanelsTopLeft,
    title: "A tab for each group",
    body: "People, Home, Work — each becomes a tab in the chat, holding its current list rather than a history.",
  },
  {
    icon: Undo2,
    title: "One tap to take it back",
    body: "Saved something you didn't mean to keep? Undo sits under the reply, no sentence required.",
  },
  {
    icon: Asterisk,
    title: "Passwords stay covered",
    body: "Credentials are masked wherever memory is listed, and shown only when you ask for one.",
  },
];

export const FEATURE_COUNT = FEATURES.length;
