import type {
  ArchivedMemory,
  MemoryStatus,
  ReminderItem,
} from "@/lib/dashboard-data";
import { repeatLabel } from "@/lib/format";

/**
 * The two shapes a memory can leave in.
 *
 * Pure string builders — no database, no session, no `Date.now()` — so the
 * route handler is the only part that needs a request to run, and the format
 * itself can be reasoned about by reading one file.
 *
 * **Markdown** is the promise the site makes: the document the bot itself
 * recites, grouped the way it groups it, readable in any editor.
 * **JSON** is the escape hatch: every record the account owns, corrections and
 * deletions included, in a shape another program can load.
 */

export type ExportFormat = "md" | "json";

export function isExportFormat(value: string | null): value is ExportFormat {
  return value === "md" || value === "json";
}

export interface ExportInput {
  email: string;
  timezone: string;
  /** Every row, live or not — `memoryMarkdown` filters, `archiveJson` doesn't. */
  memories: ArchivedMemory[];
  reminders: ReminderItem[];
  exportedAt: Date;
}

/** `recalfy-memory-2026-08-10.md` — sorts chronologically in a downloads folder. */
export function exportFilename(format: ExportFormat, exportedAt: Date): string {
  const day = exportedAt.toISOString().slice(0, 10);
  return format === "md"
    ? `recalfy-memory-${day}.md`
    : `recalfy-archive-${day}.json`;
}

export function contentType(format: ExportFormat): string {
  return format === "md"
    ? "text/markdown; charset=utf-8"
    : "application/json; charset=utf-8";
}

export function buildExport(format: ExportFormat, input: ExportInput): string {
  return format === "md" ? memoryMarkdown(input) : archiveJson(input);
}

/**
 * The live memory as a document. Deliberately not the whole archive: this is
 * the file you read, and a correction from March sitting next to the fact
 * that replaced it would make it harder to read, not more honest. The JSON
 * export is where nothing is omitted.
 */
export function memoryMarkdown({
  email,
  timezone,
  memories,
  reminders,
  exportedAt,
}: ExportInput): string {
  const live = memories.filter((memory) => memory.status === "live");
  const noun = live.length === 1 ? "memory" : "memories";

  const sections = [
    `# What Recalfy knows about you`,
    `_${email} · ${live.length} ${noun} · timezone ${timezone} · exported ${absoluteDate(exportedAt, timezone)}_`,
    live.length === 0
      ? "_(nothing yet)_"
      : renderGroups(live, timezone),
  ];

  if (reminders.length > 0) {
    sections.push(renderReminders(reminders, timezone));
  }

  sections.push(
    "---\n\nExported from recalfy.com. This file is yours — plain markdown, no\n" +
      "proprietary format. Every fact carries the short id the bot uses for it,\n" +
      "so you can point at one in the chat and it will know which you mean.",
  );

  return sections.join("\n\n") + "\n";
}

/**
 * Groups in first-appearance order, facts in the order they were learned —
 * the same ordering the bot's own renderer uses, so two exports of an
 * unchanged memory are byte-identical apart from the header.
 */
function renderGroups(live: ArchivedMemory[], timezone: string): string {
  const groups = new Map<string, ArchivedMemory[]>();
  for (const memory of live) {
    const bucket = groups.get(memory.group);
    if (bucket) bucket.push(memory);
    else groups.set(memory.group, [memory]);
  }

  return [...groups.entries()]
    .map(([heading, items]) => {
      const lines = items
        .map((item) => {
          const until = item.expiresAt
            ? ` (until ${absoluteDate(new Date(item.expiresAt), timezone)})`
            : "";
          return `- ${item.text}${until} \`${item.sid}\``;
        })
        .join("\n");
      return `## ${heading}\n${lines}`;
    })
    .join("\n\n");
}

function renderReminders(reminders: ReminderItem[], timezone: string): string {
  const lines = reminders
    .map((reminder) => {
      const cadence = reminder.repeat
        ? ` (${repeatLabel(reminder.repeat)})`
        : "";
      return `- ${absoluteDateTime(new Date(reminder.dueAt), timezone)} — ${reminder.text}${cadence}`;
    })
    .join("\n");

  return `## Reminders not yet fired\n${lines}`;
}

/**
 * Everything, in a shape a program can read. `schema` is here so a file found
 * on a disk in two years explains itself, and so a future format change is
 * detectable rather than silent.
 */
export function archiveJson({
  email,
  timezone,
  memories,
  reminders,
  exportedAt,
}: ExportInput): string {
  return JSON.stringify(
    {
      schema: "recalfy.export.v1",
      exportedAt: exportedAt.toISOString(),
      account: { email, timezone },
      counts: countByStatus(memories),
      memories: memories.map((memory) => ({
        id: memory.sid,
        text: memory.text,
        group: memory.group,
        status: memory.status,
        createdAt: memory.createdAt,
        ...(memory.forgottenAt ? { forgottenAt: memory.forgottenAt } : {}),
        ...(memory.expiresAt ? { expiresAt: memory.expiresAt } : {}),
      })),
      reminders: reminders.map((reminder) => ({
        text: reminder.text,
        dueAt: reminder.dueAt,
        ...(reminder.repeat ? { repeat: reminder.repeat } : {}),
      })),
    },
    null,
    2,
  );
}

function countByStatus(
  memories: ArchivedMemory[],
): Record<MemoryStatus, number> {
  const counts: Record<MemoryStatus, number> = {
    live: 0,
    superseded: 0,
    forgotten: 0,
    expired: 0,
  };
  for (const memory of memories) counts[memory.status] += 1;
  return counts;
}

/** "10 Aug 2026" in the memory's own zone, never the reader's browser. */
function absoluteDate(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "10 Aug 2026, 17:00" — no "Today", because an export outlives today. */
function absoluteDateTime(date: Date, timeZone: string): string {
  return `${absoluteDate(date, timeZone)}, ${date.toLocaleTimeString("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
