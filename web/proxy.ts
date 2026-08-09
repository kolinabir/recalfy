import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic gate only. Next's docs are explicit that Proxy must not be a
 * session-management layer, and the Mongo driver could not run here regardless
 * — this just avoids rendering the dashboard shell for someone with no cookie
 * at all. `app/dashboard/page.tsx` re-validates the session for real.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
