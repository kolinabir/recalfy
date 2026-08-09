import { MemoryDoc } from '../mongo/collections';

export interface MemoryDocumentInput {
  timezone: string;
  /** Every non-deleted memory, superseded ones included — they render as "was:". */
  memories: MemoryDoc[];
}

const EMPTY_BODY = '_(nothing yet)_';

/**
 * Renders the live memory as the markdown document that becomes the system
 * prompt. Pure: no database, no clock, no I/O — so it is testable by handing
 * it an array and reading the string back.
 *
 * Ordering is stable (groups by first appearance, facts by creation) so a new
 * fact only ever appends. That keeps the prompt prefix byte-identical between
 * calls, which is what makes cached-input billing actually apply.
 */
export function renderMemoryDocument({ timezone, memories }: MemoryDocumentInput): string {
  const live = memories.filter(isLive);
  const header = renderHeader(timezone, live.length);
  const body = live.length === 0 ? EMPTY_BODY : renderSections(live, indexById(memories));
  return `${header}\n\n${body}`;
}

function isLive(memory: MemoryDoc): boolean {
  return !memory.supersededBy && !memory.deletedAt;
}

function renderHeader(timezone: string, count: number): string {
  const noun = count === 1 ? 'memory' : 'memories';
  return `# What I know about you\n_Timezone: ${timezone} · ${count} ${noun}_`;
}

function renderSections(live: MemoryDoc[], byId: Map<string, MemoryDoc>): string {
  return [...groupByHeading(live).entries()]
    .map(([heading, items]) => `## ${heading}\n${items.map((i) => renderLine(i, byId)).join('\n')}`)
    .join('\n\n');
}

/** A Map preserves insertion order, which is the ordering guarantee we want. */
function groupByHeading(memories: MemoryDoc[]): Map<string, MemoryDoc[]> {
  const groups = new Map<string, MemoryDoc[]>();
  for (const memory of memories) {
    const bucket = groups.get(memory.group);
    if (bucket) bucket.push(memory);
    else groups.set(memory.group, [memory]);
  }
  return groups;
}

function renderLine(memory: MemoryDoc, byId: Map<string, MemoryDoc>): string {
  const previous = memory.supersedes && byId.get(memory.supersedes.toHexString());
  const was = previous ? ` (was: ${previous.text})` : '';
  return `- ${memory.text}${was} \`${memory.sid}\``;
}

function indexById(memories: MemoryDoc[]): Map<string, MemoryDoc> {
  return new Map(memories.map((memory) => [memory._id.toHexString(), memory]));
}
