import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InboundMessage } from '../src/channels/channel';
import { mergeTurn, turnKey } from '../src/bot/merge-turn';
import { TurnQueue } from '../src/bot/turn-queue';

/**
 * The bug both of these exist for: "Interview on tomorrow" and a forwarded
 * note about it, sent a second apart, were answered as two turns. Neither
 * could see the other's writes, so both scheduled the same 8am reminder and
 * the user got two replies.
 */

const BASE: InboundMessage = {
  userId: '6a7b3336c547f2eb039f55d4',
  address: { channel: 'telegram', handle: '1228558424' },
  text: '',
  messageId: '1',
  receivedAt: new Date('2026-08-20T10:26:00Z'),
};

function said(text: string, extra: Partial<InboundMessage> = {}): InboundMessage {
  return { ...BASE, text, ...extra };
}

/** Short windows so the tests run on real timers without being slow or flaky. */
const WINDOW = 20;

function collector(window = WINDOW) {
  const turns: InboundMessage[][] = [];
  const queue = new TurnQueue<InboundMessage>(
    async (messages) => {
      turns.push(messages);
    },
    (error) => {
      throw error;
    },
    window,
  );
  return { turns, queue };
}

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('mergeTurn', () => {
  it('hands back the only message untouched when there is just one', () => {
    const one = said('rent is due on the 5th');
    assert.equal(mergeTurn([one]), one);
  });

  it('joins a burst into one text, in the order it was typed', () => {
    const merged = mergeTurn([said('Interview on tomorrow'), said('at 3pm')]);
    assert.equal(merged.text, 'Interview on tomorrow\n\nat 3pm');
  });

  it('separates a forward from what follows it with a blank line', () => {
    // A single newline would read as a third line of the forwarded message,
    // and the header's attribution would cover text it does not own.
    const merged = mergeTurn([
      said('Interview on tomorrow'),
      said('Forwarded from Arafat (sent 3 Dec 2025, 11:47 UTC):\nJob is important for us now'),
    ]);

    assert.match(merged.text, /tomorrow\n\nForwarded from Arafat/);
  });

  it('answers under the message they finished on', () => {
    // The reply belongs at the bottom of the burst, in the thread it ended in.
    const merged = mergeTurn([
      said('one', { messageId: '10', threadId: 4 }),
      said('two', { messageId: '11', threadId: 7, receivedAt: new Date('2026-08-20T10:26:09Z') }),
    ]);

    assert.equal(merged.messageId, '11');
    assert.equal(merged.threadId, 7);
    assert.equal(merged.receivedAt.toISOString(), '2026-08-20T10:26:09.000Z');
  });

  it('drops blank messages rather than leaving gaps in the text', () => {
    assert.equal(mergeTurn([said('one'), said('   '), said('two')]).text, 'one\n\ntwo');
  });
});

describe('turnKey', () => {
  it('keeps two channels apart, so a burst never merges across chats', () => {
    const telegram = said('hi');
    const whatsapp = said('hi', { address: { channel: 'whatsapp', handle: '8801' } });
    assert.notEqual(turnKey(telegram), turnKey(whatsapp));
  });

  it('keeps threads apart, for the same reason', () => {
    assert.notEqual(turnKey(said('hi', { threadId: 4 })), turnKey(said('hi', { threadId: 7 })));
  });
});

describe('TurnQueue', () => {
  it('answers a burst once', async () => {
    const { turns, queue } = collector();

    queue.add('k', said('Interview on tomorrow'));
    await settle(5);
    queue.add('k', said('Job is important for us now'));

    await settle(WINDOW * 3);
    assert.equal(turns.length, 1);
    assert.equal(turns[0].length, 2);
  });

  it('treats a later message as its own turn once the window has passed', async () => {
    const { turns, queue } = collector();

    queue.add('k', said('first'));
    await settle(WINDOW * 3);
    queue.add('k', said('second'));
    await settle(WINDOW * 3);

    assert.deepEqual(
      turns.map((turn) => turn.map((m) => m.text)),
      [['first'], ['second']],
    );
  });

  it('never runs two turns for one conversation at the same time', async () => {
    // The actual bug: overlapping turns read the same memory and both write.
    let running = 0;
    let overlapped = false;
    const queue = new TurnQueue<InboundMessage>(
      async () => {
        running += 1;
        if (running > 1) overlapped = true;
        await settle(WINDOW * 2);
        running -= 1;
      },
      (error) => {
        throw error;
      },
      WINDOW,
    );

    queue.add('k', said('first'));
    await settle(WINDOW * 2);
    queue.add('k', said('second'));
    await settle(WINDOW * 8);

    assert.equal(overlapped, false);
  });

  it('runs different conversations side by side', async () => {
    // Serialising is per conversation. One slow turn must not hold up someone
    // else's, and on one box that would otherwise be everybody's.
    const started: string[] = [];
    const queue = new TurnQueue<InboundMessage>(
      async (messages) => {
        started.push(messages[0].text);
        await settle(WINDOW * 4);
      },
      (error) => {
        throw error;
      },
      WINDOW,
    );

    queue.add('a', said('from a'));
    queue.add('b', said('from b'));
    await settle(WINDOW * 3);

    assert.deepEqual(started.sort(), ['from a', 'from b']);
  });

  it('closes the batch early rather than letting a paste-bomb defer the reply', async () => {
    const { turns, queue } = collector(10_000);
    for (let i = 0; i < 10; i += 1) queue.add('k', said(`line ${i}`));

    await settle(20);
    assert.equal(turns.length, 1, 'should not have waited out the ten-second window');
    assert.equal(turns[0].length, 10);
  });

  it('lets the next turn run after one throws', async () => {
    // A turn that dies must not poison the ones queued behind it.
    const seen: string[] = [];
    const errors: unknown[] = [];
    const queue = new TurnQueue<InboundMessage>(
      async (messages) => {
        seen.push(messages[0].text);
        if (messages[0].text === 'boom') throw new Error('model exploded');
      },
      (error) => errors.push(error),
      WINDOW,
    );

    queue.add('k', said('boom'));
    await settle(WINDOW * 3);
    queue.add('k', said('after'));
    await settle(WINDOW * 3);

    assert.deepEqual(seen, ['boom', 'after']);
    assert.equal(errors.length, 1);
  });
});
