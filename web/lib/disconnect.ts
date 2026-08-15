import "server-only";

import { ObjectId } from "mongodb";

import { CHANNELS, type Channel } from "@/lib/linking";
import { db } from "@/lib/mongo";

/**
 * Taking a chat away from an account, in two strengths.
 *
 * `disconnectChannel` is the ordinary one: you are done with WhatsApp, or you
 * want to move Telegram to a different account. `lockDownAccount` is the one
 * you reach for when a device is gone — every chat at once, plus the things
 * that stay dangerous after the chat is detached.
 *
 * Neither touches a single memory. Facts belong to the account, not to the
 * chat they arrived through, and someone locking down a stolen phone is not
 * asking to lose the eleven things they told the bot last month. Deleting is
 * a separate, deliberate act with its own screen.
 */

/**
 * How long nothing may re-attach after a lock-down. Kept in step with
 * `src/channels/relink-lock.ts`, which is what enforces it on the bot side.
 */
export const RELINK_LOCK_MS = 15 * 60 * 1000;

/** Where a chat was reachable, so the caller can say goodbye to it. */
export type DetachedHandle = { channel: Channel; handle: string };

export async function disconnectChannel(
  userId: string,
  channel: Channel,
): Promise<DetachedHandle | null> {
  const handle = await detach(userId, channel);
  if (!handle) return null;

  await Promise.all([burnLinkTokens(userId, channel), burnPairingCodes(channel, handle)]);
  return { channel, handle };
}

/**
 * Everything at once: both chats off, inline answers off, and a pause before
 * anything may re-attach.
 *
 * Inline mode is in here because it is the one feature that reads this memory
 * out inside chats we never see. Leaving it on while treating the account as
 * compromised would be answering the attacker's questions politely.
 *
 * Session revocation is *not* here. It needs the request's headers, so it
 * belongs to the action; this module is about what the account looks like
 * afterwards, and stays callable from anywhere.
 */
export async function lockDownAccount(userId: string): Promise<DetachedHandle[]> {
  const detached: DetachedHandle[] = [];

  for (const channel of CHANNELS) {
    const gone = await disconnectChannel(userId, channel);
    if (gone) detached.push(gone);
  }

  await Promise.all([holdRelinking(userId), silenceInlineAnswers(userId)]);
  return detached;
}

function holdRelinking(userId: string) {
  return accounts().updateOne(
    { _id: new ObjectId(userId) },
    { $set: { relinkLockedUntil: new Date(Date.now() + RELINK_LOCK_MS) } },
  );
}

/** The bot keys its own collection by the account id as a plain string. */
function silenceInlineAnswers(userId: string) {
  return db
    .collection("users")
    .updateOne({ _id: userId as unknown as ObjectId }, { $set: { inline: false } });
}

/**
 * Whole minutes before a chat may attach to this account again, or 0.
 *
 * Every path that links a chat asks this: the deep link, the pairing code, and
 * the bot's own redeem. A lock that only one of the three respected would be a
 * lock with a door next to it.
 */
export async function minutesUntilRelink(userId: string): Promise<number> {
  const account = await accounts().findOne(
    { _id: new ObjectId(userId) },
    { projection: { relinkLockedUntil: 1 } },
  );

  const remaining = (account?.relinkLockedUntil?.getTime() ?? 0) - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 60_000) : 0;
}

/** Removes the link and returns where it pointed, or null if there was none. */
async function detach(userId: string, channel: Channel): Promise<string | null> {
  const before = await accounts().findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $unset: { [`channels.${channel}`]: "" } },
    { returnDocument: "before" },
  );

  return before?.channels?.[channel]?.handle ?? null;
}

/**
 * A link token minted before the disconnect is still redeemable afterwards —
 * it is a bearer credential with a ten-minute life, and the whole point of
 * the button is that ten minutes is too long.
 */
function burnLinkTokens(userId: string, channel: Channel) {
  return db.collection("linkTokens").deleteMany({ webUserId: userId, channel });
}

/** The same argument, for the manual code the chat can ask for. */
function burnPairingCodes(channel: Channel, handle: string) {
  return db.collection("pairingCodes").deleteMany({ channel, handle });
}

function accounts() {
  return db.collection<{
    _id: ObjectId;
    channels?: Partial<Record<Channel, { handle: string }>>;
    relinkLockedUntil?: Date;
  }>("user");
}
