/**
 * The home page's sections, named once.
 *
 * A URL fragment cannot carry its own <title> or <meta description> — Google
 * indexes the page, not the anchor. What a fragment *can* have is a declared
 * identity: a stable id, a heading, and a WebPageElement entry in the page's
 * structured data. That is what lets a section be linked, understood as a
 * distinct part of the page, and surfaced as a jump-to link in results.
 *
 * This list is the single source for both the scroll spy and that markup, so a
 * section can never be described one way and linked another.
 */
export type Section = {
  id: string;
  /** Matches the section's visible heading — schema must not outrun the page. */
  name: string;
  description: string;
};

export const SITE = "https://www.recalfy.com";

export const SECTIONS: Section[] = [
  {
    id: "how-it-works",
    name: "How it works",
    description:
      "Recalfy splits each message into separate facts, replaces them when you correct yourself, and messages you first at a time you mentioned once. No commands and no syntax to learn.",
  },
  {
    id: "examples",
    name: "What people remember with it",
    description:
      "Small facts that are too minor to file and too costly to forget — allergies, safe codes, boiler pressure, who is finishing a PhD — coming back months later at the moment they matter.",
  },
  {
    id: "tracking",
    name: "Expense tracking and habits by text",
    description:
      "Log what you spent in two words and a number, set a monthly budget by saying it, and track water, gym visits or weight without opening an app or photographing a receipt.",
  },
  {
    id: "approach",
    name: "Why there is no search",
    description:
      "Most memory tools retrieve notes that resemble your question. Recalfy hands the model your entire memory on every message, so corrections and negations are read rather than pattern-matched.",
  },
  {
    id: "why",
    name: "Why Recalfy exists",
    description:
      "Every other tool asks you to file things first — open the app, pick a folder, tag the note. That work is why the note never gets written.",
  },
  {
    id: "pricing",
    name: "Pricing",
    description:
      "Two plans from $6 a month, seven days free, and refunds within fourteen days. One person, one memory, one price — no usage meter.",
  },
  {
    id: "faq",
    name: "Frequently asked questions",
    description:
      "Answers on privacy and training, accuracy, exporting and deleting your memory, which chat apps are supported, and how the free trial works.",
  },
  {
    id: "start",
    name: "Get started",
    description:
      "Start a seven-day free trial. No install, nothing to migrate, and no commands to learn.",
  },
];

export const SECTION_IDS = SECTIONS.map((section) => section.id);

/** What the tab reads while you're in a given section. Short, not the schema
 * name — a tab strip has room for two words. */
export const SECTION_TABS = SECTIONS.map(({ id, name }) => ({
  id,
  name:
    {
      examples: "Examples",
      tracking: "Money and habits",
      approach: "Why no search",
      why: "Why it exists",
      start: "Start free",
    }[id] ?? name,
}));
