import assert from 'node:assert/strict';
import test from 'node:test';

import { isCodeRequest } from '../src/telegram/linked-only.middleware';

// /code is the second thing an unlinked stranger may send, so what counts as
// one is a security boundary: anything looser lets unlinked senders through
// the gate on a message the handler will not consume.

test('accepts /code', () => {
  assert.equal(isCodeRequest('/code'), true);
});

test('accepts the @botname form and surrounding whitespace', () => {
  assert.equal(isCodeRequest('/code@tele_memorybot'), true);
  assert.equal(isCodeRequest('  /code  '), true);
});

test('refuses arguments — there is nothing to pass', () => {
  assert.equal(isCodeRequest('/code please'), false);
  assert.equal(isCodeRequest('/code K7M2-QX9F'), false);
});

test('refuses a longer command that merely starts with it', () => {
  assert.equal(isCodeRequest('/codes'), false);
  assert.equal(isCodeRequest('/codeword'), false);
});

test('an ordinary message mentioning the word is not a request', () => {
  assert.equal(isCodeRequest('what is the code'), false);
  assert.equal(isCodeRequest(undefined), false);
});
