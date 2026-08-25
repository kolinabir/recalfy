import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { minutesUntilRelink } from "@/lib/disconnect";
import { Channel, isChannel } from "@/lib/linking";
import { db } from "@/lib/mongo";
import { isChannelAvailable } from "@/lib/channels";
import { channelVerdict } from "@/lib/paddle/plan";
import { normalisePairingCode } from "@/lib/pairing-code";

export const runtime = "nodejs";

/**
 * Wrong guesses a single code tolerates before it dies. The cap is on the
 * code, not the guesser: rotating accounts is easy, so throttling per actor
 * would not bound the attack — burning the target does.
 */
const MAX_ATTEMPTS = 5;

export async function POST(request: Request, params: { params: Promise<{ channel: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { channel } = await params.params;
  // A switched-off channel is indistinguishable from one that never existed.
  // This route writes the link itself, so it has to refuse independently of
  // mintLink — a pairing code must not be a way in around the UI.
  if (!isChannel(channel) || !isChannelAvailable(channel)) {
    return NextResponse.json({ error: "unknown-channel" }, { status: 404 });
  }

  // The other half of the paywall. This route writes the channel link itself
  // rather than going through mintLink, so gating that one alone would leave
  // the pairing code as a way in — including as a way past the Telegram-only
  // rule on Keep. Checked before the code is claimed, so a refused attempt
  // never burns a valid code.
  const verdict = await channelVerdict(session.user.id, channel);
  if (verdict !== "ok") {
    const status = verdict === "payment-required" ? 402 : 403;
    return NextResponse.json({ error: verdict }, { status });
  }

  // Checked here as well as in mintLink: this route writes the link itself,
  // so the lock has to be read on every path that can attach a chat.
  const locked = await minutesUntilRelink(session.user.id);
  if (locked > 0) {
    return NextResponse.json({ error: "locked", minutes: locked }, { status: 423 });
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
    { projection: { [`channels.${channel}`]: 1 } },
  );
  if (already?.channels?.[channel]) {
    return NextResponse.json({ error: "already-linked" }, { status: 409 });
  }

  // Single-use, unexpired, under the attempt cap, and issued on the channel
  // being connected — claimed in one write so two submissions racing each
  // other cannot both win.
  const claimed = await codes.findOneAndUpdate(
    {
      _id: code as never,
      channel,
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

  const handle = claimed.handle as string;

  // Refuse to move an existing link rather than silently repointing it.
  const taken = await users.findOne(
    { [`channels.${channel}.handle`]: handle },
    { projection: { _id: 1 } },
  );
  if (taken) {
    return NextResponse.json({ error: "chat-taken" }, { status: 409 });
  }

  const linked = await users.findOneAndUpdate(
    {
      _id: new ObjectId(session.user.id),
      [`channels.${channel}`]: { $exists: false },
    },
    { $set: { [`channels.${channel}`]: { handle, linkedAt: new Date() } } },
    { returnDocument: "after" },
  );

  if (!linked) {
    return NextResponse.json({ error: "already-linked" }, { status: 409 });
  }

  // The in-chat confirmation is the backstop for every linking path: whoever
  // holds the chat account finds out which email now reads it, even if they
  // were talked into the handshake.
  await notify(channel, handle, session.user.email);

  return NextResponse.json({ linked: true });
}

const CONFIRMATION = (email: string, unlink: string) =>
  `Connected to ${email}.\n\n` +
  `Tell me anything you'd rather not hold in your head. If this wasn't you, send ${unlink}.`;

async function notify(channel: Channel, handle: string, email: string): Promise<void> {
  try {
    if (channel === "telegram") {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: handle, text: CONFIRMATION(email, "/unlink") }),
      });
      return;
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) return;

    const version = process.env.GRAPH_API_VERSION ?? "v23.0";
    await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: handle,
        type: "text",
        text: { preview_url: false, body: CONFIRMATION(email, '"unlink"') },
      }),
    });
  } catch {
    // The link is already committed; a failed courtesy message must not undo
    // it or fail the request.
  }
}
