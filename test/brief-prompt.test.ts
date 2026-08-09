import assert from 'node:assert/strict';
import test from 'node:test';

import { SKIP, buildBriefPrompt, buildReflectionPrompt } from '../src/brief/brief-prompt';

const BASE = {
  memory: '# What I know about you\n- Landlord is Rahim. `a1`',
  reminders: ['Mon 10 Aug 2026 at 6:00 PM — Pay rent'],
  conversation: ['user: the geyser is leaking', 'assistant: noted'],
  timezone: 'Asia/Dhaka',
  now: new Date('2026-08-10T02:05:00Z'),
  weekReview: false,
};

test('states the local morning date and zone', () => {
  const prompt = buildBriefPrompt(BASE);

  assert.ok(prompt.includes('Monday 10 August 2026'));
  assert.ok(prompt.includes('Asia/Dhaka'));
});

test('includes the memory document, reminders and conversation', () => {
  const prompt = buildBriefPrompt(BASE);

  assert.ok(prompt.includes('Landlord is Rahim'));
  assert.ok(prompt.includes('Pay rent'));
  assert.ok(prompt.includes('the geyser is leaking'));
});

test('licenses SKIP when there is nothing to say', () => {
  const prompt = buildBriefPrompt({ ...BASE, reminders: [], conversation: [] });

  assert.ok(prompt.includes(SKIP));
  assert.ok(prompt.includes('No reminders are set for today.'));
  assert.ok(prompt.includes('There has been no recent conversation.'));
});

test('folds in the week-in-review only on Sundays', () => {
  assert.ok(!buildBriefPrompt(BASE).includes('week-in-review'));
  assert.ok(buildBriefPrompt({ ...BASE, weekReview: true }).includes('week-in-review'));
});

test('reflection prompt carries the evening, today only, and the SKIP licence', () => {
  const prompt = buildReflectionPrompt({
    memory: BASE.memory,
    today: ['user: signed the lease today'],
    timezone: 'Asia/Dhaka',
    now: new Date('2026-08-10T15:30:00Z'),
  });

  assert.ok(prompt.includes('It is evening'));
  assert.ok(prompt.includes('signed the lease today'));
  assert.ok(prompt.includes(SKIP));
});
