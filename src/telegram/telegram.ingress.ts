import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Bot } from 'grammy';
import type { Update } from 'grammy/types';

import { ENV, Env } from '../config/env';
import { Allowlist } from './allowlist';
import { allowlistOnly } from './allowlist.middleware';
import { InboundHandler, Ingress } from './ingress';

/**
 * grammY, wrapped. Used raw rather than through a decorator module: those add
 * interface surface while hiding nothing, and this is the whole of the glue.
 */
@Injectable()
export class TelegramIngress extends Ingress implements OnModuleInit {
  private readonly logger = new Logger(TelegramIngress.name);
  private readonly bot: Bot;
  private readonly allowlist: Allowlist;
  private readonly handlers: InboundHandler[] = [];

  constructor(@Inject(ENV) env: Env) {
    super();
    this.bot = new Bot(env.botToken);
    this.allowlist = env.allowlist;
  }

  async onModuleInit(): Promise<void> {
    this.bot.use(allowlistOnly(this.allowlist, this.logger));
    this.bot.on('message:text', (ctx) =>
      this.fanOut({
        userId: ctx.from.id,
        text: ctx.message.text,
        messageId: ctx.message.message_id,
        receivedAt: new Date(),
      }),
    );
    this.bot.catch((error) => this.logger.error(`Unhandled bot error: ${error.message}`));

    // Populates bot.botInfo; required before handleUpdate in webhook mode.
    await this.bot.init();
    this.logger.log(`@${this.bot.botInfo.username} ready — ${this.allowlist.size} allowed sender(s)`);
    if (this.allowlist.hasUnresolvedUsernames) {
      this.logger.warn(
        'Allowlist contains usernames. Usernames can be released and re-registered by someone ' +
          'else — run `npm run whoami` and replace them with numeric ids.',
      );
    }
  }

  onMessage(handler: InboundHandler): void {
    this.handlers.push(handler);
  }

  async send(userId: number, text: string): Promise<void> {
    await this.bot.api.sendMessage(userId, text);
  }

  async typing(userId: number): Promise<void> {
    try {
      await this.bot.api.sendChatAction(userId, 'typing');
    } catch {
      // Cosmetic only — never let it fail a real reply.
    }
  }

  /** Called by the controller once the request has already been acked. */
  async dispatch(update: Update): Promise<void> {
    await this.bot.handleUpdate(update);
  }

  private async fanOut(message: Parameters<InboundHandler>[0]): Promise<void> {
    for (const handler of this.handlers) {
      await handler(message);
    }
  }
}
