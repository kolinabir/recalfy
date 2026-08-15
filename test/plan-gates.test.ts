import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { describe, it } from 'node:test';

import { LIMITS } from '../src/billing/entitlements';
import { Paywall } from '../src/billing/paywall';
import { BadArguments } from '../src/brain/tools/args';
import { RememberTool } from '../src/brain/tools/remember.tool';
import { RemindTool } from '../src/brain/tools/remind.tool';
import { SetQuietHoursTool } from '../src/brain/tools/set-quiet-hours.tool';
import { ToolContext } from '../src/brain/tools/tool';
import { MemoryFull } from '../src/memory/memory.store';
import { ReminderDelivery } from '../src/reminders/reminder-delivery';

/**
 * The plan gates, exercised through the surface the model actually sees.
 *
 * A tool returns the sentence the model reads, so asserting on that sentence
 * is the real test: not "was the limit applied" but "was the model told
 * something that stops it lying to the user". Every gate here has the same
 * worst case — a confident "done!" over an operation that did not happen.
 */

function contextFor(limits = LIMITS.keep): ToolContext {
  return {
    userId: 'u1',
    timezone: 'Asia/Dhaka',
    onboarded: true,
    limits,
    now: new Date('2026-08-12T06:00:00Z'),
    saved: [],
    sourceMessageId: new ObjectId(),
  };
}

describe('the memory cap', () => {
  const toolWith = (store: unknown) => new RememberTool(store as never);

  it('tells the model in capitals that nothing was stored', async () => {
    const tool = toolWith({
      remember: () => Promise.reject(new MemoryFull(2000, 2000)),
    });

    const said = await tool.execute(contextFor(), { facts: [{ text: 'a fact' }] });

    assert.match(said, /NOT STORED/);
    assert.match(said, /2000/);
    // The two ways out, both of them named.
    assert.match(said, /forget/i);
    assert.match(said, /Archive/);
    assert.match(said, /Do not say it was saved/);
  });

  it('passes the plan ceiling down to the store, and null for unlimited', async () => {
    const seen: (number | null)[] = [];
    const tool = toolWith({
      remember: (_u: string, _f: unknown, _s: unknown, cap: number | null) => {
        seen.push(cap);
        return Promise.resolve([{ sid: 'a1', text: 'a fact' }]);
      },
    });

    await tool.execute(contextFor(LIMITS.keep), { facts: [{ text: 'x' }] });
    await tool.execute(contextFor(LIMITS.archive), { facts: [{ text: 'x' }] });

    assert.deepEqual(seen, [2_000, null]);
  });

  it('does not swallow unrelated failures as a full memory', async () => {
    const tool = toolWith({ remember: () => Promise.reject(new Error('mongo is down')) });

    await assert.rejects(
      () => tool.execute(contextFor(), { facts: [{ text: 'x' }] }),
      /mongo is down/,
    );
  });
});

describe('recurring reminders', () => {
  function toolWith(calls: unknown[]) {
    return new RemindTool({
      schedule: (...args: unknown[]) => {
        calls.push(args);
        return Promise.resolve({ _id: new ObjectId() });
      },
    } as never);
  }

  const args = {
    text: 'take the bins out',
    when: '2026-08-17T09:00:00+06:00',
    repeat: 'week',
  };

  it('still schedules the first occurrence on Keep, rather than refusing', async () => {
    const calls: unknown[] = [];
    const said = await toolWith(calls).execute(contextFor(LIMITS.keep), args);

    assert.equal(calls.length, 1, 'the reminder itself must still be set');
    // Fourth argument is the recurrence; undefined means a one-off row.
    assert.equal((calls[0] as unknown[])[3], undefined);
    assert.match(said, /ONE-OFF/);
    assert.match(said, /Do not imply it repeats/);
  });

  it('never tells the model a cadence it did not store', async () => {
    const said = await toolWith([]).execute(contextFor(LIMITS.keep), args);
    assert.equal(/repeating every/.test(said), false);
  });

  it('stores the recurrence on Archive and says the cadence', async () => {
    const calls: unknown[] = [];
    const said = await toolWith(calls).execute(contextFor(LIMITS.archive), args);

    assert.deepEqual((calls[0] as unknown[])[3], {
      repeat: { unit: 'week', interval: 1 },
      tz: 'Asia/Dhaka',
    });
    assert.match(said, /repeating/);
    assert.equal(/ONE-OFF/.test(said), false);
  });
});

