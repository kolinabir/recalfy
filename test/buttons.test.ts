import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ACTION_DATA_LIMIT, encodeAction, parseAction } from '../src/channels/action-data';
import { undoAction, undone, undoneLine } from '../src/bot/undo';
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
  const REMINDER = '68a0e2f1c4b5a6d7e8f90123';
  const nothing = { saved: [], scheduled: [] };

  it('offers nothing when the turn changed nothing', () => {
    assert.equal(undoAction(nothing), null);
  });

  it('names every fact it would take back', () => {
    const action = undoAction({ saved: ['04', '05', '06'], scheduled: [] });
    assert.equal(action?.label, 'Undo all 3');
    assert.deepEqual(undone(parseAction(action!.data)!.parts).saved, ['04', '05', '06']);
  });

  /*
    The bug this half exists for: "interview Friday at 3" stores a fact and
    schedules a reminder, and an undo that took back only the fact left the
    reminder to fire the next morning anyway.
  */
  it('takes back the reminders the same turn scheduled', () => {
    const action = undoAction({ saved: ['04'], scheduled: [REMINDER] });

    assert.equal(action?.label, 'Undo all 2');
    assert.deepEqual(undone(parseAction(action!.data)!.parts), {
      saved: ['04'],
      scheduled: [REMINDER],
    });
  });

  it('undoes a bare reminder, from a turn that stored no facts', () => {
    const action = undoAction({ saved: [], scheduled: [REMINDER] });

    assert.equal(action?.label, 'Undo');
    assert.deepEqual(undone(parseAction(action!.data)!.parts).scheduled, [REMINDER]);
  });

  it('spells a reminder id short enough that a real turn still fits', () => {
    // Two facts and two reminders in hex would be 70 bytes — over the limit,
    // and the button would vanish exactly when it is most needed.
    const action = undoAction({ saved: ['04', '05'], scheduled: [REMINDER, REMINDER] });

    assert.ok(action, 'a two-fact two-reminder turn must still get a button');
    assert.ok(Buffer.byteLength(action.data) <= ACTION_DATA_LIMIT);
  });

  /* Half an undo is worse than none — the user would believe all of it went. */
  it('offers nothing rather than a partial undo when the ids will not fit', () => {
    const many = Array.from({ length: 40 }, (_, index) => `m${index}`);
    assert.equal(undoAction({ saved: many, scheduled: [] }), null);
  });

  it('ignores a reminder id it never minted', () => {
    // Old buttons outlive deploys, and a payload can be hand-made.
    assert.deepEqual(undone(['04;notbase64!!']).scheduled, []);
  });

  it('says both halves out loud, so an invisible cancellation is checkable', () => {
    assert.equal(undoneLine(1, 0), '↩︎ Undone — forgotten.');
    assert.equal(undoneLine(0, 1), '↩︎ Undone — reminder cancelled.');
    assert.equal(undoneLine(2, 1), '↩︎ Undone — 2 facts forgotten, reminder cancelled.');
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
