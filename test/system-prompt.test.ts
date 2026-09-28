import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSystemPrompt } from '../src/brain/system-prompt';

const INPUT = {
  memory: '# What I know about you\n_Timezone: Asia/Dhaka · 1 memory_\n\n## Home\n- Rent is due on the 5th. `01`',
  tracking: '# Tracking\n\n## Spending (August)\nTotal: 1,250 BDT',
  timezone: 'Asia/Dhaka',
  onboarded: true,
  now: new Date('2026-08-09T08:00:00Z'),
};

test('states the current time in the user zone', () => {
  const prompt = buildSystemPrompt(INPUT);

  assert.match(prompt, /Sunday 9 August 2026, 2:00 PM \(Asia\/Dhaka\)/);
});

test('gives the ISO instant with the zone offset, for reminder arithmetic', () => {
  assert.match(buildSystemPrompt(INPUT), /2026-08-09T14:00:00\.000\+06:00/);
});

test('includes the memory document verbatim', () => {
  assert.match(buildSystemPrompt(INPUT), /Rent is due on the 5th/);
});

test('tells the model that slash-prefixed text is ordinary conversation', () => {
  assert.match(buildSystemPrompt(INPUT), /never types commands/);
});

test('opens with onboarding when we do not know where they are', () => {
  const prompt = buildSystemPrompt({ ...INPUT, onboarded: false });

  assert.match(prompt, /FIRST CONVERSATION WITH THIS USER/);
  assert.match(prompt, /which city or country/);
  assert.doesNotMatch(prompt, /MUST make that call in this turn/);
});

test('closes with the correction imperative once onboarded', () => {
  const prompt = buildSystemPrompt(INPUT);

  assert.doesNotMatch(prompt, /FIRST CONVERSATION/);
  assert.match(prompt, /MUST make that call in this turn/);
  assert.match(prompt, /supersedes/);
  assert.match(prompt, /call `forget`/);
});

test('keeps persona, rules and memory ahead of the volatile tail, for caching', () => {
  const prompt = buildSystemPrompt(INPUT);

  assert.ok(prompt.indexOf(INPUT.memory) < prompt.indexOf('Right now it is'));
});

test('includes the tracking digest after the memory, before the clock', () => {
  const prompt = buildSystemPrompt(INPUT);

  assert.match(prompt, /Total: 1,250 BDT/);
  assert.ok(prompt.indexOf(INPUT.memory) < prompt.indexOf(INPUT.tracking));
  assert.ok(prompt.indexOf(INPUT.tracking) < prompt.indexOf('Right now it is'));
});

test('an empty digest leaves no gap in the prompt', () => {
  const prompt = buildSystemPrompt({ ...INPUT, tracking: '' });

  assert.doesNotMatch(prompt, /# Tracking/);
  // The rules still teach tracking even before anything is tracked.
  assert.match(prompt, /call `track`/);
});

test('knows its own name, in every conversation and in the introduction', () => {
  // It once introduced itself as "your memory assistant" — the prompt said
  // who it was for but never what it was called.
  assert.match(buildSystemPrompt(INPUT), /You are Recalfy/);
  assert.match(buildSystemPrompt({ ...INPUT, onboarded: false }), /introduce yourself by name — you are Recalfy/);
});
