import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Cooldown } from '../src/channels/cooldown';
import { strangerWelcome } from '../src/channels/stranger';

/**
 * Someone who found the bot before the website. They cannot be identified, so
 * the only thing this has to get right is that they are answered at all, once,
 * and told the two steps in the order they happen.
 */

describe('the welcome for a stranger', () => {
  it('says where to sign in and what to press', () => {
    const telegram = strangerWelcome('telegram');

    assert.match(telegram, /recalfy\.com\/login/);
    assert.match(telegram, /Connect Telegram/);
    assert.match(telegram, /\/code/, 'the manual fallback is the whole point of the third line');
  });

  it('names the right chat app and the right fallback on each channel', () => {
    const whatsapp = strangerWelcome('whatsapp');

    assert.match(whatsapp, /Connect WhatsApp/);
    assert.doesNotMatch(whatsapp, /Connect Telegram/);
    // WhatsApp has no slash commands — the code request is a plain word.
    assert.doesNotMatch(whatsapp, /\/code/);
  });

  /* It is sent to people we know nothing about, so it may contain nothing
     about anyone. */
  it('is the same paragraph for everyone', () => {
    assert.equal(strangerWelcome('telegram'), strangerWelcome('telegram'));
  });
});

describe('cooldown', () => {
  const MINUTE = 60_000;

  it('lets the first one through and holds the rest', () => {
    const cooldown = new Cooldown(MINUTE);

    assert.equal(cooldown.allow('a', 0), true);
    assert.equal(cooldown.allow('a', 1), false);
    assert.equal(cooldown.allow('a', MINUTE - 1), false);
  });

  it('opens again once the window has passed', () => {
    const cooldown = new Cooldown(MINUTE);

    cooldown.allow('a', 0);
    assert.equal(cooldown.allow('a', MINUTE), true);
  });

  /* Or one lapsed account would mute the notice for everyone else. */
  it('keeps its own window per key', () => {
    const cooldown = new Cooldown(MINUTE);

    assert.equal(cooldown.allow('a', 0), true);
    assert.equal(cooldown.allow('b', 0), true);
    assert.equal(cooldown.allow('a', 0), false);
  });
});
