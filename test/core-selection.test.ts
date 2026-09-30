import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ObjectId } from 'mongodb';

import {
  CORE_RECENT,
  FULL_LIMIT,
  PINNED_CAP,
  selectCore,
} from '../src/memory/core-selection';
import { renderMemoryDocument } from '../src/memory/memory-document';
import { rankMatches } from '../src/memory/memory-search';
import { Memory } from '../src/memory/memory.types';
import type { MemoryDoc } from '../src/mongo/collections';

const NOW = new Date('2026-10-01T00:00:00Z');
const AT = new Date('2026-09-01T00:00:00Z');

/** `n` facts with sids in creation order, the way SidMinter hands them out. */
function many(n: number, group = (i: number) => 'General'): MemoryDoc[] {
  return Array.from({ length: n }, (_, i) => ({
    _id: new ObjectId(),
    userId: 'u1',
    sid: (i + 1).toString(36).padStart(2, '0'),
    text: `Fact number ${i + 1}.`,
    group: group(i),
    // One shared instant, like a batch from one `remember` call: the sid
    // has to be what orders them.
    createdAt: AT,
  }));
}

describe('selectCore', () => {
  it('keeps everything up to the limit — small memories behave exactly as before', () => {
    const live = many(FULL_LIMIT);
    assert.equal(selectCore(live), live);
  });

  it('past the limit, keeps the newest by sid, in their original order', () => {
    const live = many(FULL_LIMIT + 1);
    const core = selectCore(live);
    assert.equal(core.length, CORE_RECENT);
    assert.equal(core[0].text, `Fact number ${FULL_LIMIT + 2 - CORE_RECENT}.`);
    assert.equal(core.at(-1)?.text, `Fact number ${FULL_LIMIT + 1}.`);
  });

  it('always keeps goals, however old, up to a cap', () => {
    const live = many(1000, (i) => (i < 60 ? 'Goals' : 'General'));
    const core = selectCore(live);
    const goals = core.filter((memory) => memory.group === 'Goals');
    assert.equal(goals.length, PINNED_CAP);
    assert.equal(core.length, CORE_RECENT + PINNED_CAP);
  });
});

describe('the rendered header', () => {
  it('says nothing extra when everything is listed', () => {
    const rendered = renderMemoryDocument({
      timezone: 'UTC',
      memories: many(10),
      now: NOW,
      select: selectCore,
    });
    assert.doesNotMatch(rendered, /search_memory/);
  });

  it('tells the model the list is partial, and how to reach the rest', () => {
    const rendered = renderMemoryDocument({
      timezone: 'UTC',
      memories: many(2000),
      now: NOW,
      select: selectCore,
    });
    assert.match(rendered, /2000 memories · only 200 listed below .* search_memory/);
    assert.doesNotMatch(rendered, /Fact number 1\./);
    assert.match(rendered, /Fact number 2000\./);
  });

  it('exports still render everything when no selection is passed', () => {
    const rendered = renderMemoryDocument({ timezone: 'UTC', memories: many(2000), now: NOW });
    assert.match(rendered, /Fact number 1\./);
  });
});

describe('rankMatches', () => {
  const facts: Memory[] = [
    { sid: '01', text: 'Rahim is the landlord.', group: 'People', createdAt: AT },
    { sid: '02', text: "Rahim's number is +880 1711 000000.", group: 'People', createdAt: AT },
    { sid: '03', text: 'The spare key is with the neighbour in flat 4B.', group: 'Home', createdAt: AT },
    { sid: '04', text: 'Dentist is Dr. Karim in Gulshan.', group: 'Health', createdAt: AT },
  ];

  it('finds facts that share only some of the words, best match first', () => {
    const hits = rankMatches(facts, 'rahim landlord phone');
    assert.deepEqual(hits.map((hit) => hit.sid), ['01', '02']);
  });

  it('ignores filler words, and a plural still finds the singular', () => {
    assert.deepEqual(rankMatches(facts, 'where are my keys').map((hit) => hit.sid), ['03']);
  });

  it('returns nothing rather than everything for an empty or all-filler query', () => {
    assert.deepEqual(rankMatches(facts, ''), []);
    assert.deepEqual(rankMatches(facts, 'what is the'), []);
  });
});
