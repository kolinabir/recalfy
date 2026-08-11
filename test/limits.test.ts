import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LIMITS, limitsForPrice, tierForPrice } from '../src/billing/entitlements';
import { TIER_CHANNELS, TIER_MEMORY_CAP } from '../web/lib/paddle/access';

/**
 * What each plan permits. The bot and the dashboard each hold a copy of this
 * table — separate builds, so neither can import the other's — and the whole
 * risk of that arrangement is the two disagreeing about what someone bought.
 */

const PRICES = {
  keep: ['pri_keep_month', 'pri_keep_year'],
  archive: ['pri_archive_month', 'pri_archive_year'],
};

describe('the plan table', () => {
  it('agrees with the dashboard about which chats each tier may connect', () => {
    for (const tier of ['keep', 'archive'] as const) {
      assert.deepEqual(
        [...LIMITS[tier].channels].sort(),
        [...TIER_CHANNELS[tier]].sort(),
        `the bot and the web app disagree about ${tier}`,
      );
    }
  });

  it('agrees with the dashboard about the memory ceiling', () => {
    // The dashboard draws a meter against its copy. A meter quoting a
    // different ceiling from the one that refuses the write is worse than no
    // meter at all — someone watches 1,800 of 2,000 and gets refused at 1,500.
    for (const tier of ['keep', 'archive'] as const) {
      assert.equal(LIMITS[tier].memories, TIER_MEMORY_CAP[tier], `disagreed about ${tier}`);
    }
  });

  it('keeps Keep on Telegram alone', () => {
    assert.deepEqual(LIMITS.keep.channels, ['telegram']);
    assert.equal(LIMITS.keep.channels.includes('whatsapp' as never), false);
  });

  it('caps Keep and leaves Archive uncapped', () => {
    assert.equal(LIMITS.keep.memories, 2_000);
    assert.equal(LIMITS.archive.memories, null);
  });

  it('keeps recurring reminders and quiet hours for Archive', () => {
    assert.equal(LIMITS.keep.recurringReminders, false);
    assert.equal(LIMITS.keep.quietHours, false);
    assert.equal(LIMITS.archive.recurringReminders, true);
    assert.equal(LIMITS.archive.quietHours, true);
  });
});

describe('resolving a price to a plan', () => {
  it('recognises both cycles of each tier', () => {
    assert.equal(tierForPrice('pri_keep_month', PRICES), 'keep');
    assert.equal(tierForPrice('pri_keep_year', PRICES), 'keep');
    assert.equal(tierForPrice('pri_archive_year', PRICES), 'archive');
  });

  it('gives an unrecognised price the most generous plan, never the cheapest', () => {
    // The catalogue moved under a live subscription. Guessing "keep" would cap
    // a paying customer's memory and withdraw features they are paying for.
    assert.equal(tierForPrice('pri_something_new', PRICES), null);
    assert.deepEqual(limitsForPrice('pri_something_new', PRICES), LIMITS.archive);
  });

  it('treats unconfigured price ids as Archive, so a missed env var never caps anyone', () => {
    assert.deepEqual(limitsForPrice('pri_keep_month', { keep: [], archive: [] }), LIMITS.archive);
  });
});
