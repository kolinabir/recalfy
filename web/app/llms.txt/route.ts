import { QUESTIONS } from "@/lib/faq-data";
import { PLANS } from "@/lib/pricing";

/**
 * llms.txt (llmstxt.org): a plain-markdown précis of the site for AI engines.
 * Built from the same data the pages render — pricing and FAQ can't drift
 * from what a human visitor sees.
 */
export function GET() {
  const plans = PLANS.map(
    (p) => `- **${p.name}** — $${p.monthly}/month or $${p.yearly}/year. ${p.tagline}`,
  ).join("\n");

  const faq = QUESTIONS.map((q) => `### ${q.q}\n\n${q.a}`).join("\n\n");

  const body = `# Recalfy

> Recalfy is a personal memory that lives in your chat app. You text it facts the way you'd text a friend — dates, names, where you left things, what you just spent. It keeps every fact as its own record, counts what should be counted, answers from memory when you ask, and messages you first when a moment you mentioned comes around. Live on Telegram and WhatsApp.

Key facts:

- No install: it runs inside the chat app you already use — Telegram and WhatsApp today, and one memory across both.
- Every fact is stored as its own record; corrections replace instead of piling up.
- Reminders are resolved in your timezone and read back before they're set.
- Expenses are logged by sentence: "cucumber 250" is a categorised expense, "buy cucumber 250" is a shopping-list line until you say you bought it.
- Monthly budgets and daily goals are set by saying them; the same mechanism tracks water, gym visits, weight, or anything else countable.
- Your whole memory exports as plain markdown or JSON, any day, from the dashboard.
- Nothing is used for AI training; memories are readable only by you and the model answering you.
- 14-day free trial on every plan, no card up front. Self-hosting is supported.

## Plans

${plans}

## Pages

- [Home](https://recalfy.com): what Recalfy is, how it remembers, and how it tracks spending and habits
- [Pricing](https://recalfy.com/pricing): plans, limits, and the self-hosted option
- [Privacy](https://recalfy.com/privacy): what Recalfy collects, why, and how to remove it
- [Terms](https://recalfy.com/terms): the terms that govern using Recalfy

## FAQ

${faq}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
