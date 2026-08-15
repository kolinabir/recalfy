/**
 * Turns a shared map pin into the sentence the rest of the app already knows
 * how to handle.
 *
 * The whole feature rests on this one idea: a location becomes *text* at the
 * edge, and nothing downstream learns that pins exist. The brain stores it as
 * an ordinary fact with an ordinary short id, `forget` and supersession work
 * on it unchanged, and it exports as a line of markdown like everything else.
 *
 * It also means the answer needs no new plumbing on the way out. A maps URL
 * inside the fact is something Telegram renders as a tappable place by itself,
 * so "where did I park?" is answered through the same text send as every other
 * question — no `sendLocation`, no second outbound path, and nothing that has
 * to be mirrored for WhatsApp later.
 */

/** The shape Telegram gives us. Declared here so nothing else imports grammY. */
export interface SharedLocation {
  latitude: number;
  longitude: number;
}

export interface SharedVenue {
  title?: string;
  address?: string;
}

/** Six decimals is a little over 10cm — far past what a phone GPS knows. */
const PRECISION = 6;

/**
 * The prefix the system prompt keys on. Kept as an exported constant so the
 * rule in the prompt and the text that triggers it cannot drift apart.
 */
export const LOCATION_PREFIX = 'Shared a location:';

export function describeSharedLocation(
  location: SharedLocation,
  venue?: SharedVenue,
): string {
  const name = [venue?.title, venue?.address]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');

  const url = mapsUrl(location);
  return name ? `${LOCATION_PREFIX} ${name} — ${url}` : `${LOCATION_PREFIX} ${url}`;
}

/**
 * A plain `?q=lat,lng` search URL rather than a Google-specific place link:
 * every phone offers to open it in whichever map app it actually has, and it
 * still reads as coordinates to a human squinting at the exported markdown.
 */
export function mapsUrl({ latitude, longitude }: SharedLocation): string {
  return `https://www.google.com/maps?q=${latitude.toFixed(PRECISION)},${longitude.toFixed(PRECISION)}`;
}
