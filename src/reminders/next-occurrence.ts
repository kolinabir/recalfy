import { DateTime } from 'luxon';

import { Repeat } from '../mongo/collections';

/**
 * The instant a recurring reminder fires next: the earliest occurrence in the
 * series that is strictly after `after`.
 *
 * Occurrences are computed from the series anchor (its first instant), not
 * from the previous firing — so "monthly on the 31st" clamps to Feb 28 and
 * then returns to Mar 31 instead of drifting to the 28th forever.
 *
 * All arithmetic happens as wall-clock time in the user's zone, so "every day
 * at 9am" survives a DST change. Skipping to strictly-after-`after` also
 * guards against a long outage: occurrences that came due while the process
 * was down are dropped rather than delivered in a burst.
 */
export function nextOccurrence(anchor: Date, repeat: Repeat, zone: string, after: Date): Date {
  const start = DateTime.fromJSDate(anchor, { zone });
  const unit = pluralUnit(repeat.unit);

  for (let n = 1; ; n++) {
    const next = start.plus({ [unit]: n * repeat.interval });
    if (next.toMillis() > after.getTime()) return next.toJSDate();
  }
}

/** How a recurrence reads in a confirmation or listing, e.g. "every 2 weeks". */
export function describeRepeat({ unit, interval }: Repeat): string {
  return interval === 1 ? `every ${unit}` : `every ${interval} ${unit}s`;
}

function pluralUnit(unit: Repeat['unit']): 'days' | 'weeks' | 'months' | 'years' {
  return `${unit}s`;
}
