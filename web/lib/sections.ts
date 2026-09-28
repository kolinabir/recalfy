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
    name: "What Recalfy does",
    description:
      "Recalfy is an AI assistant in Telegram. It remembers what you tell it, answers when you ask in your own words, messages you first when a reminder is due, and keeps a running total of what you spend.",
  },
  {
    id: "examples",
    name: "What people remember with it",
    description:
      "Small facts that are too minor to file and too costly to forget — allergies, safe codes, boiler pressure, who is finishing a PhD — coming back months later at the moment they matter.",
  },
  {
    id: "get-started",
    name: "How to get started",
    description:
      "Three steps, about a minute: sign in with Google, start a seven-day free trial, and connect Telegram from the dashboard. Nothing to install.",
  },
  {
    id: "pricing",
    name: "Pricing",
    description:
      "Two plans from $6 a month, seven days free, and refunds within fourteen days. One person, one memory, one price — no usage meter. Or self-host it free.",
  },
  {
    id: "faq",
    name: "Frequently asked questions",
    description:
      "Answers on privacy and training, accuracy, exporting and deleting your memory, self-hosting, and how the free trial works.",
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
      "how-it-works": "What it does",
      examples: "Examples",
      "get-started": "Get started",
      start: "Start free",
    }[id] ?? name,
}));
