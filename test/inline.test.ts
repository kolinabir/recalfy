import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { searchMemories } from '../src/memory/memory-search';
import { Memory } from '../src/memory/memory.types';
import { PRIVATE_ANSWER, toInlineResults } from '../src/telegram/inline';

/**
 * Narrows the result's content union, and asserts the narrowing: a result
 * carrying anything but plain text would be a different feature entirely.
 */
function sentText(result: ReturnType<typeof toInlineResults>[number]): string {
  const content = result.input_message_content;
  assert.ok(content && 'message_text' in content, 'inline results must send plain text');
  return content.message_text;
}

/**
 * Inline mode is the one surface that answers into a chat we are not part of,
 * so these tests are less about matching quality than about what must never
 * happen: another person's dropdown showing your facts, or a result carrying
 * something other than the plain text you stored.
 */

function fact(sid: string, text: string, group = 'General', daysAgo = 0): Memory {
  return {
    sid,
    text,
    group,
    createdAt: new Date(Date.now() - daysAgo * 86_400_000),
  };
}

const MEMORY: Memory[] = [
  fact('a1', 'Wifi at the studio is duckpond42', 'Home', 3),
  fact('a2', 'Rent is due on the 3rd', 'Home', 10),
  fact("a3", "Parent's address is 12 Gulshan Ave", 'People', 1),
  fact('a4', 'Rahim is the landlord', 'People', 20),
  fact('a5', 'Sara likes oat milk', 'People', 0),
];

describe('the privacy flags', () => {
  it('never caches, and always scopes the answer to one person', () => {
    // If this test is failing because someone "cleaned up" these flags: they
    // are the entire reason Telegram cannot serve one user's facts to another.
    assert.equal(PRIVATE_ANSWER.cache_time, 0);
    assert.equal(PRIVATE_ANSWER.is_personal, true);
  });
});

describe('searchMemories', () => {
  it('finds a fact by one word', () => {
    const hits = searchMemories(MEMORY, 'wifi');
    assert.equal(hits.length, 1);
    assert.match(hits[0].text, /duckpond42/);
  });

  it('requires every word, so typing more narrows rather than widens', () => {
    assert.equal(searchMemories(MEMORY, 'rent due').length, 1);
    assert.equal(searchMemories(MEMORY, 'rent unicorn').length, 0);
  });

  it('prefers a word start over a match buried mid-word', () => {
    // "rent" appears in both "Rent is due" and "Parent's address".
    const hits = searchMemories(MEMORY, 'rent');
    assert.equal(hits.length, 2);
    assert.match(hits[0].text, /^Rent is due/);
  });

  it('matches the group as well as the text', () => {
    const hits = searchMemories(MEMORY, 'people');
    assert.equal(hits.length, 3);
  });

  it('ignores case and stray spacing', () => {
    assert.equal(searchMemories(MEMORY, '  WIFI   Studio ').length, 1);
  });

  it('shows the most recent facts when nothing has been typed yet', () => {
    // An empty panel reads as broken; the newest facts are the best guess.
    const hits = searchMemories(MEMORY, '');
    assert.equal(hits[0].sid, 'a5');
    assert.equal(hits.length, MEMORY.length);
  });

  it('returns nothing rather than everything when there is no match', () => {
    assert.deepEqual(searchMemories(MEMORY, 'helicopter'), []);
  });

  it('honours the limit, so the dropdown cannot be flooded', () => {
    const many = Array.from({ length: 60 }, (_, i) => fact(`b${i}`, `thing number ${i}`));
    assert.equal(searchMemories(many, 'thing', 20).length, 20);
  });
});

describe('toInlineResults', () => {
  it('sends the fact exactly as stored, with no formatting applied', () => {
    // A fact with markdown characters must not be parsed, half-rendered, or
    // rejected by Telegram — it is someone's password as often as prose.
    const [result] = toInlineResults([fact('c1', 'Password is a_b*c_d')]);
    assert.equal(sentText(result), 'Password is a_b*c_d');
    assert.equal('parse_mode' in (result.input_message_content ?? {}), false);
  });

  it('identifies each result by its short id', () => {
    const results = toInlineResults(MEMORY);
    assert.deepEqual(
      results.map((r) => r.id),
      ['a1', 'a2', 'a3', 'a4', 'a5'],
    );
  });

  it('truncates a long title but never the message it sends', () => {
    const long = 'x'.repeat(200);
    const [result] = toInlineResults([fact('c2', long)]);

    assert.ok(result.title.length < 100);
    assert.match(result.title, /…$/);
    assert.equal(sentText(result), long);
  });

  it('shows the group as the subtitle, so two similar facts are tellable apart', () => {
    const [result] = toInlineResults([fact('c3', 'Rahim is the landlord', 'People')]);
    assert.equal(result.description, 'People');
  });
});
