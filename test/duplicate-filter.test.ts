import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';

import { removeDuplicates } from '../src/memory/duplicate-filter';
import type { MemoryDoc } from '../src/mongo/collections';

function existing(text: string, overrides: Partial<MemoryDoc> = {}): MemoryDoc {
  return {
    _id: new ObjectId(),
    userId: 'u1',
    sid: '01',
    text,
    group: 'General',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  };
}

test('keeps a fact that is genuinely new', () => {
  const { fresh, duplicates } = removeDuplicates(
    [{ text: 'Rent is due on the 5th.' }],
    [existing('Landlord is Rahim.')],
  );

  assert.equal(fresh.length, 1);
  assert.equal(duplicates.length, 0);
});

test('drops a repeat regardless of case, spacing or trailing punctuation', () => {
  const { fresh, duplicates } = removeDuplicates(
    [{ text: 'user  is FROM Bangladesh' }],
    [existing('User is from Bangladesh.')],
  );

  assert.equal(fresh.length, 0);
  assert.equal(duplicates.length, 1);
});

test('drops a repeat within the same batch', () => {
  const { fresh } = removeDuplicates(
    [{ text: 'Likes tea.' }, { text: 'likes tea' }],
    [],
  );

  assert.equal(fresh.length, 1);
});

test('keeps a fact that supersedes an existing one, even if identical', () => {
  const { fresh } = removeDuplicates(
    [{ text: 'Rent is due on the 5th.', supersedes: ['01'] }],
    [existing('Rent is due on the 5th.')],
  );

  assert.equal(fresh.length, 1);
});

test('a superseded fact does not block storing that text again', () => {
  const { fresh } = removeDuplicates(
    [{ text: 'Rent is due on the 5th.' }],
    [existing('Rent is due on the 5th.', { supersededBy: new ObjectId() })],
  );

  assert.equal(fresh.length, 1);
});
