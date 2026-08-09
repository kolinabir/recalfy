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

/**
 * "Remind me N days before X": the model resolves X, code does the
 * subtraction — date arithmetic is exactly the kind of thing it gets subtly
 * wrong. The lead is wall-clock days in the user's zone, so a reminder "2
 * days before" a 6pm event fires at 6pm.
 */
export function resolveLeadTime(
  eventIso: string,
  leadDays: number,
  timezone: string,
  now: Date,
): Resolution {
  const event = DateTime.fromISO(eventIso, { zone: timezone });
  if (!event.isValid) {
    return { ok: false, reason: `"${eventIso}" is not a valid ISO-8601 instant.` };
  }

  const at = event.minus({ days: leadDays });
  if (at.toMillis() <= now.getTime()) {
    return {
      ok: false,
      reason: `${leadDays} day(s) before ${describe(event)} is ${describe(at)}, which is in the past.`,
    };
  }

  return {
    ok: true,
    at: at.toJSDate(),
    spoken: `${describe(at)} (${leadDays} day${leadDays === 1 ? '' : 's'} before ${describe(event)})`,
  };
}

/** How a resolved time is echoed back, so a misparse is visible immediately. */
export function describeInstant(at: Date, timezone: string): string {
  return describe(DateTime.fromJSDate(at, { zone: timezone }));
}

function describe(when: DateTime): string {
  return when.toFormat("EEE d LLL yyyy 'at' h:mm a");
}
