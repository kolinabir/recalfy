import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { strangerWelcome } from '../src/channels/stranger';

/**
 * Someone who found the bot before the website. They cannot be identified, so
 * the only thing this has to get right is that they are answered — every time,
 * because a second silence is what teaches them the bot is broken — and told
 * the two steps in the order they happen.
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
