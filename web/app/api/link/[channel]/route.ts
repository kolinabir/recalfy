import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isChannel, linkStatus, mintLink } from "@/lib/linking";
import { channelVerdict } from "@/lib/paddle/plan";

export const runtime = "nodejs";

type Params = { params: Promise<{ channel: string }> };

async function resolve(request: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { channel } = await request.params;

  if (!session) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  if (!isChannel(channel)) {
    return { error: NextResponse.json({ error: "unknown-channel" }, { status: 404 }) };
  }
  return { user: session.user, channel };
}

/** Poll target for the dashboard while the person is off pressing Start. */
export async function GET(_request: Request, params: Params) {
  const resolved = await resolve(params);
  if (resolved.error) return resolved.error;

  return NextResponse.json({
    linked: await linkStatus(resolved.channel, resolved.user.id),
  });
}

export async function POST(_request: Request, params: Params) {
  const resolved = await resolve(params);
  if (resolved.error) return resolved.error;

  // A link token is the only way to attach a chat to an account, so this is
  // the chokepoint for "you need a plan to use Recalfy" — enforced here rather
  // than in the page, because the page is just a caller and anyone can POST.
  // It answers the tier question too: Keep is Telegram-only.
  const verdict = await channelVerdict(resolved.user.id, resolved.channel);
  if (verdict !== "ok") {
    // 403, not 402: paying more would fix it, but they have already paid, and
    // a payment-required here would send the dashboard to a checkout for a
    // plan they hold.
    const status = verdict === "payment-required" ? 402 : 403;
    return NextResponse.json({ error: verdict }, { status });
  }

  const result = await mintLink(resolved.channel, resolved.user);

  // Both branches forward everything the result carries rather than naming
  // fields. Picking them out by hand is how a failure that had learned to say
  // "another 14 minutes" reached the screen as "another undefined minutes".
  if (!result.ok) {
    const { ok, status, ...failure } = result;
    void ok;
    return NextResponse.json(failure, { status });
  }

  const { ok, ...handshake } = result;
  void ok;
  return NextResponse.json(handshake);
}
