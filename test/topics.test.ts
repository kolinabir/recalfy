import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Memory } from '../src/memory/memory.types';
import { needsTopicSync } from '../src/topics/needs-sync';
import { byGroup, hashOf, renderTopic, topicKey } from '../src/topics/topic-document';

const NOW = new Date('2026-08-15T12:00:00Z');

function fact(text: string, group = 'Home'): Memory {
  return { sid: '01', text, group, createdAt: NOW };
}

/**
 * A topic holds one message, rewritten in place. Everything worth testing
 * follows from that: the message has to fit, the rewrite has to be skipped
 * when nothing changed, and the key has to survive whatever the model decides
 * to call a group.
 */

describe('topic document', () => {
  it('renders the group, its facts, and what it is', () => {
    const body = renderTopic('Home', [fact('Rent is due on the 3rd.')], NOW);

    assert.match(body, /^Home\n/);
    assert.match(body, /• Rent is due on the 3rd\./);
    assert.match(body, /1 fact · updated 15 Aug 2026$/);
  });

  it('counts in the plural when there is more than one', () => {
    const body = renderTopic('Home', [fact('a'), fact('b')], NOW);
    assert.match(body, /2 facts · /);
  });

  /* Telegram rejects a message over 4096 characters outright — a group that
     outgrows one has to lose its oldest, not its whole tab. */
  it('keeps the newest facts and says how many it dropped', () => {
    const many = Array.from({ length: 200 }, (_, i) => fact(`Fact number ${i} ${'x'.repeat(60)}`));
    const body = renderTopic('Home', many, NOW);

    assert.ok(body.length < 4096, `body was ${body.length} characters`);
    assert.match(body, /• Fact number 0 /, 'the newest fact must survive');
    assert.match(body, /…and \d+ older — recalfy\.com\/dashboard\/memories$/);
  });

  it('hashes the text, so an unchanged group costs no API call', () => {
    const one = renderTopic('Home', [fact('Rent is due on the 3rd.')], NOW);
    const same = renderTopic('Home', [fact('Rent is due on the 3rd.')], NOW);
    const other = renderTopic('Home', [fact('Rent is due on the 5th.')], NOW);

    assert.equal(hashOf(one), hashOf(same));
    assert.notEqual(hashOf(one), hashOf(other));
  });
});

describe('topic keys', () => {
  /* Group names come from a language model, and Mongo keys cannot hold a dot. */
  it('slugs anything a model might call a group', () => {
    assert.equal(topicKey('Home'), 'home');
    assert.equal(topicKey('Work (Dhaka)'), 'work-dhaka');
    assert.equal(topicKey('Health/Meds'), 'health-meds');
    assert.equal(topicKey('Mr. Rahim'), 'mr-rahim');
    assert.equal(topicKey('!!!'), 'other');
  });

  it('groups facts in the order they arrive, newest group first', () => {
    const groups = byGroup([fact('a', 'Work'), fact('b', 'Home'), fact('c', 'Work')]);
    assert.deepEqual([...groups.keys()], ['Work', 'Home']);
    assert.equal(groups.get('Work')?.length, 2);
  });
});

describe('needsTopicSync', () => {
  it('builds the tabs on the first message after the switch goes on', () => {
    assert.equal(needsTopicSync({ topics: true }, false), true);
  });

  it('leaves them alone on a turn that changed nothing', () => {
    assert.equal(needsTopicSync({ topics: true, topicIndex: { home: entry() } }, false), false);
  });

  it('redraws when memory changed', () => {
    assert.equal(needsTopicSync({ topics: true, topicIndex: { home: entry() } }, true), true);
  });

  /* Switching off has to take the tabs away — this is the next time we hear
     from them after the dashboard write. */
  it('tears down what is left when the switch goes off', () => {
    assert.equal(needsTopicSync({ topicIndex: { home: entry() } }, false), true);
  });

  it('does nothing at all for the people who never turned it on', () => {
    assert.equal(needsTopicSync({}, true), false);
    assert.equal(needsTopicSync({ topics: false }, true), false);
  });
});

function entry() {
  return { threadId: 2, messageId: 3, hash: 'abc' };
}
