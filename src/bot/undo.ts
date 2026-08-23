import { Action } from '../channels/channel';
import { encodeAction } from '../channels/action-data';

export const UNDO = 'undo';

/** Separates the fact ids from the reminder ids inside one payload. */
const FIELD = ';';
const LIST = ',';

/**
 * What a single turn put into the world, and can take back out.
 *
 * Facts and reminders both, because they arrive together: "interview Friday at
 * 3" stores a fact *and* schedules a reminder, and an Undo that only took back
 * the fact left the reminder to fire anyway — the user having been told, in
 * writing, that it was undone.
 */
export interface Undoable {
  /** Short ids (`03`) of facts stored this turn. */
  saved: readonly string[];
  /** Reminder ObjectId hex strings scheduled this turn. */
  scheduled: readonly string[];
}

/**
 * The button offered under a reply that changed something.
 *
 * Ids, not text: the button has to survive the message it is attached to being
 * scrolled past, and a fact is only unambiguously identified by its id.
 *
 * Null when nothing was stored, and — because the payload is capped at 64
 * bytes — also when a single turn changed so much that the ids will not fit.
 * The rarer case is the honest one to drop: an Undo that silently reverses
 * only the first few things is worse than no Undo at all.
 */
export function undoAction({ saved, scheduled }: Undoable): Action | null {
  const count = saved.length + scheduled.length;
  if (count === 0) return null;

  const data = encodeAction(UNDO, saved.join(LIST) + FIELD + scheduled.map(pack).join(LIST));
  if (!data) return null;

  return { label: count === 1 ? 'Undo' : `Undo all ${count}`, data };
}

/** What the payload refers to. Empty lists for anything malformed. */
export function undone(parts: readonly string[]): Undoable {
  const [savedField = '', scheduledField = ''] = (parts[0] ?? '').split(FIELD);
  return {
    saved: split(savedField),
    scheduled: split(scheduledField).map(unpack).filter((id): id is string => id !== null),
  };
}

/**
 * What the message says once the buttons have come off.
 *
 * Says both halves out loud when there are both, because "undone" over a
 * reminder the user cannot see is a promise they have no way to check.
 */
export function undoneLine(facts: number, reminders: number): string {
  const parts: string[] = [];
  if (facts > 0) parts.push(facts === 1 ? 'forgotten' : `${facts} facts forgotten`);
  if (reminders > 0) {
    parts.push(reminders === 1 ? 'reminder cancelled' : `${reminders} reminders cancelled`);
  }
  return parts.length === 0 ? '↩︎ Undone — nothing left to take back.' : `↩︎ Undone — ${parts.join(', ')}.`;
}

/**
 * An ObjectId as 16 base64url characters rather than 24 hex ones.
 *
 * Bought purely by the 64-byte cap: hex ids are big enough that a turn storing
 * two facts and scheduling two reminders overflows and loses its button
 * entirely. The same twelve bytes, spelled shorter.
 */
function pack(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64url');
}

function unpack(packed: string): string | null {
  const bytes = Buffer.from(packed, 'base64url');
  // Anything else was not minted here — an old button, or a hand-made payload.
  return bytes.length === 12 ? bytes.toString('hex') : null;
}

function split(field: string): string[] {
  return field
    .split(LIST)
    .map((id) => id.trim())
    .filter((id) => id !== '');
}
