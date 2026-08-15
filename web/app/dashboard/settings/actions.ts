"use server";

import type { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

import { getViewer } from "@/lib/dashboard-data";
import { db } from "@/lib/mongo";

/**
 * The one place the site writes to a collection the bot owns.
 *
 * Everything else in the dashboard reads — see the note at the top of
 * dashboard-data.ts — and this stays a single boolean on the viewer's own
 * document for that reason. The bot reads it on every inline query.
 */
export async function setInlineResults(
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // The action is a POST endpoint of its own: whoever rendered the page is
  // irrelevant, and the id must come from the session rather than the caller.
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in again to change this." };

  const result = await db.collection("users").updateOne(
    // Keyed by the account id as a plain string, like the rest of `users`.
    { _id: viewer.id as unknown as ObjectId },
    { $set: { inline: enabled } },
  );

  // No upsert: the bot creates this document on first contact and fills it
  // with $setOnInsert. Writing a half-formed one here would mean it never
  // gets a timezone or a sid counter, and the failure would surface days
  // later as a reminder that never fires.
  if (result.matchedCount === 0) {
    return { ok: false, error: "Say something to the bot first, then try again." };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true };
}
