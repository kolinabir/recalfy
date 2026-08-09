/**
 * Crockford base32, mirroring src/telegram/pairing-code.ts on the bot side.
 * The two services build separately, so the alphabet is stated in both rather
 * than shared through a package — if you change one, change the other.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 8;

/**
 * Accepts what a person actually types: any casing, any spacing or dashes,
 * and Crockford's substitutions — O for zero, I or L for one. Returns null
 * when the shape is wrong, so a malformed guess never reaches the database.
 */
export function normalisePairingCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");

  if (cleaned.length !== LENGTH) return null;
  for (const char of cleaned) {
    if (!ALPHABET.includes(char)) return null;
  }
  return cleaned;
}
