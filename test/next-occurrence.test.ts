import assert from 'node:assert/strict';
import test from 'node:test';

import { describeRepeat, nextOccurrence } from '../src/reminders/next-occurrence';

const DHAKA = 'Asia/Dhaka';
const LONDON = 'Europe/London';

// 2026-08-03 09:00 in Dhaka (UTC+6).
const ANCHOR = new Date('2026-08-03T03:00:00Z');

test('advances a daily reminder by one local day', () => {
  const next = nextOccurrence(ANCHOR, { unit: 'day', interval: 1 }, DHAKA, ANCHOR);

  assert.equal(next.toISOString(), '2026-08-04T03:00:00.000Z');
});

test('honours the interval: every 2 weeks', () => {
  const next = nextOccurrence(ANCHOR, { unit: 'week', interval: 2 }, DHAKA, ANCHOR);

  assert.equal(next.toISOString(), '2026-08-17T03:00:00.000Z');
});

test('skips occurrences missed during an outage instead of bursting them', () => {
  // Ten days down: the 4th..13th are gone; the next daily firing is the 14th.
  const after = new Date('2026-08-13T05:00:00Z');
  const next = nextOccurrence(ANCHOR, { unit: 'day', interval: 1 }, DHAKA, after);

  assert.equal(next.toISOString(), '2026-08-14T03:00:00.000Z');
});

test('keeps the wall-clock hour across a DST change', () => {
  // 2026-10-20 09:00 London is BST (UTC+1); clocks fall back Oct 25.
  const anchor = new Date('2026-10-20T08:00:00Z');
  const next = nextOccurrence(anchor, { unit: 'week', interval: 1 }, LONDON, anchor);

  // Still 09:00 on the wall — now GMT, so 09:00Z rather than 08:00Z.
  assert.equal(next.toISOString(), '2026-10-27T09:00:00.000Z');
});

test('clamps monthly on the 31st to short months without drifting', () => {
  // 2026-01-31 10:00 Dhaka.
  const anchor = new Date('2026-01-31T04:00:00Z');
  const repeat = { unit: 'month', interval: 1 } as const;

  const feb = nextOccurrence(anchor, repeat, DHAKA, anchor);
  assert.equal(feb.toISOString(), '2026-02-28T04:00:00.000Z');

  // Computed from the anchor, not from the clamped February firing.
  const mar = nextOccurrence(anchor, repeat, DHAKA, feb);
  assert.equal(mar.toISOString(), '2026-03-31T04:00:00.000Z');
});

test('describes a cadence for confirmations', () => {
  assert.equal(describeRepeat({ unit: 'week', interval: 1 }), 'every week');
  assert.equal(describeRepeat({ unit: 'week', interval: 2 }), 'every 2 weeks');
});
