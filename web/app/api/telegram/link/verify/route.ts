import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/mongo";
import { normalisePairingCode } from "@/lib/pairing-code";

export const runtime = "nodejs";

/**
 * Wrong guesses a single code tolerates before it dies. The cap is on the
 * code, not the guesser: rotating accounts is easy, so throttling per actor
 * would not bound the attack — burning the target does.
 */
const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? normalisePairingCode(body.code) : null;

  // Every failure below answers "invalid" with the same shape, so a guesser
  // learns nothing about which codes exist.
  const invalid = () => NextResponse.json({ error: "invalid" }, { status: 400 });

  if (!code) return invalid();

  const users = db.collection("user");
  const codes = db.collection("pairingCodes");

  const already = await users.findOne(
    { _id: new ObjectId(session.user.id) },
    { projection: { telegramUserId: 1 } },
  );
  if (typeof already?.telegramUserId === "number") {
    return NextResponse.json({ error: "already-linked" }, { status: 409 });
  }

  // Single-use, unexpired and under the attempt cap, claimed in one write so
  // two submissions racing each other cannot both win.
  const claimed = await codes.findOneAndUpdate(
    {
      _id: code as never,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_ATTEMPTS },
    },
    { $set: { consumedAt: new Date(), consumedBy: session.user.id } },
    { returnDocument: "after" },
  );

  if (!claimed) {
    // Count the miss against the real code if there is one. Scoped to
    // unconsumed codes so a spent one can't be driven past its cap.
    await codes.updateOne(
      { _id: code as never, consumedAt: { $exists: false } },
      { $inc: { attempts: 1 } },
    );
    return invalid();
  }

  const telegramUserId = claimed.telegramUserId as number;

  // Refuse to move an existing link rather than silently repointing it.
  const taken = await users.findOne({ telegramUserId }, { projection: { _id: 1 } });
  if (taken) {
    return NextResponse.json({ error: "telegram-taken" }, { status: 409 });
  }

  const linked = await users.findOneAndUpdate(
    { _id: new ObjectId(session.user.id), telegramUserId: { $exists: false } },
    { $set: { telegramUserId, telegramLinkedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!linked) {
    return NextResponse.json({ error: "already-linked" }, { status: 409 });
  }

  // The in-chat confirmation is the backstop for every linking path: whoever
  // holds the Telegram account finds out which email now reads it, even if
  // they were talked into the handshake.
  await notify(telegramUserId, session.user.email);

  return NextResponse.json({ linked: true });
}

async function notify(chatId: number, email: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          `Connected to ${email}.\n\n` +
          "Tell me anything you'd rather not hold in your head. If this wasn't you, send /unlink.",
      }),
    });
  } catch {
    // The link is already committed; a failed courtesy message must not undo
    // it or fail the request.
  }
}
