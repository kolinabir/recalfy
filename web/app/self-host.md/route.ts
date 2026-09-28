import {
  COMMANDS,
  COSTS,
  DEFINITION,
  GITHUB_URL,
  GUIDE_URL,
  INSTALL_COMMAND,
  MODELS,
  NEEDS,
  QUESTIONS,
  SELF_HOSTED,
  HOSTED,
  SERVER_INSTALL_COMMAND,
  STEPS,
  TROUBLE,
  UPDATED,
  VERSION,
} from "@/lib/self-host-data";

/**
 * /self-host as plain Markdown, for AI agents and answer engines that would
 * rather read a document than parse a page. Built from the same data as the
 * page, so the two can't say different things. Advertised from the page's
 * <head> as its text/markdown alternate, and listed in llms.txt.
 */
export function GET() {
  const body = `# Self-host Recalfy

> ${DEFINITION}

Version ${VERSION} · Updated ${UPDATED} · License: AGPL-3.0 · Source: ${GITHUB_URL}

\`\`\`bash
${INSTALL_COMMAND}
\`\`\`

## What you need

${NEEDS.map((n) => `- **${n.title}** — ${n.body}`).join("\n")}

## How to self-host Recalfy

${STEPS.map((s, i) => `${i + 1}. **${s.title}.** ${s.body}`).join("\n")}

On a fresh Linux server, this installs Docker and Node.js first, then runs the same setup:

\`\`\`bash
${SERVER_INSTALL_COMMAND}
\`\`\`

## Which AI model should you use?

The model must support tool calling: Recalfy saves facts and sets reminders through tools.

| Provider | Start with | Why |
|---|---|---|
${MODELS.map((m) => `| ${m.provider} | \`${m.model}\` | ${m.note} |`).join("\n")}

## What does it cost to run?

| Item | Cost |
|---|---|
${COSTS.map((c) => `| ${c.item} | ${c.cost} |`).join("\n")}

## Day-to-day commands

| Command | What it does |
|---|---|
${COMMANDS.map((c) => `| \`${c.command}\` | ${c.does} |`).join("\n")}

## Hosted or self-hosted?

Hosted on recalfy.com:
${HOSTED.map((h) => `- ${h}`).join("\n")}

Self-hosted:
${SELF_HOSTED.map((h) => `- ${h}`).join("\n")}

## Questions

${QUESTIONS.map((q) => `### ${q.q}\n\n${q.a}`).join("\n\n")}

## Troubleshooting

${TROUBLE.map((t) => `### ${t.q}\n\n${t.a}`).join("\n\n")}

Full guide: ${GUIDE_URL}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
