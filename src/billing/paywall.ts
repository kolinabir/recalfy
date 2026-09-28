import { Injectable, Logger } from '@nestjs/common';

import { Outbox } from '../channels/outbox';
import { siteLink } from '../config/site';
import { Channel, UserId } from '../mongo/collections';
import { Limits } from './entitlements';
import { Subscriptions } from './subscriptions';

// Functions, not constants: the link is read from the environment, and only a
// hosted install ever reaches these — a self-hosted one has no plans.
const billing = () => siteLink('/dashboard/billing') ?? 'the billing page';

const lapsedNotice = () =>
  "Your Recalfy plan isn't active, so I've stopped picking up messages.\n\n" +
  'Nothing has been deleted — every fact, reminder and receipt is exactly ' +
  'where you left it, and it stays that way.\n\n' +
  `Start a plan at ${billing()} and I carry on mid-sentence.`;

const wrongChannelNotice = () =>
  "Your plan covers Telegram, so that's where I'm listening.\n\n" +
  'Everything you told me is still there — talk to me on Telegram and nothing ' +
  `is lost. Archive adds WhatsApp alongside it, sharing one memory: ${billing()}`;

/**
 * The gate between a linked account and everything that costs money — the
 * model call, the storage write, the WhatsApp template.
 *
 * Linking already requires a plan (the web app gates `/api/link/*`), but that
 * check happens once, at the door. Without this one, cancelling changed
 * nothing: the bot kept answering, kept firing reminders, and kept sending the
 * daily brief, indefinitely and at our expense.
 *
 * Both methods return the account's `Limits` rather than a boolean, so the
 * caller that asks "may I serve this?" gets "and here is what they may do" in
 * the same round trip — which is why no tool needs a billing dependency.
 */
@Injectable()
export class Paywall {
  private readonly logger = new Logger(Paywall.name);

  constructor(
    private readonly subscriptions: Subscriptions,
    private readonly outbox: Outbox,
  ) {}

  /**
   * For anything unprompted — a due reminder, the daily brief. Silent by
   * design: someone who stopped paying should not be pinged by the product
   * they stopped paying for, and a template send to a lapsed WhatsApp account
   * would be billed to us.
   */
  async permits(userId: UserId): Promise<Limits | null> {
    return this.subscriptions.limitsFor(userId);
  }

  /**
   * For a message the user just sent, on the channel they sent it from.
   * Returns their limits, or `null` when the message must be dropped.
   *
   * The channel matters because Keep is Telegram-only. The web app refuses to
   * mint a WhatsApp link for a Keep account, but that cannot cover the account
   * which linked WhatsApp on Archive and later moved down — their link is
   * still live, and this is the only thing standing in front of it.
   *
   * Runs *before* the message is logged or the model is called, which is the
   * point: a turned-away account costs one indexed read and, at most, one
   * message a day.
   */
  async admit(userId: UserId, channel: Channel): Promise<Limits | null> {
    const limits = await this.subscriptions.limitsFor(userId);

    if (!limits) {
      await this.notice(userId, lapsedNotice(), 'no active plan');
      return null;
    }

    if (!limits.channels.includes(channel)) {
      await this.notice(userId, wrongChannelNotice(), `${channel} not on their plan`);
      return null;
    }

    return limits;
  }

  /**
   * Every turned-away message gets the explanation, not the first one of the
   * day. Someone whose plan lapsed and who keeps typing is not being nagged —
   * they are asking again because nothing came back, and the second silence
   * teaches them the product is broken rather than unpaid.
   *
   * Sent through `reply`, which routes to a handle this account owns — never
   * back to the raw inbound address, so a message from an unlinked stranger
   * can never be answered here.
   */
  private async notice(userId: UserId, text: string, why: string): Promise<void> {
    this.logger.log(`Turned away ${userId}: ${why}`);
    await this.outbox.reply(userId, text);
  }
}
