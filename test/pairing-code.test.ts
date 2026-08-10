import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatPairingCode,
  generatePairingCode,
  normalisePairingCode,
} from '../src/channels/pairing-code';

// The code is read off one screen and typed into another, so normalisation is
// the difference between "wrong code" and "you typed an O instead of a zero".

test('generates 8 symbols from the Crockford alphabet', () => {
  for (let i = 0; i < 200; i += 1) {
    const code = generatePairingCode();
    assert.equal(code.length, 8);
    assert.match(code, /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/);
  }
});

test('never emits the characters people misread', () => {
  for (let i = 0; i < 500; i += 1) {
    assert.doesNotMatch(generatePairingCode(), /[ILOU]/);
  }
});

test('groups the code for display', () => {
  assert.equal(formatPairingCode('K7M2QX9F'), 'K7M2-QX9F');
});

test('accepts the code exactly as displayed', () => {
  assert.equal(normalisePairingCode('K7M2-QX9F'), 'K7M2QX9F');
});

test('forgives casing, spaces and stray punctuation', () => {
  assert.equal(normalisePairingCode('k7m2 qx9f'), 'K7M2QX9F');
  assert.equal(normalisePairingCode('  K7M2—QX9F  '), 'K7M2QX9F');
});

test("reads O as zero and I or L as one, the way Crockford's alphabet intends", () => {
  assert.equal(normalisePairingCode('O7M2QX9F'), '07M2QX9F');
  assert.equal(normalisePairingCode('I7M2QX9F'), '17M2QX9F');
  assert.equal(normalisePairingCode('L7M2QX9F'), '17M2QX9F');
});

test('rejects anything that is not eight symbols', () => {
  assert.equal(normalisePairingCode('K7M2QX9'), null);
  assert.equal(normalisePairingCode('K7M2QX9FG'), null);
  assert.equal(normalisePairingCode(''), null);
});

test('rejects U, which the alphabet deliberately omits', () => {
  assert.equal(normalisePairingCode('U7M2QX9F'), null);
});

test('a generated code survives a round trip through display and typing', () => {
  for (let i = 0; i < 100; i += 1) {
    const code = generatePairingCode();
    assert.equal(normalisePairingCode(formatPairingCode(code).toLowerCase()), code);
  }
});