describe('quiet hours', () => {
  function toolWith(saved: unknown[]) {
    return new SetQuietHoursTool({
      ensure: () => Promise.resolve({ quiet: undefined }),
      setQuietHours: (_u: string, quiet: unknown) => {
        saved.push(quiet);
        return Promise.resolve();
      },
    } as never);
  }

  it('refuses on Keep without pretending anything was set', async () => {
    const saved: unknown[] = [];
    const said = await toolWith(saved).execute(contextFor(LIMITS.keep), {
      enabled: true,
      from: '22:00',
      to: '08:00',
    });

    assert.equal(saved.length, 0, 'nothing may be written');
    assert.match(said, /NOT SET/);
    assert.match(said, /Do not pretend it is set/);
  });

  it('stores the window on Archive and reads it back in plain words', async () => {
    const saved: unknown[] = [];
    const said = await toolWith(saved).execute(contextFor(LIMITS.archive), {
      enabled: true,
      from: '22:00',
      to: '08:00',
    });

    assert.deepEqual(saved, [{ from: 22, to: 8 }]);
    assert.match(said, /10pm and 8am/);
  });

  it('refuses a window that starts and ends at the same hour', async () => {
    await assert.rejects(
      () =>
        toolWith([]).execute(contextFor(LIMITS.archive), {
          enabled: true,
          from: '09:00',
          to: '09:00',
        }),
      BadArguments,
    );
  });

  it('clears the window when turned off', async () => {
    const saved: unknown[] = [];
    await toolWith(saved).execute(contextFor(LIMITS.archive), { enabled: false });
    assert.deepEqual(saved, [undefined]);
  });
});

describe('the channel gate', () => {
  function paywallFor(limits: unknown, sent: string[]) {
    return new Paywall(
      { limitsFor: () => Promise.resolve(limits) } as never,
      { reply: (_u: string, text: string) => void sent.push(text) } as never,
    );
  }

  it('turns a Keep account away from WhatsApp and says why', async () => {
    const sent: string[] = [];
    const paywall = paywallFor(LIMITS.keep, sent);

    assert.equal(await paywall.admit('u1', 'whatsapp'), null);
    assert.equal(sent.length, 1);
    assert.match(sent[0], /plan covers Telegram/);
    // The reassurance matters as much as the refusal: this reads as data loss.
    assert.match(sent[0], /still there/);
  });

  it('lets the same account through on Telegram', async () => {
    const sent: string[] = [];
    const limits = await paywallFor(LIMITS.keep, sent).admit('u1', 'telegram');

    assert.deepEqual(limits, LIMITS.keep);
    assert.equal(sent.length, 0, 'a permitted message must never be answered by the gate');
  });

  it('lets Archive in on both', async () => {
    const sent: string[] = [];
    const paywall = paywallFor(LIMITS.archive, sent);

    assert.deepEqual(await paywall.admit('u1', 'telegram'), LIMITS.archive);
    assert.deepEqual(await paywall.admit('u1', 'whatsapp'), LIMITS.archive);
    assert.equal(sent.length, 0);
  });

  it('explains itself once a day, not once a message', async () => {
    const sent: string[] = [];
    const paywall = paywallFor(null, sent);

    for (let i = 0; i < 5; i++) await paywall.admit('u1', 'telegram');

    assert.equal(sent.length, 1);
    assert.match(sent[0], /Nothing has been deleted/);
  });

  it('never sends an unprompted message over a chat the plan does not cover', async () => {
    // The expensive direction: a WhatsApp template outside the 24-hour window
    // is billed to us. An account that connected WhatsApp on Archive and then
    // moved to Keep still has a live link, and `notify` would happily use it.
    const sent: { text: string; allowed?: readonly string[] }[] = [];
    const outbox = {
      notify: (_u: string, text: string, allowed?: readonly string[]) =>
        void sent.push({ text, allowed }),
    };

    const delivery = new ReminderDelivery(
      [],
      { onDue: () => {} } as never,
      {} as never,
      outbox as never,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (delivery as any).send(
      { userId: 'u1', text: 'bins', _id: { toHexString: () => 'r1' } },
      LIMITS.keep,
    );

    assert.deepEqual(sent[0].allowed, ['telegram']);
    assert.equal(sent[0].allowed?.includes('whatsapp'), false);
  });

  it('keeps the cooldown per account, so one lapsed user never mutes another', async () => {
    const sent: string[] = [];
    const paywall = paywallFor(null, sent);

    await paywall.admit('u1', 'telegram');
    await paywall.admit('u2', 'telegram');

    assert.equal(sent.length, 2);
  });
});
