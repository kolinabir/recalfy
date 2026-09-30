/**
 * Hides a credential in the *preview* of an inline result.
 *
 * The inline dropdown opens on top of whatever chat you are in, in a café or
 * on a train, and it is the one place memory appears without being asked for.
 * A password sitting in that list is readable by anyone glancing over — and
 * unlike the message you send on purpose, you never chose to show it.
 *
 * This only ever rewrites the title Telegram draws. The text that is sent when
 * a result is tapped comes from a different field and is always the fact as
 * stored — masking what gets sent would make the feature useless for exactly
 * the facts people reach for most.
 *
 * ⚠️ Copied verbatim in `web/lib/mask-secret.ts`, which masks the same facts on
 * the dashboard. Separate packages, so no import is possible; change one and
 * change the other, or `test/mask-secret-parity.test.ts` fails.
 */

/**
 * Words that mean "what follows is a credential". Deliberately narrow: a bare
 * "key" is in "the spare key is with the neighbour in flat 4B", which is an
 * address, not a secret, and masking it would hide the only useful half of the
 * line. Every entry here is a word that is not worth reading aloud.
 */
export const CREDENTIAL =
  /\b(?:passwords?|passcodes?|passphrases?|pins?|otps?|cvv|one[- ]time[- ](?:codes?|passwords?)|(?:api|secret|access|private|licen[cs]e|product|recovery|encryption)[- ]?keys?|(?:recovery|door|gate|alarm|lock|locker|safe|garage|building|entry|entrance|keypad|security|wi-?fi|verification|backup|2fa|login)[- ]?codes?|seed[- ]phrases?|secrets?)\b/i;

/**
 * What separates the label from the value. `is`/`are` because the assistant
 * stores facts as sentences; the punctuation because people paste
 * "Wifi password: hunter2" verbatim and it is stored the way they wrote it.
 */
const SEPARATOR = /(?:\s+(?:is|are)\s+|\s*[:=]\s*)/gi;

/** Fixed width: a mask that matched the real length would leak it. */
export const MASK = '••••••••';

export function maskSecret(text: string): string {
  const credential = CREDENTIAL.exec(text);
  if (!credential) return text;

  // The *first* separator after the credential word, not the last one in the
  // sentence. "Netflix password is hunter2 and the login is kolin@…" has two,
  // and masking the later one would hide the email and print the password.
  SEPARATOR.lastIndex = credential.index + credential[0].length;
  const separator = SEPARATOR.exec(text);
  SEPARATOR.lastIndex = 0;
  if (!separator) return text;

  const cut = separator.index + separator[0].length;
  const value = text.slice(cut);
  if (!value.trim()) return text;

  // Keep the full stop. Losing it makes the line read as truncated, which
  // invites a second look at exactly the result we are trying to make boring.
  const stop = /[.!?]$/.test(value) ? value.slice(-1) : '';
  return `${text.slice(0, cut)}${MASK}${stop}`;
}

/** Whether this text has anything worth hiding once you have finished reading it. */
export function hasSecret(text: string): boolean {
  return maskSecret(text) !== text;
}
