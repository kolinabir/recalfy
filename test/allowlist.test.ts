import assert from 'node:assert/strict';
import test from 'node:test';

import { Allowlist } from '../src/telegram/allowlist';

test('refuses to build an empty allowlist', () => {
  assert.throws(() => new Allowlist(['', '  ']), /refusing to start with an open bot/);
});

test('admits a numeric id', () => {
  const allowlist = new Allowlist(['123', '456']);

  assert.equal(allowlist.admits({ id: 123 }), true);
  assert.equal(allowlist.admits({ id: 789 }), false);
});

test('admits a username regardless of @ or case', () => {
  const allowlist = new Allowlist(['@Abir122x']);

  assert.equal(allowlist.admits({ id: 1, username: 'abir122x' }), true);
  assert.equal(allowlist.admits({ id: 1, username: 'ABIR122X' }), true);
  assert.equal(allowlist.admits({ id: 1, username: 'someone_else' }), false);
});

test('rejects a sender with no id and no username', () => {
  assert.equal(new Allowlist(['123']).admits({}), false);
});

test('flags usernames as unresolved so they can be swapped for ids', () => {
  assert.equal(new Allowlist(['@abir122x']).hasUnresolvedUsernames, true);
  assert.equal(new Allowlist(['123']).hasUnresolvedUsernames, false);
});

test('counts ids and usernames together, ignoring blanks', () => {
  assert.equal(new Allowlist([' 123 ', '', '@abir122x']).size, 2);
});
