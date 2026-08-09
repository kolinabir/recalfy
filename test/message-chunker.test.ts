import assert from 'node:assert/strict';
import test from 'node:test';

import { chunkMessage } from '../src/telegram/message-chunker';

test('leaves a short message alone', () => {
  assert.deepEqual(chunkMessage('hello'), ['hello']);
});

test('never emits a chunk over the limit', () => {
  const long = Array.from({ length: 200 }, (_, i) => `- line ${i} ${'x'.repeat(40)}`).join('\n');

  const chunks = chunkMessage(long);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 4000));
});

test('splits without losing content', () => {
  const long = Array.from({ length: 200 }, (_, i) => `- line ${i} ${'x'.repeat(40)}`).join('\n');

  assert.equal(chunkMessage(long).join('\n'), long);
});

test('splits on a line break when one is close enough to the limit', () => {
  const text = `${'a'.repeat(90)}\n${'b'.repeat(90)}`;

  const [first, second] = chunkMessage(text, 100);

  assert.equal(first, 'a'.repeat(90));
  assert.equal(second, 'b'.repeat(90));
});

test('falls back to a hard cut when no line break is usable', () => {
  const text = 'c'.repeat(250);

  const chunks = chunkMessage(text, 100);

  assert.deepEqual(chunks.map((chunk) => chunk.length), [100, 100, 50]);
});
