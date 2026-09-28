import { EXAMPLE_COUNT } from "@/lib/examples-data";
import { FEATURE_COUNT } from "@/lib/features-data";
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

> Recalfy is a personal memory that lives in your chat app. You text it facts the way you'd text a friend — dates, names, where you left things, what you just spent. It keeps every fact as its own record, counts what should be counted, answers from memory when you ask, and messages you first when a moment you mentioned comes around. Live on Telegram.

Key facts:

- No install: it runs inside the chat app you already use — Telegram today, with more chat apps to follow.
- Every fact is stored as its own record; corrections replace instead of piling up.
- Reminders are resolved in your timezone and read back before they're set.
- Expenses are logged by sentence: "cucumber 250" is a categorised expense, "buy cucumber 250" is a shopping-list line until you say you bought it.
- Monthly budgets and daily goals are set by saying them; the same mechanism tracks water, gym visits, weight, or anything else countable.
- Your whole memory exports as plain markdown or JSON, any day, from the dashboard.
- Nothing is used for AI training; memories are readable only by you and the model answering you.
- Open source (AGPL-3.0) and self-hostable: \`npx recalfy\` sets up your own copy with a Telegram bot token and any OpenAI-compatible model, including a local one through Ollama. Source: https://github.com/kolinabir/recalfy
- 7-day free trial on every plan; card details are taken at signup but nothing is charged until the trial ends. Refunds within 14 days, no questions.

## Plans

${plans}

## Pages

- [Home](https://www.recalfy.com): what Recalfy is, how it remembers, and how it tracks spending and habits
- [Examples](https://www.recalfy.com/examples): ${EXAMPLE_COUNT} worked examples across dates, people, places, codes, money, lists, habits, reminders, corrections and recall
- [Features](https://www.recalfy.com/features): all ${FEATURE_COUNT} capabilities — atomic facts, supersession, unprompted reminders, spending by sentence, export and forget-on-request
- [Pricing](https://www.recalfy.com/pricing): plans, limits, and what each one includes
- [Self-host](https://www.recalfy.com/self-host): run your own copy for free — what you need, the setup steps, choosing a model, and day-to-day commands, running costs and common questions ([Markdown](https://www.recalfy.com/self-host.md))
- [Pricing as Markdown](https://www.recalfy.com/pricing.md): every plan, its price and limits, and the free self-hosted option, in plain text
- [Changelog](https://www.recalfy.com/changelog): what shipped and when, newest first — also available as a feed at /changelog/rss.xml
- [Privacy](https://www.recalfy.com/privacy): what Recalfy collects, why, and how to remove it
- [Terms](https://www.recalfy.com/terms): the terms that govern using Recalfy

## FAQ

${faq}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
