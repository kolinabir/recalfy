import { PLANS } from "@/lib/pricing";
import { INSTALL_COMMAND } from "@/lib/self-host-data";

/**
 * Pricing as plain Markdown, for AI agents comparing tools on someone's
 * behalf. The pricing page renders Paddle's per-country prices in the
 * browser, which an agent can't reliably read; this states the USD list
 * prices from the same source as the home page's structured data.
 */
export function GET() {
  const plans = PLANS.map(
    (plan) => `## ${plan.name}

- Price: $${plan.monthly}/month, or $${plan.yearly}/year (USD list price; local prices vary by country)
- ${plan.tagline}
${plan.limits.map((l) => `- ${l.label}: ${l.value}`).join("\n")}
${plan.includes.map((i) => `- ${i}`).join("\n")}`,
  ).join("\n\n");

  const body = `# Pricing — Recalfy

Recalfy is a personal AI memory that lives in Telegram.

- Every hosted plan starts with a 7-day free trial; nothing is charged until it ends.
- Refunds within 14 days, no questions asked.
- Details and checkout: https://www.recalfy.com/pricing

${plans}

## Self-hosted

- Price: $0 — open source under the AGPL-3.0
- Set up with \`${INSTALL_COMMAND}\`; you pay only your AI provider, or nothing with a local model through Ollama
- Guide: https://www.recalfy.com/self-host
`;

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
