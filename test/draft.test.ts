import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { Draft } from '../src/channels/draft';

/**
 * The model emits tokens faster than any chat network will accept edits, so
 * the only interesting property here is what gets dropped: a draft must send
 * the latest text, never a queue of stale ones, and must never let a failed
 * frame reach the caller — the real reply is following right behind it.
 */

describe('draft', () => {
  it('coalesces a burst into one write, carrying the latest text', async () => {
    const written: string[] = [];
    const draft = new Draft(async (text) => void written.push(text), 0);

    draft.show('Re');
    draft.show('Rent is');
    draft.show('Rent is due on the 3rd');
    await sleep(10);
    await draft.settle();

    assert.deepEqual(written, ['Rent is due on the 3rd']);
  });

  it('abandons a frame that is still pending when the real reply is ready', async () => {
    const written: string[] = [];
    const draft = new Draft(async (text) => void written.push(text), 50);

    draft.show('half a sen');
    await draft.settle();

    assert.deepEqual(written, []);
  });

  it('swallows a failing write', async () => {
    const draft = new Draft(async () => {
      throw new Error('Bad Request: DRAFT_ID_INVALID');
    }, 0);

    draft.show('anything');
    await sleep(10);
    await draft.settle();
  });
});

/*
  Seen in production: a nine-token reply painted the empty "Thinking…" frame
  and nothing else, because the answer finished inside the throttle window.
  A draft cannot be deleted — sendMessage has no draft_id and there is no
  method to clear one — so the placeholder sat next to the finished answer
  until it expired.
*/
describe('draft placeholders', () => {
  it('never paints an empty frame', async () => {
    const written: string[] = [];
    const draft = new Draft(async (text) => void written.push(text), 0);

    draft.show('');
    await sleep(10);
    await draft.settle();

    assert.deepEqual(written, []);
  });
});
