import "server-only";

import { headers } from "next/headers";

/**
 * Where the visitor is, if the edge told us. Used only to ask Paddle for the
 * right currency — we never localize anything ourselves.
 *
 * Returning `undefined` is a real answer, not a failure: with no country,
 * Paddle.js geolocates from the visitor's IP, which is better than a guess.
 * There is deliberately no "OTHERS"-style sentinel — Paddle would reject it
 * as an invalid country code and the whole price preview would fail.
 */
export async function visitorCountry(): Promise<string | undefined> {
  const list = await headers();

  const candidate =
    // Vercel, where the marketing site runs.
    list.get("x-vercel-ip-country") ??
    // Cloudflare, if it ever sits in front.
    list.get("cf-ipcountry") ??
    null;

  if (!candidate) return undefined;

  // Cloudflare sends "XX" for anonymised clients and "T1" for Tor.
  const code = candidate.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") {
    return undefined;
  }
  return code;
}
