import { DateTime } from 'luxon';

const MAX_HORIZON_YEARS = 5;

export type Resolution =
  | { ok: true; at: Date; spoken: string }
  | { ok: false; reason: string };

/**
 * Turns the model's claimed instant into a trusted one.
 *
 * The model is told `now` and the user's zone and asked for an absolute
 * ISO-8601 instant — but a misparse must never become a silently wrong
 * reminder, so every answer is re-checked here before it can be stored.
 */
export function resolveWhen(iso: string, timezone: string, now: Date): Resolution {
  const parsed = DateTime.fromISO(iso, { zone: timezone });
  if (!parsed.isValid) {
    return { ok: false, reason: `"${iso}" is not a valid ISO-8601 instant.` };
  }

  const at = parsed.toJSDate();
  if (at.getTime() <= now.getTime()) {
    return { ok: false, reason: `${describe(parsed)} is in the past.` };
  }

  const horizon = DateTime.fromJSDate(now).plus({ years: MAX_HORIZON_YEARS });
  if (parsed > horizon) {
    return { ok: false, reason: `${describe(parsed)} is more than ${MAX_HORIZON_YEARS} years away.` };
  }

  return { ok: true, at, spoken: describe(parsed) };
}

/** How a resolved time is echoed back, so a misparse is visible immediately. */
export function describeInstant(at: Date, timezone: string): string {
  return describe(DateTime.fromJSDate(at, { zone: timezone }));
}

function describe(when: DateTime): string {
  return when.toFormat("EEE d LLL yyyy 'at' h:mm a");
}
