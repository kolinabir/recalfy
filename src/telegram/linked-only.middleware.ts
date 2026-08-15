import { Logger } from '@nestjs/common';
import type { Context, MiddlewareFn } from 'grammy';

import { Cooldown } from '../channels/cooldown';
import { LinkStore } from '../channels/link.store';
import { strangerWelcome } from '../channels/stranger';

/** One explanation a day is plenty; the second one is nagging. */
const WELCOME_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** `/start <token>` — a deep link arriving back from the website. */
const START_WITH_TOKEN = /^\/start(?:@\w+)?\s+(\S+)$/;

/** `/code` — the manual fallback, when no link or QR was usable. */
const CODE_COMMAND = /^\/code(?:@\w+)?$/;

export function parseStartToken(text: string | undefined): string | null {
  const match = text?.match(START_WITH_TOKEN);
  return match ? match[1] : null;
}

export function isCodeRequest(text: string | undefined): boolean {
  return text !== undefined && CODE_COMMAND.test(text.trim());
}

/**
 * The two messages an unlinked stranger may send. Both are narrow by design:
 * everything else from an unlinked sender is dropped before it can reach
 * storage or a model call.
 */
function isHandshake(text: string | undefined): boolean {
  return parseStartToken(text) !== null || isCodeRequest(text);
}

/**
 * The webhook URL is public and the bot username is discoverable, so this runs
 * before persistence and before any model call — everything downstream may
 * assume the sender owns a linked account.
 *
 * The exception is the handshake itself: a person connecting for the first
 * time is by definition not linked yet, so `/start <token>` passes through and
 * the token is the credential. Every other message from an unlinked sender is
 * dropped — but answered once a day with a pointer to the site, because
 * silence is indistinguishable from a broken bot to the one person here who
 * has done nothing wrong.
 */
export function linkedOnly(links: LinkStore, logger: Logger): MiddlewareFn<Context> {
  const welcomed = new Cooldown(WELCOME_COOLDOWN_MS);

  return async (ctx, next) => {
    const senderId = ctx.from?.id;
    if (senderId === undefined) return;

    if (isHandshake(ctx.message?.text)) {
      await next();
      return;
    }

    // Inline queries gate themselves, in the adapter, and must not be dropped
    // here — an unlinked person needs the answer that carries the "connect"
    // button, and there is no chat to reply into from this middleware anyway.
    //
    // This is the one hole in "everything downstream owns a linked account",
    // so it is narrow on purpose: the inline handler resolves the sender
    // itself before it reads a single fact, and answers an empty list if it
    // cannot. Widening this condition without that check would serve one
    // person's memory to anyone who typed the bot's name.
    //
    // Button presses ride along for the same reason and under the same terms.
    // Telegram spins the button until the press is acknowledged, so dropping
    // one silently would leave someone who unlinked staring at a button that
    // never comes back — and the handler resolves the sender before it acts,
    // so an unlinked press acknowledges and does nothing.
    if (ctx.inlineQuery || ctx.callbackQuery) {
      await next();
      return;
    }

    if (await links.resolve({ channel: 'telegram', handle: String(senderId) })) {
      await next();
      return;
    }

    logger.warn(`Dropped update from unlinked sender ${describe(ctx)}`);

    // Only messages. A stranger's button press or edited message is not a
    // question, and answering one would be talking to nobody.
    if (!ctx.message) return;

    // Rate-limited by sender, so someone typing five lines into what they
    // think is a broken bot gets one explanation rather than five.
    if (welcomed.allow(String(senderId))) {
      await ctx.reply(strangerWelcome('telegram'));
    }
  };
}

function describe(ctx: Context): string {
  const { id, username } = ctx.from ?? {};
  if (id === undefined) return 'unknown';
  return username ? `${id} (@${username})` : String(id);
}
