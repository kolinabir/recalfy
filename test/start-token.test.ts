import assert from 'node:assert/strict';
import test from 'node:test';

import { parseStartToken } from '../src/telegram/linked-only.middleware';

// This is the one message an unlinked stranger is allowed to send, so what
// counts as "a /start carrying a token" is a security boundary, not parsing
// trivia: too loose and unlinked senders reach the assistant.

test('reads the payload out of a /start', () => {
  assert.equal(parseStartToken('/start abc123'), 'abc123');
});

test('accepts the @botname form Telegram uses in groups', () => {
  assert.equal(parseStartToken('/start@tele_memorybot abc123'), 'abc123');
});

test('accepts a full-length base64url token', () => {
  const token = 'a'.repeat(43);
  assert.equal(parseStartToken(`/start ${token}`), token);
});

test('accepts base64url punctuation', () => {
  assert.equal(parseStartToken('/start aB3-_x'), 'aB3-_x');
});

test('a bare /start carries nothing', () => {
  assert.equal(parseStartToken('/start'), null);
  assert.equal(parseStartToken('/start   '), null);
});

test('ignores an ordinary message that merely mentions start', () => {
  assert.equal(parseStartToken('start the timer'), null);
  assert.equal(parseStartToken('please /start something for me'), null);
});

test('refuses a second word — no smuggling extra arguments', () => {
  assert.equal(parseStartToken('/start abc def'), null);
});

test('undefined text is not a handshake', () => {
  assert.equal(parseStartToken(undefined), null);
});
