import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import { RevealSecretTool } from '../src/brain/tools/reveal-secret.tool';
import { ToolContext, newTurnRecord } from '../src/brain/tools/tool';
import { LIMITS } from '../src/billing/entitlements';
import { MemoryStore } from '../src/memory/memory.store';
import {
  maskCredentials,
  openSealed,
  parseKey,
  protect,
  seal,
  secretValues,
} from '../src/memory/vault';
import { openSealed as openOnDashboard } from '../web/lib/vault';

const KEY = randomBytes(32);

describe('vault', () => {
  it('stores a credential masked, and opens back to the original', () => {
    const stored = protect(KEY, 'u1', 'Wifi password is hunter2.');
    assert.equal(stored.text, 'Wifi password is ••••••••.');
    assert.ok(stored.sealed);
    assert.ok(!stored.sealed.includes('hunter2'));
    assert.equal(openSealed(KEY, 'u1', stored.sealed), 'Wifi password is hunter2.');
  });

  it('leaves text with nothing to hide exactly as it was', () => {
    assert.deepEqual(protect(KEY, 'u1', 'Rent is due on the 5th.'), {
      text: 'Rent is due on the 5th.',
    });
    // Asking for a password is not giving one.
    assert.deepEqual(protect(KEY, 'u1', "what's my wifi password?"), {
      text: "what's my wifi password?",
    });
  });

  it('masks every line of a message, not just the first', () => {
    assert.equal(
      maskCredentials('Netflix password: abc\nremind me at 5\nbank PIN is 4417'),
      'Netflix password: ••••••••\nremind me at 5\nbank PIN is ••••••••',
    );
  });

  it('leaves ordinary sentences that merely mention a password alone', () => {
    // These are read back to the model on later turns; masking them would
    // garble the conversation, not protect anything.
    for (const text of [
      "what's my netflix password? also the plumber is coming at 5",
      'I changed my password yesterday and the new router is in the hall',
      'I forgot my PIN, can you remind me? the bank is closed today',
      "I don't know your password, is that something you'd like to save?",
      'Got it — the wifi password is saved.',
      'my PIN is the same as my birthday',
      'The home wifi password is ••••••••.',
    ]) {
      assert.equal(maskCredentials(text), text);
    }
  });

  it('still finds the value a few words after the credential word', () => {
    assert.equal(
      maskCredentials('the password for my gmail is abc123'),
      'the password for my gmail is ••••••••',
    );
    assert.equal(
      maskCredentials("The WiFi password at Kolin's office is Th!s_is*complex."),
      "The WiFi password at Kolin's office is ••••••••.",
    );
  });

  it('pulls the values out of a message, stopping where the sentence moves on', () => {
    assert.deepEqual(secretValues('my wifi password is hunter2 and remind me at 5'), ['hunter2']);
    assert.deepEqual(secretValues('The recovery codes are 8812-4410, 9930-1123.'), [
      '8812-4410, 9930-1123',
      '8812-4410',
      '9930-1123',
    ]);
    assert.deepEqual(secretValues('what is my password?'), []);
  });

  it('hides a known value however the model reworded around it', () => {
    const known = secretValues('remind me to text Rafi the locker PIN is 5520');
    const stored = protect(KEY, 'u1', "I'll remind you to text Rafi the locker PIN (5520).", known);
    assert.equal(stored.text, "I'll remind you to text Rafi the locker PIN (••••••••).");
    assert.equal(openSealed(KEY, 'u1', stored.sealed!), "I'll remind you to text Rafi the locker PIN (5520).");
    // Only the value itself — a longer number that contains it is not it.
    assert.equal(protect(KEY, 'u1', 'Room 15520 is booked.', known).text, 'Room 15520 is booked.');
  });

  it('seals each value differently, so equal passwords do not look equal', () => {
    assert.notEqual(seal(KEY, 'u1', 'PIN is 1234'), seal(KEY, 'u1', 'PIN is 1234'));
  });

  it('will not open under another owner — a copied row does not leak across accounts', () => {
    const sealed = seal(KEY, 'u1', 'PIN is 1234');
    assert.throws(() => openSealed(KEY, 'u2', sealed));
  });

  it('will not open under another key, or once tampered with', () => {
    const sealed = seal(KEY, 'u1', 'PIN is 1234');
    assert.throws(() => openSealed(randomBytes(32), 'u1', sealed));
    const [v, iv, tag, data] = sealed.split('.');
    const flipped = Buffer.from(data, 'base64url');
    flipped[0] ^= 1;
    assert.throws(() => openSealed(KEY, 'u1', [v, iv, tag, flipped.toString('base64url')].join('.')));
  });

  it('rejects a key of the wrong size at boot, not at the first password', () => {
    assert.throws(() => parseKey('dG9vLXNob3J0'), /32 bytes/);
    assert.equal(parseKey(KEY.toString('base64')).length, 32);
  });

  it('seals what the dashboard can open — the web copy has not drifted', () => {
    const sealed = seal(KEY, 'u1', 'The API key for staging = sk-live-9911');
    assert.equal(openOnDashboard(KEY, 'u1', sealed), 'The API key for staging = sk-live-9911');
    assert.throws(() => openOnDashboard(KEY, 'u2', sealed));
  });
});

describe('reveal_secret', () => {
  function run(found: { sid: string; text: string; sealed: boolean }[]) {
    const store = { reveal: async () => found } as unknown as MemoryStore;
    const context: ToolContext = {
      userId: 'u1',
      timezone: 'UTC',
      limits: LIMITS.archive,
      onboarded: true,
      now: new Date(),
      sourceMessageId: undefined as never,
      secrets: [],
      turn: newTurnRecord(),
    };
    return new RevealSecretTool(store).execute(context, { ids: ['0k'] }).then((said) => ({
      said,
      turn: context.turn,
    }));
  }

  it('hands the value to the turn, and never to the model', async () => {
    const { said, turn } = await run([{ sid: '0k', text: 'Wifi password is hunter2.', sealed: true }]);
    assert.deepEqual(turn.revealed, ['Wifi password is hunter2.']);
    assert.ok(!said.includes('hunter2'), said);
  });

  it('says so when there was nothing hidden, and sends nothing', async () => {
    const { said, turn } = await run([{ sid: '03', text: 'Rent is due on the 5th.', sealed: false }]);
    assert.deepEqual(turn.revealed, []);
    assert.match(said, /Nothing hidden/);
  });

  it('sends nothing for ids that are gone', async () => {
    const { said, turn } = await run([]);
    assert.deepEqual(turn.revealed, []);
    assert.match(said, /nothing was sent/);
  });
});
