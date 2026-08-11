import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';

import { EntryDoc } from '../src/mongo/collections';
import { renderTrackerDigest } from '../src/tracker/tracker-digest';
import { TrackerConfig } from '../src/tracker/tracker.types';

const TZ = 'Asia/Dhaka';
/** Mid-month, mid-day, so "this month" and "today" windows are unambiguous. */
const NOW = new Date('2026-08-15T06:00:00Z'); // 12:00 in Dhaka

let sequence = 0;

function entry(overrides: Partial<EntryDoc>): EntryDoc {
  sequence += 1;
  return {
    _id: new ObjectId(),
    userId: 'u1',
    sid: `e${sequence.toString(36).padStart(2, '0')}`,
    tracker: 'spending',
    value: 0,
    at: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

function tracker(overrides: Partial<TrackerConfig> & { name: string }): TrackerConfig {
  return { aggregate: 'sum', createdAt: NOW, ...overrides };
}

function render(entries: EntryDoc[], trackers: TrackerConfig[] = []): string {
  return renderTrackerDigest({ currency: 'BDT', trackers, entries, timezone: TZ, now: NOW });
}

test('nothing tracked renders nothing at all', () => {
  assert.equal(render([]), '');
});

test('spending totals the month and names the top categories', () => {
  const digest = render([
    entry({ item: 'cucumber', value: 250, category: 'groceries' }),
    entry({ item: 'rickshaw', value: 100, category: 'transport' }),
    entry({ item: 'rice', value: 900, category: 'groceries' }),
  ]);
  assert.match(digest, /Total: 1,250 BDT/);
  assert.match(digest, /groceries 1,150 BDT/);
  assert.match(digest, /transport 100 BDT/);
});

test('last month stays out of this month’s total', () => {
  const july = new Date('2026-07-20T06:00:00Z');
  const digest = render([
    entry({ item: 'old', value: 5000, at: july }),
    entry({ item: 'new', value: 250 }),
  ]);
  assert.match(digest, /Total: 250 BDT/);
});

test('a budget renders as percentage used', () => {
  const digest = render(
    [entry({ item: 'rice', value: 3000 })],
    [tracker({ name: 'spending', target: 15000, targetPeriod: 'month' })],
  );
  assert.match(digest, /Budget: 15,000 BDT\/month — 20% used/);
});

test('planned entries render as the shopping list with their sids', () => {
  const digest = render([entry({ item: 'cucumber', value: 250, planned: true, sid: 'e41' })]);
  assert.match(digest, /Shopping list: cucumber ~250 `e41`/);
  // Planned money is not spent money.
  assert.match(digest, /Total: 0 BDT/);
});

test('a list line without a named price shows no fake estimate', () => {
  const digest = render([entry({ item: 'milk', value: 1, planned: true, sid: 'e42' })]);
  assert.match(digest, /Shopping list: milk `e42`/);
  assert.doesNotMatch(digest, /~1/);
});

test('a count tracker counts entries against its target window', () => {
  const digest = render(
    [
      entry({ tracker: 'gym', value: 1, at: new Date('2026-08-10T06:00:00Z') }),
      entry({ tracker: 'gym', value: 1, at: new Date('2026-08-13T06:00:00Z') }),
    ],
    [tracker({ name: 'gym', aggregate: 'count', target: 3, targetPeriod: 'week' })],
  );
  assert.match(digest, /## Gym \(this week\)/);
  assert.match(digest, /2 of 3/);
});

test('a last tracker shows only the latest reading', () => {
  const digest = render(
    [
      entry({ tracker: 'weight', value: 80, at: new Date('2026-08-01T06:00:00Z') }),
      entry({ tracker: 'weight', value: 78, at: new Date('2026-08-14T06:00:00Z') }),
    ],
    [tracker({ name: 'weight', aggregate: 'last', unit: 'kg' })],
  );
  assert.match(digest, /Latest: 78 kg \(14 Aug\)/);
});

test('recent entries carry sids so corrections can cite them', () => {
  const digest = render([entry({ item: 'cucumber', value: 250, sid: 'e07' })]);
  assert.match(digest, /Recent entries:/);
  assert.match(digest, /cucumber 250 .*`e07`/);
});

test('deleted entries vanish from every section', () => {
  const digest = render([
    entry({ item: 'wrong', value: 999, deletedAt: NOW }),
    entry({ item: 'right', value: 100 }),
  ]);
  assert.match(digest, /Total: 100 BDT/);
  assert.doesNotMatch(digest, /wrong/);
});
