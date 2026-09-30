import { MemoryDoc } from '../mongo/collections';

/**
 * Which facts go into the prompt once the memory is too big to send whole.
 *
 * Measured on glm-5.2: a fact costs about 18 prompt tokens, so the Keep cap of
 * 2,000 is ~36k tokens of memory on every model call, and every tool round
 * sends it again. Up to FULL_LIMIT nothing changes — the whole memory goes in,
 * exactly as before. Past it, the prompt carries the recent facts and the
 * standing goals, and `search_memory` reaches everything else by keyword.
 *
 * The cut is by recency because recent facts are what conversation is
 * usually about, and because it is stable: a new fact moves the window by
 * one, it does not reshuffle the document.
 */

/** Up to this many live facts, the whole memory is rendered (~5.4k tokens). */
export const FULL_LIMIT = 300;
/** Past it: the newest this many… */
export const CORE_RECENT = 200;
/** …plus these groups, which the Sunday brief and goal check-ins lean on. */
export const PINNED_GROUPS: readonly string[] = ['Goals'];
/** A ceiling on the pinned groups, so a runaway one cannot undo the cut. */
export const PINNED_CAP = 40;

/**
 * The facts to render, in the order they were given. Pure; `live` must
 * already exclude superseded, deleted and expired rows.
 */
export function selectCore(live: MemoryDoc[]): MemoryDoc[] {
  if (live.length <= FULL_LIMIT) return live;

  // Newest first by short id: sids are minted in sequence, so they break the
  // ties createdAt cannot — facts stored in one call share a millisecond.
  const newestFirst = [...live].sort((a, b) => sequence(b) - sequence(a));
  const keep = new Set(newestFirst.slice(0, CORE_RECENT));
  newestFirst
    .filter((memory) => PINNED_GROUPS.includes(memory.group))
    .slice(0, PINNED_CAP)
    .forEach((memory) => keep.add(memory));

  return live.filter((memory) => keep.has(memory));
}

function sequence(memory: MemoryDoc): number {
  return parseInt(memory.sid, 36);
}
