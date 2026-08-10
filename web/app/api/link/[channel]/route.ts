import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isChannel, linkStatus, mintLink } from "@/lib/linking";

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

  const result = await mintLink(resolved.channel, resolved.user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { ok, ...handshake } = result;
  void ok;
  return NextResponse.json(handshake);
}
