import "server-only";

import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import QRCode from "qrcode";

import { db } from "@/lib/mongo";

export const CHANNELS = ["telegram", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];

export function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

/** Long enough to walk to another device, short enough that a leak goes stale. */
const TTL_MS = 10 * 60 * 1000;

/** One live token per account at a time; asking again replaces the old one. */
const MINT_COOLDOWN_MS = 2000;

export type MintResult =
  | { ok: true; url: string; qr: string; expiresAt: string }
  | { ok: false; error: "already-linked" | "channel-not-configured"; status: number };

/**
 * Mints a one-time token and wraps it in whatever link the channel needs.
 *
 * The two channels carry the payload differently. Telegram has a real deep
 * link — `?start=<token>` arrives as the first message. WhatsApp has no such
 * thing, so the link only pre-fills the message box and the person still has
 * to press send; the adapter matches on `connect <token>` for exactly that
 * reason.
 */
export async function mintLink(
  channel: Channel,
  user: { id: string; email: string },
): Promise<MintResult> {
  const target = chatTarget(channel);
  if (!target) return { ok: false, error: "channel-not-configured", status: 500 };

  const users = db.collection("user");
  const current = await users.findOne(
    { _id: new ObjectId(user.id) },
    { projection: { [`channels.${channel}`]: 1 } },
  );

  if (current?.channels?.[channel]) {
    return { ok: false, error: "already-linked", status: 409 };
  }

  const tokens = db.collection("linkTokens");

  // Cheap flood guard: a fresh token per click is fine, a thousand is not.
  const recent = await tokens.findOne(
    {
      webUserId: user.id,
      channel,
      createdAt: { $gt: new Date(Date.now() - MINT_COOLDOWN_MS) },
    },
    { sort: { createdAt: -1 } },
  );
  if (recent) {
    return handshake(channel, String(recent._id), recent.expiresAt as Date);
  }

  // Any outstanding token for this channel dies the moment a new one is asked
  // for, so a link left open in an old tab can't be redeemed later. Scoped to
  // the channel: connecting WhatsApp must not invalidate a Telegram link the
  // person is halfway through.
  await tokens.deleteMany({ webUserId: user.id, channel, consumedAt: { $exists: false } });

  // 32 bytes → 43 base64url chars, inside Telegram's 64-char start payload cap.
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS);

  await tokens.insertOne({
    _id: token,
    webUserId: user.id,
    webUserEmail: user.email,
    channel,
    createdAt: now,
    expiresAt,
  } as never);

  return handshake(channel, token, expiresAt);
}

/** Whether this account already has a chat connected on a channel. */
export async function linkStatus(channel: Channel, userId: string): Promise<boolean> {
  const doc = await db
    .collection("user")
    .findOne({ _id: new ObjectId(userId) }, { projection: { [`channels.${channel}`]: 1 } });

  return Boolean(doc?.channels?.[channel]);
}

/**
 * The QR is rendered here rather than in the browser so the encoder stays out
 * of the client bundle — the page only ever receives finished markup.
 */
async function handshake(
  channel: Channel,
  token: string,
  expiresAt: Date,
): Promise<MintResult> {
  const url = linkFor(channel, token);

  const qr = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    // Rendered onto a light plate: a phone scanner wants real contrast, and
    // inheriting a dark surface would break it.
    color: { dark: "#000000", light: "#ffffff" },
  });

  return { ok: true, url, qr, expiresAt: expiresAt.toISOString() };
}

/** The bot's own address on this channel, from the environment. */
function chatTarget(channel: Channel): string | undefined {
  return channel === "telegram"
    ? process.env.TELEGRAM_BOT_USERNAME
    : process.env.WHATSAPP_BUSINESS_NUMBER;
}

function linkFor(channel: Channel, token: string): string {
  const target = chatTarget(channel)!;

  return channel === "telegram"
    ? `https://t.me/${target}?start=${token}`
    : `https://wa.me/${target}?text=${encodeURIComponent(`connect ${token}`)}`;
}
