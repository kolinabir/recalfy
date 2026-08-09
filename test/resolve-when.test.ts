import assert from 'node:assert/strict';
import test from 'node:test';

import { describeInstant, resolveWhen } from '../src/reminders/resolve-when';

const DHAKA = 'Asia/Dhaka';
// 2026-08-09 14:00 in Dhaka (UTC+6).
const NOW = new Date('2026-08-09T08:00:00Z');

test('accepts a future instant and echoes it in the user zone', () => {
  const result = resolveWhen('2026-08-09T17:00:00+06:00', DHAKA, NOW);

  assert.equal(result.ok, true);
  assert.ok(result.ok && result.spoken.includes('5:00 PM'));
  assert.ok(result.ok && result.at.toISOString() === '2026-08-09T11:00:00.000Z');
});

test('reads a bare local time in the user zone, not UTC', () => {
  const result = resolveWhen('2026-08-09T17:00:00', DHAKA, NOW);

  assert.equal(result.ok, true);
  assert.ok(result.ok && result.at.toISOString() === '2026-08-09T11:00:00.000Z');
});

test('rejects a time in the past rather than scheduling it', () => {
  const result = resolveWhen('2026-08-09T09:00:00+06:00', DHAKA, NOW);

  assert.equal(result.ok, false);
  assert.ok(!result.ok && /in the past/.test(result.reason));
});

test('rejects an unparseable instant', () => {
  const result = resolveWhen('tomorrow at 5', DHAKA, NOW);

  assert.equal(result.ok, false);
  assert.ok(!result.ok && /not a valid ISO-8601/.test(result.reason));
});

test('rejects a date beyond the horizon, which usually means a year typo', () => {
  const result = resolveWhen('2126-08-09T17:00:00+06:00', DHAKA, NOW);

  assert.equal(result.ok, false);
  assert.ok(!result.ok && /more than 5 years/.test(result.reason));
});

test('describes a stored instant in the user zone', () => {
  assert.equal(
    describeInstant(new Date('2026-08-09T11:00:00Z'), DHAKA),
    'Sun 9 Aug 2026 at 5:00 PM',
  );
});
