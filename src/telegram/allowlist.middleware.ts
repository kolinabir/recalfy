import { Logger } from '@nestjs/common';
import type { Context, MiddlewareFn } from 'grammy';

import { Allowlist } from './allowlist';

/**
 * The webhook URL is public and the bot username is discoverable. This runs
 * before persistence and before any model call, so everything downstream may
 * assume the sender is the owner.
 */
export function allowlistOnly(allowlist: Allowlist, logger: Logger): MiddlewareFn<Context> {
  return async (ctx, next) => {
    if (!allowlist.admits({ id: ctx.from?.id, username: ctx.from?.username })) {
      logger.warn(`Dropped update from unauthorised sender ${describe(ctx)}`);
      return;
    }
    await next();
  };
}

function describe(ctx: Context): string {
  const { id, username } = ctx.from ?? {};
  if (id === undefined) return 'unknown';
  return username ? `${id} (@${username})` : String(id);
}
