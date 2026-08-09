import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/mongo";

export const runtime = "nodejs";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

/** Long enough to walk to another device, short enough that a leak goes stale. */
const TTL_MS = 10 * 60 * 1000;

/** One live token per account at a time; asking again replaces the old one. */
const MINT_COOLDOWN_MS = 2000;

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Poll target for the dashboard while the person is off pressing Start. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const doc = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) }, { projection: { telegramUserId: 1 } });

  return NextResponse.json({ linked: typeof doc?.telegramUserId === "number" });
}

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (!BOT_USERNAME) {
    return NextResponse.json({ error: "bot-not-configured" }, { status: 500 });
  }

  const users = db.collection("user");
  const current = await users.findOne(
    { _id: new ObjectId(user.id) },
    { projection: { telegramUserId: 1 } },
  );

  if (typeof current?.telegramUserId === "number") {
    return NextResponse.json({ error: "already-linked" }, { status: 409 });
  }

  const tokens = db.collection("linkTokens");

  // Cheap flood guard: a fresh token per click is fine, a thousand is not.
  const recent = await tokens.findOne(
    { webUserId: user.id, createdAt: { $gt: new Date(Date.now() - MINT_COOLDOWN_MS) } },
    { sort: { createdAt: -1 } },
  );
  if (recent) {
    return NextResponse.json({ url: linkFor(String(recent._id)) });
  }

  // Any outstanding token becomes dead the moment a new one is asked for, so
  // a link left open in an old tab can't be redeemed later.
  await tokens.deleteMany({ webUserId: user.id, consumedAt: { $exists: false } });

  // 32 bytes → 43 base64url chars, inside Telegram's 64-char start payload cap.
  const token = randomBytes(32).toString("base64url");
  const now = new Date();

  await tokens.insertOne({
    _id: token,
    webUserId: user.id,
    webUserEmail: user.email,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
  } as never);

  return NextResponse.json({ url: linkFor(token) });
}

function linkFor(token: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${token}`;
}
