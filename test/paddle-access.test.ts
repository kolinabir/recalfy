import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { accessState, grantsAccess } from '../web/lib/paddle/access';

/**
 * The billing policy, which is the part of the Paddle integration that decides
 * whether someone keeps their memory. Pure functions, so this needs no Mongo
 * and no sandbox — the network-facing half is exercised against the real
 * sandbox by the webhook simulator instead.
 */

const CANCEL_PENDING = {
  action: 'cancel',
  at: new Date('2026-09-11T00:00:00Z'),
};

describe('grantsAccess', () => {
  it('grants while active or trialing', () => {
    assert.equal(grantsAccess({ status: 'active' }), true);
    assert.equal(grantsAccess({ status: 'trialing' }), true);
  });

  it('grants through dunning, because Retain is still trying the card', () => {
    assert.equal(grantsAccess({ status: 'past_due' }), true);
  });

  it('denies once actually canceled, and while paused', () => {
    assert.equal(grantsAccess({ status: 'canceled' }), false);
    assert.equal(grantsAccess({ status: 'paused' }), false);
  });

  it('denies when there is no subscription at all', () => {
    assert.equal(grantsAccess(null), false);
  });

  it('keeps access through a scheduled cancellation', () => {
    // The customer clicked cancel and Paddle scheduled it for the end of the
    // period. They paid for that period. Revoking here is the bug this whole
    // integration is most likely to grow.
    assert.equal(
      grantsAccess({ status: 'active', scheduledChange: CANCEL_PENDING }),
      true,
    );
  });

  it('keeps access through a scheduled pause', () => {
    assert.equal(
      grantsAccess({
        status: 'active',
        scheduledChange: { action: 'pause', at: CANCEL_PENDING.at },
      }),
      true,
    );
  });

  it('denies after a scheduled cancellation has landed', () => {
    // Paddle clears scheduled_change and flips status when the date arrives.
    assert.equal(grantsAccess({ status: 'canceled' }), false);
  });
});

describe('accessState', () => {
  it('separates "will cancel" from "has cancelled"', () => {
    assert.equal(
      accessState({ status: 'active', scheduledChange: CANCEL_PENDING }),
      'cancel-scheduled',
    );
    assert.equal(accessState({ status: 'canceled' }), 'canceled');
  });

  it('names a pending pause distinctly', () => {
    assert.equal(
      accessState({
        status: 'active',
        scheduledChange: { action: 'pause', at: CANCEL_PENDING.at },
      }),
      'pause-scheduled',
    );
  });

  it('surfaces dunning so the UI can ask for a new card', () => {
    assert.equal(accessState({ status: 'past_due' }), 'dunning');
  });

  it('reports no subscription', () => {
    assert.equal(accessState(null), 'none');
  });
});
