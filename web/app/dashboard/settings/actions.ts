"use server";

import type { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

import { getViewer } from "@/lib/dashboard-data";
import { db } from "@/lib/mongo";

/**
 * The one place the site writes to a collection the bot owns.
 *
 * Everything else in the dashboard reads — see the note at the top of
 * dashboard-data.ts — so this stays a set of plain booleans on the viewer's
 * own document. Each one is read by the bot at the moment it matters and
 * nowhere else.
 */

/** Answer `@recalfy_bot …` inside other people's chats. Opt-out. */
export async function setInlineResults(enabled: boolean) {
  return setFlag("inline", enabled);
}

/** Show the reply as it is written. Opt-in — see the note in settings/page. */
export async function setStreaming(enabled: boolean) {
  return setFlag("streaming", enabled);
}

/** Mirror each memory group into its own topic in the chat. Opt-in. */
export async function setTopics(enabled: boolean) {
  return setFlag("topics", enabled);
}

type Flag = "inline" | "streaming" | "topics";

async function setFlag(
  flag: Flag,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // The action is a POST endpoint of its own: whoever rendered the page is
  // irrelevant, and the id must come from the session rather than the caller.
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in again to change this." };

  const result = await db.collection("users").updateOne(
    // Keyed by the account id as a plain string, like the rest of `users`.
    { _id: viewer.id as unknown as ObjectId },
    { $set: { [flag]: enabled } },
  );

  // No upsert: the bot creates this document on first contact and fills it
  // with $setOnInsert. Writing a half-formed one here would mean it never
  // gets a timezone or a sid counter, and the failure would surface days
  // later as a reminder that never fires.
  if (result.matchedCount === 0) {
    return {
      ok: false,
      error: "Say something to the bot first, then try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true };
}
