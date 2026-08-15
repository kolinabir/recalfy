import { Action } from '../channels/channel';
import { encodeAction } from '../channels/action-data';

export const UNDO = 'undo';

/**
 * The button offered under a reply that stored something.
 *
 * Ids, not text: the button has to survive the message it is attached to
 * being scrolled past, and a fact is only unambiguously identified by its id.
 *
 * Null when nothing was stored, and — because the payload is capped at 64
 * bytes — also when a single turn stored so much that the ids will not fit.
 * The rarer case is the honest one to drop: an Undo that silently forgets
 * only the first few facts is worse than no Undo at all.
 */
export function undoAction(saved: readonly string[]): Action | null {
  if (saved.length === 0) return null;

  const data = encodeAction(UNDO, saved.join(','));
  if (!data) return null;

  return { label: saved.length === 1 ? 'Undo' : `Undo all ${saved.length}`, data };
}

/** The ids a press refers to. Empty for anything malformed. */
export function undoneIds(parts: readonly string[]): string[] {
  return (parts[0] ?? '')
    .split(',')
    .map((sid) => sid.trim())
    .filter((sid) => sid !== '');
}

/** What the message says once the buttons have come off. */
export function undoneLine(count: number): string {
  return count === 1 ? '↩︎ Undone — forgotten.' : `↩︎ Undone — ${count} facts forgotten.`;
}
