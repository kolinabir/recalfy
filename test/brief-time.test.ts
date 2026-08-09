import assert from 'node:assert/strict';
import test from 'node:test';

import { briefDueDay } from '../src/brief/brief-time';

const DHAKA = 'Asia/Dhaka';
const ONBOARDED = new Date('2026-01-01T00:00:00Z');

// 2026-08-10 08:05 in Dhaka (UTC+6).
const MORNING = new Date('2026-08-10T02:05:00Z');

test('due at the default 8am slot once onboarded', () => {
  const day = briefDueDay({ tz: DHAKA, onboardedAt: ONBOARDED }, MORNING);

  assert.equal(day, '2026-08-10');
});

test('not due before the slot', () => {
  // 07:55 local.
  const day = briefDueDay({ tz: DHAKA, onboardedAt: ONBOARDED }, new Date('2026-08-10T01:55:00Z'));

  assert.equal(day, null);
});

test('not due again once the day is claimed', () => {
  const target = { tz: DHAKA, onboardedAt: ONBOARDED, lastBriefDay: '2026-08-10' };

  assert.equal(briefDueDay(target, MORNING), null);
});

test('due again the next local day', () => {
  const target = { tz: DHAKA, onboardedAt: ONBOARDED, lastBriefDay: '2026-08-09' };

  assert.equal(briefDueDay(target, MORNING), '2026-08-10');
});

test('never due before onboarding — the zone is still a guess', () => {
  assert.equal(briefDueDay({ tz: DHAKA }, MORNING), null);
});

test('never due when turned off', () => {
  const target = {
    tz: DHAKA,
    onboardedAt: ONBOARDED,
    brief: { enabled: false, hour: 8, minute: 0 },
  };

  assert.equal(briefDueDay(target, MORNING), null);
});

test('honours a custom slot', () => {
  const target = {
    tz: DHAKA,
    onboardedAt: ONBOARDED,
    brief: { enabled: true, hour: 21, minute: 30 },
  };

  // 21:35 local.
  assert.equal(briefDueDay(target, new Date('2026-08-10T15:35:00Z')), '2026-08-10');
  assert.equal(briefDueDay(target, MORNING), null);
});

test('skips the day entirely rather than sending a late brief', () => {
  // 14:00 local — six hours past the slot, past the lateness window.
  const day = briefDueDay({ tz: DHAKA, onboardedAt: ONBOARDED }, new Date('2026-08-10T08:00:00Z'));

  assert.equal(day, null);
});
