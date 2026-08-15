import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ACTION_DATA_LIMIT, encodeAction, parseAction } from '../src/channels/action-data';
import { undoAction, undoneIds } from '../src/bot/undo';
import { SNOOZE, snoozeActions, snoozedTo } from '../src/reminders/snooze';

/**
 * A button's payload is the one thing here that crosses a deploy: a keyboard
 * sent last week is still tappable next week, by a build that has never seen
 * it. So these tests care about two things — that nothing we mint can exceed
 * the 64 bytes Telegram allows, and that anything we did not mint is refused
 * quietly rather than acted on.
 */

describe('action payloads', () => {
  it('round-trips a kind and its parts', () => {
    const data = encodeAction('snooze', 'abc123', '10m');
    assert.ok(data);
    assert.deepEqual(parseAction(data), { kind: 'snooze', parts: ['abc123', '10m'] });
  });

  it('refuses to mint anything over Telegram’s limit', () => {
    assert.equal(encodeAction('undo', 'x'.repeat(ACTION_DATA_LIMIT)), null);
  });

  it('reads a payload from an older build as an unknown kind, not a crash', () => {
    assert.equal(parseAction('')?.kind, undefined);
    assert.equal(parseAction('mystery')?.kind, 'mystery');
  });
});

describe('undo', () => {
  it('offers nothing when the turn stored nothing', () => {
    assert.equal(undoAction([]), null);
  });

  it('names every fact it would take back', () => {
    const action = undoAction(['04', '05', '06']);
    assert.equal(action?.label, 'Undo all 3');
    assert.deepEqual(undoneIds(parseAction(action!.data)!.parts), ['04', '05', '06']);
  });

  /* Half an undo is worse than none — the user would believe all of it went. */
  it('offers nothing rather than a partial undo when the ids will not fit', () => {
    const many = Array.from({ length: 40 }, (_, index) => `m${index}`);
    assert.equal(undoAction(many), null);
  });
});

describe('snooze', () => {
  it('draws one button per option, all within the limit', () => {
    const actions = snoozeActions('68a0e2f1c4b5a6d7e8f90123');
    assert.equal(actions.length, 3);
    for (const action of actions) {
      assert.ok(Buffer.byteLength(action.data) <= ACTION_DATA_LIMIT);
      assert.equal(parseAction(action.data)?.kind, SNOOZE);
    }
  });

  it('delays from the moment of the press, not from when it was due', () => {
    const pressedAt = new Date('2026-08-15T09:00:00Z');
    assert.equal(snoozedTo('1h', pressedAt)?.at.toISOString(), '2026-08-15T10:00:00.000Z');
  });

  it('declines a key it never minted', () => {
    assert.equal(snoozedTo('4h', new Date()), null);
    assert.equal(snoozedTo('', new Date()), null);
  });
});
