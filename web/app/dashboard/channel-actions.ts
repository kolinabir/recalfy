"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getViewer } from "@/lib/dashboard-data";
import { disconnectChannel, lockDownAccount } from "@/lib/disconnect";
import { sayGoodbye } from "@/lib/farewell";
import { isChannel } from "@/lib/linking";

/**
 * The two disconnects, as the buttons on the channel pages call them.
 *
 * Both re-derive who is asking from the session. A server action is a POST
 * endpoint like any other — whoever rendered the page is not evidence of
 * anything, and an account id from the caller would be an invitation.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const SIGNED_OUT = "Sign in again to do that.";

/** One chat detached. Memories, reminders and the other channel are untouched. */
export async function disconnect(channel: string): Promise<ActionResult> {
  if (!isChannel(channel)) return { ok: false, error: "Unknown chat app." };

  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGNED_OUT };

  const detached = await disconnectChannel(viewer.id, channel);
  if (detached) await sayGoodbye(detached);

  revalidatePath(`/dashboard/${channel}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * The one for a phone that is gone: every chat off, inline answers off, a
 * pause before anything may re-attach, and every session ended — including
 * this one, which is why the caller navigates to the login page afterwards
 * rather than waiting for a revalidate that will not arrive.
 *
 * Sessions go last. If revocation fails we have still detached the chats,
 * which is the half that matters; doing it first risks signing the person out
 * of the request that was about to protect them.
 */
export async function lockDown(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: SIGNED_OUT };

  const detached = await lockDownAccount(viewer.id);
  await Promise.all(detached.map(sayGoodbye));

  await auth.api.revokeSessions({ headers: await headers() });
  return { ok: true };
}
