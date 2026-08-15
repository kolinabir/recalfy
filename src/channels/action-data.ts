/**
 * The payload that rides on a button and comes back when it is pressed.
 *
 * Telegram caps callback data at 64 *bytes*, and silently refuses the whole
 * keyboard when a button exceeds it — so the limit is enforced here, at the
 * point of minting, rather than discovered as a missing button in production.
 *
 * The data is never trusted on the way back. It names a row; who may act on
 * that row is decided from the linked account, not from anything in here.
 */

export const ACTION_DATA_LIMIT = 64;

const SEPARATOR = ':';

export interface ParsedAction {
  kind: string;
  parts: string[];
}

/** Null when the parts would overflow Telegram's limit — draw no button then. */
export function encodeAction(kind: string, ...parts: string[]): string | null {
  if (kind.includes(SEPARATOR)) throw new Error(`Action kind must not contain "${SEPARATOR}"`);

  const data = [kind, ...parts].join(SEPARATOR);
  return Buffer.byteLength(data, 'utf8') <= ACTION_DATA_LIMIT ? data : null;
}

/**
 * Null for anything this build did not mint. Old buttons outlive deploys —
 * a keyboard sent last week is still tappable — so an unknown shape has to be
 * an ordinary "no", never a crash.
 */
export function parseAction(data: string): ParsedAction | null {
  const [kind, ...parts] = data.split(SEPARATOR);
  if (!kind) return null;
  return { kind, parts };
}
