import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deferredUntil, describeQuietHours, isInside } from '../src/reminders/quiet-hours';

/**
 * Quiet hours, which is entirely wall-clock arithmetic in someone else's
 * timezone — the category of code that is obvious right up until a window
 * wraps midnight or a clock changes.
 */

const DHAKA = 'Asia/Dhaka';
const NIGHT = { from: 22, to: 8 };

/** A local wall-clock time in Dhaka, as the instant it actually is. */
function at(local: string): Date {
  return new Date(`${local}+06:00`);
}

describe('isInside', () => {
  it('catches the late evening and the small hours of a wrapping window', () => {
    assert.equal(isInside(at('2026-08-12T22:00'), NIGHT, DHAKA), true);
    assert.equal(isInside(at('2026-08-12T23:30'), NIGHT, DHAKA), true);
    assert.equal(isInside(at('2026-08-13T03:00'), NIGHT, DHAKA), true);
    assert.equal(isInside(at('2026-08-13T07:59'), NIGHT, DHAKA), true);
  });

  it('lets the boundary hour itself through — quiet ends at "to"', () => {
    assert.equal(isInside(at('2026-08-13T08:00'), NIGHT, DHAKA), false);
    assert.equal(isInside(at('2026-08-12T21:59'), NIGHT, DHAKA), false);
  });

  it('handles a window that does not wrap midnight', () => {
    const siesta = { from: 13, to: 16 };
    assert.equal(isInside(at('2026-08-12T14:00'), siesta, DHAKA), true);
    assert.equal(isInside(at('2026-08-12T12:00'), siesta, DHAKA), false);
    assert.equal(isInside(at('2026-08-12T16:00'), siesta, DHAKA), false);
  });

  it('treats an equal start and end as no window, never as a silent day', () => {
    assert.equal(isInside(at('2026-08-12T03:00'), { from: 9, to: 9 }, DHAKA), false);
  });

  it('reads the hour in the user zone, not the server one', () => {
    // 03:00 UTC is 09:00 in Dhaka — the small hours in UTC, mid-morning for
    // the user. Reading the server's clock here is the whole bug class: it
    // would hold a 9am reminder until 8am that never comes.
    const instant = new Date('2026-08-12T03:00:00Z');
    assert.equal(isInside(instant, NIGHT, DHAKA), false);
    assert.equal(isInside(instant, NIGHT, 'UTC'), true);
  });
});

describe('deferredUntil', () => {
  it('returns null when there is no window at all', () => {
    assert.equal(deferredUntil(at('2026-08-13T03:00'), undefined, DHAKA), null);
  });

  it('returns null outside the window — deliver now', () => {
    assert.equal(deferredUntil(at('2026-08-12T12:00'), NIGHT, DHAKA), null);
  });

  it('holds a late-night reminder until the window ends next morning', () => {
    const until = deferredUntil(at('2026-08-12T23:30'), NIGHT, DHAKA);
    assert.equal(until?.toISOString(), at('2026-08-13T08:00').toISOString());
  });

  it('holds an early-hours reminder until later the same morning', () => {
    // 03:00 must wait five hours, not roll forward to tomorrow.
    const until = deferredUntil(at('2026-08-13T03:00'), NIGHT, DHAKA);
    assert.equal(until?.toISOString(), at('2026-08-13T08:00').toISOString());
  });

  it('lands on the wall clock across a DST change, not 24 fixed hours later', () => {
    // London goes back an hour at 02:00 on 25 Oct 2026. A reminder caught at
    // 23:30 the night before must still surface at 08:00 by the wall clock.
    const until = deferredUntil(new Date('2026-10-24T22:30:00Z'), NIGHT, 'Europe/London');
    assert.equal(until?.toISOString(), '2026-10-25T08:00:00.000Z');
  });
});

describe('describeQuietHours', () => {
  it('speaks the window the way a person would', () => {
    assert.equal(describeQuietHours(NIGHT), '10pm and 8am');
    assert.equal(describeQuietHours({ from: 0, to: 12 }), 'midnight and noon');
  });
});
