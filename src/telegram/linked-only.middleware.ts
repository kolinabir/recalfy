import { Logger } from '@nestjs/common';
import type { Context, MiddlewareFn } from 'grammy';

import { LinkStore } from './link.store';

/** `/start <token>` — the one message an unlinked stranger may send. */
const START_WITH_TOKEN = /^\/start(?:@\w+)?\s+(\S+)$/;

export function parseStartToken(text: string | undefined): string | null {
  const match = text?.match(START_WITH_TOKEN);
  return match ? match[1] : null;
}

/**
 * The webhook URL is public and the bot username is discoverable, so this runs
 * before persistence and before any model call — everything downstream may
 * assume the sender owns a linked account.
 *
 * The exception is the handshake itself: a person connecting for the first
 * time is by definition not linked yet, so `/start <token>` passes through and
 * the token is the credential. Every other message from an unlinked sender is
 * dropped, and a bare `/start` gets a pointer to the site rather than silence.
 */
export function linkedOnly(links: LinkStore, logger: Logger): MiddlewareFn<Context> {
  return async (ctx, next) => {
    const senderId = ctx.from?.id;
    if (senderId === undefined) return;

    if (parseStartToken(ctx.message?.text)) {
      await next();
      return;
    }

    if (await links.isLinked(senderId)) {
      await next();
      return;
    }

    logger.warn(`Dropped update from unlinked sender ${describe(ctx)}`);

    // A bare /start is someone who found the bot before the website. Answer
    // once — staying silent reads as broken, and this leaks nothing.
    if (ctx.message?.text?.startsWith('/start')) {
      await ctx.reply(
        'This account isn\'t connected yet.\n\n' +
          'Sign in at recalfy.com and press "Connect Telegram" — that link brings you back here and finishes the setup.',
      );
    }
  };
}

function describe(ctx: Context): string {
  const { id, username } = ctx.from ?? {};
  if (id === undefined) return 'unknown';
  return username ? `${id} (@${username})` : String(id);
}
