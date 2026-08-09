import { randomBytes } from 'node:crypto';

/**
 * Crockford's base32: no I, L, O or U. The first three are the characters
 * people misread as 1 and 0, and U is omitted so a random code can't spell
 * something unfortunate. 32 symbols divides 256 exactly, so sampling a byte
 * modulo the alphabet length carries no bias.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 8 symbols is 40 bits — far past what an online guesser can reach. */
const LENGTH = 8;

export function generatePairingCode(): string {
  const bytes = randomBytes(LENGTH);
  let code = '';
  for (let i = 0; i < LENGTH; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

/** `K7M2QX9F` → `K7M2-QX9F`. Grouping halves transcription errors. */
export function formatPairingCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Accepts what a person actually types: any casing, any spacing or dashes,
 * and the substitutions Crockford defines — O for zero, I or L for one.
 * Returns null when the result isn't a well-formed code, so the caller can
 * reject it without touching the database.
 */
export function normalisePairingCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');

  if (cleaned.length !== LENGTH) return null;
  for (const char of cleaned) {
    if (!ALPHABET.includes(char)) return null;
  }
  return cleaned;
}
