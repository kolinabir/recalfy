import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ACCESS_STATUSES, statusGrantsAccess } from '../src/billing/entitlements';
import { SubscriptionStatus } from '../src/mongo/collections';
import { grantsAccess } from '../web/lib/paddle/access';

/**
 * The bot restates the billing policy rather than importing it — the web app
 * and the bot are separate builds, and `web/lib/paddle/access.ts` is the
 * dashboard's module. Restating it is only safe if the two cannot drift, so
 * that is what this file checks: every status, both sides, same answer.
 *
 * If this test fails, one half was changed and the other was not. Fix the
 * copy, do not relax the assertion — the failure mode it guards against is a
 * paying customer locked out of the bot while the dashboard says "Active".
 */

const EVERY_STATUS: SubscriptionStatus[] = [
  'active',
  'trialing',
  'past_due',
  'paused',
  'canceled',
];

describe('the bot copy of the billing policy', () => {
  it('agrees with the web app on every status', () => {
    for (const status of EVERY_STATUS) {
      assert.equal(
        statusGrantsAccess(status),
        grantsAccess({ status }),
        `disagreed about "${status}"`,
      );
    }
  });

  it('is the same set the Mongo filter is built from', () => {
    assert.deepEqual(
      [...ACCESS_STATUSES].sort(),
      EVERY_STATUS.filter(statusGrantsAccess).sort(),
    );
  });

  it('grants through a trial and through dunning', () => {
    assert.equal(statusGrantsAccess('trialing'), true);
    assert.equal(statusGrantsAccess('past_due'), true);
  });

  it('refuses once paused or cancelled', () => {
    assert.equal(statusGrantsAccess('paused'), false);
    assert.equal(statusGrantsAccess('canceled'), false);
  });
});
