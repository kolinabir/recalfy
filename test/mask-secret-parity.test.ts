import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { maskSecret } from '../src/telegram/mask-secret';
import { hasSecret, maskSecret as maskOnDashboard } from '../web/lib/mask-secret';

/**
 * The same rule lives twice: once for the Telegram inline dropdown, once for
 * the dashboard. They are separate npm packages and the web app deploys from
 * `web/` alone, so neither can import the other — which makes drift the only
 * real risk. A word added to one list and not the other means a fact that is
 * masked on your phone and legible on the screen behind you.
 *
 * This is that alarm. It is not a test of the masking itself; that lives in
 * inline.test.ts, against the surface it was written for.
 */

const CORPUS = [
  "Kolin's rent is due on the 5th of each month.",
  "The WiFi password at Kolin's office is Th!s_is*complex.",
  "The WiFi network at Kolin's studio is duckpond42.",
  "Kolin's spare key is with the neighbour in flat 4B (blue door).",
  'Netflix password is hunter2 and the login is kolin@viralspot.ai',
  'Wifi password: hunter2',
  'The bank PIN is 4417.',
  'The recovery codes are 8812-4410, 9930-1123.',
  'Kolin keeps his passport in the top drawer.',
  'The API key for the staging server = sk-live-9911',
  'Her passphrase is',
  'A secret',
  'the door code is 4417',
  '',
];

describe('mask-secret parity', () => {
  for (const text of CORPUS) {
    it(`agrees on ${JSON.stringify(text.slice(0, 46))}`, () => {
      assert.equal(maskOnDashboard(text), maskSecret(text));
    });
  }
});

describe('hasSecret', () => {
  /* This is what decides whether a row gets an eye at all. */
  it('is true exactly when something was hidden', () => {
    assert.equal(hasSecret('The bank PIN is 4417.'), true);
    assert.equal(hasSecret("Kolin's rent is due on the 5th of each month."), false);
    assert.equal(hasSecret('Kolin keeps his passport in the top drawer.'), false);
  });
});
