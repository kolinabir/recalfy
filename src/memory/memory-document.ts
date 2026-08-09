import { DateTime } from 'luxon';

import { MemoryDoc } from '../mongo/collections';

export interface MemoryDocumentInput {
  timezone: string;
  /** Every non-deleted memory, superseded ones included — they render as "was:". */
  memories: MemoryDoc[];
  /** Expiring facts are judged against this instant. */
  now: Date;
}

const EMPTY_BODY = '_(nothing yet)_';

/** The one group that clusters per person rather than by arrival order. */
const PEOPLE_GROUP = 'People';

/**
 * Renders the live memory as the markdown document that becomes the system
 * prompt. Pure: no database, no I/O — the clock arrives as a parameter — so
 * it is testable by handing it an array and reading the string back.
 *
 * Ordering is stable (groups by first appearance, facts by creation) so a new
 * fact only ever appends. That keeps the prompt prefix byte-identical between
 * calls, which is what makes cached-input billing actually apply. The People
 * group is the deliberate exception: it clusters facts about the same person
 * together (names ordered by first appearance) so "tell me about Rahim" reads
 * one block, not a scatter.
 */
export function renderMemoryDocument({ timezone, memories, now }: MemoryDocumentInput): string {
  const live = memories.filter((memory) => isLive(memory, now));
  const header = renderHeader(timezone, live.length);
  const body =
    live.length === 0 ? EMPTY_BODY : renderSections(live, indexById(memories), timezone);
  return `${header}\n\n${body}`;
}

function isLive(memory: MemoryDoc, now: Date): boolean {
  if (memory.supersededBy || memory.deletedAt) return false;
  return !memory.staleAfter || memory.staleAfter.getTime() > now.getTime();
}

function renderHeader(timezone: string, count: number): string {
  const noun = count === 1 ? 'memory' : 'memories';
  return `# What I know about you\n_Timezone: ${timezone} · ${count} ${noun}_`;
}

function renderSections(
  live: MemoryDoc[],
  byId: Map<string, MemoryDoc>,
  timezone: string,
): string {
  return [...groupByHeading(live).entries()]
    .map(([heading, items]) => {
      const ordered = heading === PEOPLE_GROUP ? clusterByPerson(items) : items;
      return `## ${heading}\n${ordered.map((i) => renderLine(i, byId, timezone)).join('\n')}`;
    })
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

/**
 * Facts about the same person sit together. The person is read from the
 * fact's leading word ("Rahim is…", "Rahim's number…") — which is why the
 * prompt tells the model to start people-facts with the name.
 */
function clusterByPerson(memories: MemoryDoc[]): MemoryDoc[] {
  const clusters = new Map<string, MemoryDoc[]>();
  for (const memory of memories) {
    const key = personKey(memory.text);
    const bucket = clusters.get(key);
    if (bucket) bucket.push(memory);
    else clusters.set(key, [memory]);
  }
  return [...clusters.values()].flat();
}

/** "Rahim's" and "Rahim" cluster together; case and punctuation don't split. */
function personKey(text: string): string {
  const first = text.trim().split(/\s+/, 1)[0] ?? '';
  return first
    .toLowerCase()
    .replace(/['’]s$/, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function renderLine(memory: MemoryDoc, byId: Map<string, MemoryDoc>, timezone: string): string {
  const previous = memory.supersedes && byId.get(memory.supersedes.toHexString());
  const was = previous ? ` (was: ${previous.text})` : '';
  const until = memory.staleAfter
    ? ` (until ${DateTime.fromJSDate(memory.staleAfter, { zone: timezone }).toFormat('d LLL')})`
    : '';
  return `- ${memory.text}${was}${until} \`${memory.sid}\``;
}

function indexById(memories: MemoryDoc[]): Map<string, MemoryDoc> {
  return new Map(memories.map((memory) => [memory._id.toHexString(), memory]));
}
