import { DateTime } from 'luxon';

import { QuietHours } from '../mongo/collections';

/**
 * When a reminder due at `at` may actually be delivered, or null if now is
 * fine.
 *
 * Pure, and the whole of the quiet-hours rule: everything else in the feature
 * is plumbing. Wall-clock arithmetic in the user's own zone, because "nothing
 * after 10pm" means ten at night wherever they are, across a DST change and
 * across the year.
 */
export function deferredUntil(
  at: Date,
  quiet: QuietHours | undefined,
  tz: string,
): Date | null {
  if (!quiet || !isInside(at, quiet, tz)) return null;

  const local = DateTime.fromJSDate(at, { zone: tz });
  const ends = local.set({ hour: quiet.to, minute: 0, second: 0, millisecond: 0 });

  // A window that wraps midnight ends *tomorrow* — 22:00–08:00 caught at 23:30
  // resolves to 08:00 the next morning, not the 08:00 that already passed.
  return (ends <= local ? ends.plus({ days: 1 }) : ends).toJSDate();
}

/**
 * Whether an instant falls in the quiet window.
 *
 * `from === to` is treated as no window at all rather than as silence for a
 * full day. The tool refuses to store one, but a hand-edited document must not
 * be able to mute someone permanently.
 */
export function isInside(at: Date, quiet: QuietHours, tz: string): boolean {
  const hour = DateTime.fromJSDate(at, { zone: tz }).hour;
  if (quiet.from === quiet.to) return false;

  return quiet.from < quiet.to
    ? hour >= quiet.from && hour < quiet.to
    : // Wrapping midnight: late enough yesterday, or early enough today.
      hour >= quiet.from || hour < quiet.to;
}

/** "10pm and 8am" — for reading a window back to the person who set it. */
export function describeQuietHours({ from, to }: QuietHours): string {
  return `${clock(from)} and ${clock(to)}`;
}

function clock(hour: number): string {
  if (hour === 0) return 'midnight';
  if (hour === 12) return 'noon';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}
