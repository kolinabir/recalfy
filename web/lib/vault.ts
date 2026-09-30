import { createDecipheriv } from "node:crypto";

/**
 * Opens facts the bot sealed because they held a credential. The row's
 * `text` is then the masked form and `sealed` the encrypted original; the
 * dashboard is one of the places the original is shown, behind the eye.
 *
 * ⚠️ A copy of `openSealed` in `src/memory/vault.ts`. The bot and the web app
 * are separate builds, so neither can import the other —
 * `test/vault.test.ts` checks this one opens what that one seals.
 *
 * Server-side by construction — `node:crypto` and a secret from the
 * environment — and imported only from dashboard-data.ts, which is marked
 * server-only. Not marked itself, so the parity test can load it in plain Node.
 *
 * Needs the bot's `MEMORY_ENCRYPTION_KEY`. Without it, sealed rows show
 * their masked text: nothing breaks, the value just stays hidden here.
 */

export function openSealed(key: Buffer, owner: string, sealed: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || data === undefined) {
    throw new Error("Unrecognised sealed value.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(owner, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** The text a person should see for a stored row, opened when it can be. */
export function revealText(row: Record<string, unknown>): string {
  const text = String(row.text);
  const key = vaultKey();
  if (typeof row.sealed !== "string" || !key) return text;
  try {
    return openSealed(key, String(row.userId), row.sealed);
  } catch {
    return text;
  }
}

function vaultKey(): Buffer | null {
  const raw = process.env.MEMORY_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}
