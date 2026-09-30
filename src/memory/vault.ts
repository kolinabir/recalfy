import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { CREDENTIAL, MASK } from '../telegram/mask-secret';

/**
 * Keeps credentials out of plain sight: out of the database, out of backups,
 * and — the part that matters most — out of every prompt after the one that
 * delivered them.
 *
 * A row holding a credential is stored twice over. `text` is the masked form
 * ("Wifi password is ••••••••.") and is what every model-facing path reads,
 * so the memory document, the conversation window, history search and
 * provenance never carry the value without having to know this exists.
 * `sealed` is the whole original, AES-256-GCM encrypted, and is opened only
 * on the way to the person: inline results, the topic tabs, exports, the
 * dashboard, and `reveal_secret`.
 *
 * Detection uses the same credential words as `maskSecret`, the dashboard's
 * masking, but is stricter about what counts as a value. Display masking can
 * afford to over-hide; this cannot, because a masked message is what the
 * model reads on every later turn — "what's my password? also the plumber is
 * coming at 5" must not come back as "the plumber is ••••••••". So the "is"
 * or ":" has to follow the credential word closely, in the same clause, and
 * the value cannot be a word like "saved".
 *
 * Best-effort by design: "gate code 4455" has no credential word and stays
 * plain. A miss costs what the old behaviour cost; a false positive costs a
 * masked phrase that can still be revealed.
 *
 * ⚠️ `openSealed` is copied in `web/lib/vault.ts`, because the dashboard reads
 * these rows directly. `test/vault.test.ts` holds the two together.
 */

/** Bumped if the format ever changes; old rows keep opening under their own. */
const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
export const KEY_BYTES = 32;

/** Masks every credential in a text, one line at a time. */
export function maskCredentials(text: string): string {
  return text
    .split('\n')
    .map((line) => maskLine(line))
    .join('\n');
}

/**
 * Between the credential word and its "is": a few words and nothing else —
 * "password for my gmail is…" — so a separator in a later clause is not
 * mistaken for this one. Punctuation ends the clause.
 */
const NEAR_SEPARATOR = /^((?:\s+[\p{L}\p{N}'’-]+){0,4}?)(\s+(?:is|are)\s+|\s*[:=]\s*)/iu;

/** Words that follow "password is" without being one. */
const NOT_A_VALUE = new Set([
  'saved', 'stored', 'noted', 'safe', 'hidden', 'set', 'changed', 'updated', 'correct',
  'wrong', 'incorrect', 'required', 'needed', 'missing', 'expired', 'not', 'the', 'still',
  'now', 'too', 'also', 'here', 'there', 'below', 'above', 'same', 'different', 'fine',
]);

/**
 * From the first credential with a value, to the end of the line, becomes the
 * mask — the same shape `maskSecret` draws, so a later credential on the
 * line ("…and the gmail one is…") is covered by the first.
 */
function maskLine(line: string): string {
  const found = findValue(line);
  if (!found) return line;
  // Keep the full stop, as the dashboard does: a line ending mid-air reads
  // as truncated.
  const stop = /[.!?]$/.test(found.value) ? found.value.slice(-1) : '';
  return `${line.slice(0, found.cut)}${MASK}${stop}`;
}

/** Where the first credential value on a line starts, and the rest of the line. */
function findValue(line: string): { cut: number; value: string } | null {
  const pattern = new RegExp(CREDENTIAL.source, 'gi');
  for (let hit = pattern.exec(line); hit; hit = pattern.exec(line)) {
    const after = hit.index + hit[0].length;
    const near = NEAR_SEPARATOR.exec(line.slice(after));
    if (!near) continue;

    const cut = after + near[0].length;
    const value = line.slice(cut);
    const first = value.trim().split(/\s+/, 1)[0]?.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (!first || NOT_A_VALUE.has(first) || value.startsWith(MASK)) continue;
    return { cut, value };
  }
  return null;
}

/** Where a spoken value ends: "hunter2 and remind me at 5" is just "hunter2". */
const VALUE_ENDS = /\s+(?:and|but|then|also|so|because|please|remind|for|to|which|from|since|until)\b/i;

/**
 * The credential values in a message, as literal strings: the whole value
 * phrase, and each piece of it that looks like a secret (has a digit or a
 * symbol). This is how a value stays hidden once the model rewords around
 * it — "text Rafi the locker PIN (5520)" has no "is" to find, but it does
 * have 5520, and 5520 is known to be one.
 */
export function secretValues(text: string): string[] {
  const values = new Set<string>();
  for (const line of text.split('\n')) {
    const found = findValue(line);
    if (!found) continue;
    const phrase = found.value.split(VALUE_ENDS)[0].trim().replace(/[.,;!?)]+$/, '');
    if (phrase.length >= 3) values.add(phrase);
    for (const piece of phrase.split(/[\s,;]+/)) {
      const token = piece.replace(/^[("'“]+|[.,;!?)"'”]+$/g, '');
      if (token.length >= 3 && /[\d\W_]/u.test(token)) values.add(token);
    }
  }
  // Longest first, so a phrase is masked whole before its pieces are.
  return [...values].sort((a, b) => b.length - a.length);
}

/** Masks every standalone occurrence of the given literal values. */
function maskKnown(text: string, known: readonly string[]): string {
  let masked = text;
  for (const value of known) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu'), MASK);
  }
  return masked;
}

/**
 * The same text, split into what may be seen and what must be sealed.
 * `sealed` is absent when there was nothing to hide. `known` are values
 * already identified as secrets this turn — see `secretValues`.
 *
 * The owner is bound in as associated data, so a sealed value copied onto
 * another person's row fails to open rather than leaking across accounts.
 */
export function protect(
  key: Buffer,
  owner: string,
  text: string,
  known: readonly string[] = [],
): { text: string; sealed?: string } {
  const masked = maskKnown(maskCredentials(text), known);
  if (masked === text) return { text };
  return { text: masked, sealed: seal(key, owner, text) };
}

export function seal(key: Buffer, owner: string, plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(owner, 'utf8'));
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), data].map(encode).join('.');
}

/** Throws on a wrong key, a wrong owner, or a tampered value. */
export function openSealed(key: Buffer, owner: string, sealed: string): string {
  const [version, iv, tag, data] = sealed.split('.');
  if (version !== VERSION || !iv || !tag || data === undefined) {
    throw new Error('Unrecognised sealed value.');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(owner, 'utf8'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString(
    'utf8',
  );
}

/** `MEMORY_ENCRYPTION_KEY` → a key, or an error that says what is wrong with it. */
export function parseKey(raw: string): Buffer {
  const key = Buffer.from(raw.trim(), 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `MEMORY_ENCRYPTION_KEY must be ${KEY_BYTES} bytes, base64-encoded ` +
        '(generate one with: openssl rand -base64 32).',
    );
  }
  return key;
}

function encode(part: string | Buffer): string {
  return typeof part === 'string' ? part : part.toString('base64url');
}
