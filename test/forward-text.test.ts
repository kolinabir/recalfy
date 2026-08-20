import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FORWARD_PREFIX, withForwardOrigin } from '../src/telegram/forward-text';

/**
 * A forward becomes text at the edge, and that text is the whole contract
 * between Telegram and the rest of the product. Get the attribution wrong here
 * and somebody else's plans are filed as the user's own — the bug this exists
 * to fix, and one nothing downstream can detect.
 */

/** 14 Aug 2026, 09:12 UTC. */
const SENT = 1_786_698_720;

describe('withForwardOrigin', () => {
  it('leaves an ordinary message exactly as typed', () => {
    // The common path by far: no origin, no prefix, no behaviour change.
    assert.equal(withForwardOrigin(undefined, 'rent is due on the 5th'), 'rent is due on the 5th');
  });

  it('names the sender and when they sent it', () => {
    assert.equal(
      withForwardOrigin(
        { type: 'user', date: SENT, sender_user: { first_name: 'Sara', last_name: 'Ahmed' } },
        "I'll bring the cake Saturday",
      ),
      "Forwarded from Sara Ahmed (sent 14 Aug 2026, 09:12 UTC):\nI'll bring the cake Saturday",
    );
  });

  it('puts the message on its own line, so a long forward is not read as the header', () => {
    const said = withForwardOrigin(
      { type: 'user', date: SENT, sender_user: { first_name: 'Sara' } },
      'first sentence. second sentence.',
    );

    assert.equal(said.split('\n')[1], 'first sentence. second sentence.');
  });

  it('uses the name of a sender who does not allow linking back', () => {
    const said = withForwardOrigin(
      { type: 'hidden_user', date: SENT, sender_user_name: 'Rahim' },
      'water bill went up',
    );

    assert.match(said, /^Forwarded from Rahim \(sent /);
  });

  it('names the group or channel when the message came from one', () => {
    const group = withForwardOrigin(
      { type: 'chat', date: SENT, sender_chat: { title: 'Flat 4B' } },
      'gas off tomorrow 9-5',
    );
    const channel = withForwardOrigin(
      { type: 'channel', date: SENT, chat: { title: 'Dhaka Traffic' } },
      'Gulshan 2 closed',
    );

    assert.match(group, /^Forwarded from Flat 4B \(/);
    assert.match(channel, /^Forwarded from Dhaka Traffic \(/);
  });

  it('adds the signature on a signed channel post', () => {
    const said = withForwardOrigin(
      { type: 'channel', date: SENT, chat: { title: 'Recalfy News' }, author_signature: 'Kolin' },
      'shipped today',
    );

    assert.match(said, /^Forwarded from Recalfy News — Kolin \(/);
  });

  it('does not repeat a signature that is already the name', () => {
    const said = withForwardOrigin(
      { type: 'channel', date: SENT, chat: { title: 'Kolin' }, author_signature: 'Kolin' },
      'shipped today',
    );

    assert.match(said, /^Forwarded from Kolin \(/);
  });

  it('falls back to a username, then to someone, rather than an empty name', () => {
    // Telegram types every one of these as optional, and a blank string is not
    // a name — "Forwarded from  (sent…)" would read as a bug to the user.
    assert.match(
      withForwardOrigin({ type: 'user', date: SENT, sender_user: { username: 'sara' } }, 'hi'),
      /^Forwarded from sara \(/,
    );
    assert.match(
      withForwardOrigin({ type: 'user', date: SENT, sender_user: { first_name: '  ' } }, 'hi'),
      /^Forwarded from someone \(/,
    );
    assert.match(withForwardOrigin({ type: 'chat', date: SENT }, 'hi'), /^Forwarded from someone \(/);
  });

  it('states the original send date, not today', () => {
    // What makes "I'll bring it tomorrow" resolvable at all. A forward read
    // against today's date is a reminder set on the wrong day.
    assert.match(
      withForwardOrigin({ type: 'user', date: SENT, sender_user: { first_name: 'Sara' } }, 'x'),
      /\(sent 14 Aug 2026, 09:12 UTC\):/,
    );
  });

  it('always opens with the prefix the system prompt keys on', () => {
    // The prompt rule matches this exact opening; drift here turns a forward
    // back into words the model will attribute to the user.
    assert.ok(
      withForwardOrigin(
        { type: 'user', date: SENT, sender_user: { first_name: 'Sara' } },
        'x',
      ).startsWith(FORWARD_PREFIX),
    );
  });
});
