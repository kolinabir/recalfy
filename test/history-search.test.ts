import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';

import { formatHits } from '../src/brain/history-search';
import { MessageDoc } from '../src/mongo/collections';

const DHAKA = 'Asia/Dhaka';

function message(text: string, createdAt: string, role: 'user' | 'assistant' = 'user'): MessageDoc {
  return { _id: new ObjectId(), userId: 'u1', role, text, createdAt: new Date(createdAt) };
}

test('renders each hit as a dated line in the user zone', () => {
  // 23:30Z on the 11th is already the 12th in Dhaka.
  const lines = formatHits([message('the geyser is leaking', '2026-07-11T23:30:00Z')], DHAKA);

  assert.deepEqual(lines, ['12 Jul 2026 — user: the geyser is leaking']);
});

test('labels who said what', () => {
  const lines = formatHits(
    [message('noted — want a reminder?', '2026-07-12T05:00:00Z', 'assistant')],
    DHAKA,
  );

  assert.ok(lines[0].includes('assistant: noted'));
});

test('flattens and truncates long messages to an excerpt', () => {
  const long = `start ${'word '.repeat(100)}\n\nend`;
  const [line] = formatHits([message(long, '2026-07-12T05:00:00Z')], DHAKA);

  assert.ok(line.length < 300);
  assert.ok(line.endsWith('…'));
  assert.ok(!line.includes('\n'));
});
