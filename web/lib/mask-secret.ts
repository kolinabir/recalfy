/**
 * Hides a credential in a list of memories.
 *
 * A dashboard is read in the places a laptop gets opened — a desk someone
 * walks past, a café, a shared screen — and unlike the fact you went looking
 * for, everything else on the page is showing itself without being asked.
 * So the list masks, and revealing is a deliberate press.
 *
 * ⚠️ This is a copy of `src/telegram/mask-secret.ts`, which does the same job
 * for the inline dropdown. The two are separate npm packages and the web app
 * deploys from `web/` alone, so it cannot import across — but the rule has to
 * be the same rule, or a fact masked in Telegram would sit in the clear here.
 * `test/mask-secret-parity.test.ts` fails if the two ever disagree.
 */

/**
 * Words that mean "what follows is a credential". Deliberately narrow: a bare
 * "key" is in "the spare key is with the neighbour in flat 4B", which is an
 * address, not a secret, and masking it would hide the only useful half of the
 * line. Every entry here is a word that is not worth reading aloud.
 */
const CREDENTIAL =
  /\b(?:passwords?|passcodes?|passphrases?|pins?|otps?|cvv|one[- ]time[- ](?:codes?|passwords?)|(?:api|secret|access|private|licen[cs]e|product|recovery|encryption)[- ]?keys?|recovery[- ]codes?|seed[- ]phrases?|secrets?)\b/i;

/**
 * What separates the label from the value. `is`/`are` because the assistant
 * stores facts as sentences; the punctuation because people paste
 * "Wifi password: hunter2" verbatim and it is stored the way they wrote it.
 */
const SEPARATOR = /(?:\s+(?:is|are)\s+|\s*[:=]\s*)/gi;

/** Fixed width: a mask that matched the real length would leak it. */
const MASK = "••••••••";

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
  // invites a second look at exactly the row we are trying to make boring.
  const stop = /[.!?]$/.test(value) ? value.slice(-1) : "";
  return `${text.slice(0, cut)}${MASK}${stop}`;
}

/** Whether this fact has anything worth hiding — i.e. whether to draw the eye. */
export function hasSecret(text: string): boolean {
  return maskSecret(text) !== text;
}
