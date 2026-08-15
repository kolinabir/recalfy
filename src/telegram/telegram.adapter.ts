import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Bot, type Context } from 'grammy';
import type { Update } from 'grammy/types';

import { Subscriptions } from '../billing/subscriptions';
import { ChannelAdapter, InboundHandler } from '../channels/channel';
import { LinkStore } from '../channels/link.store';
import { formatPairingCode } from '../channels/pairing-code';
import { ENV, Env } from '../config/env';
import { MemoryStore } from '../memory/memory.store';
import { searchMemories } from '../memory/memory-search';
import { UserStore } from '../memory/user.store';
import { Address, Channel, Handle } from '../mongo/collections';
import {
  type InlineRefusal,
  PRIVATE_ANSWER,
  refusalButton,
  refusalReply,
  toInlineResults,
} from './inline';
import { linkedOnly, parseStartToken } from './linked-only.middleware';
import { describeSharedLocation } from './location-text';

/** Short: there is no walk-to-another-device delay in the manual flow. */
const PAIRING_TTL_MS = 5 * 60 * 1000;
const PAIRING_COOLDOWN_MS = 30 * 1000;

/** Telegram rejects messages over 4096 characters; a rendered memory will pass that. */
const MAX_MESSAGE_LENGTH = 4000;

/**
 * grammY, wrapped. Used raw rather than through a decorator module: those add
 * interface surface while hiding nothing, and this is the whole of the glue.
 */
@Injectable()
export class TelegramAdapter extends ChannelAdapter implements OnModuleInit {
  readonly channel: Channel = 'telegram';
  protected readonly maxMessageLength = MAX_MESSAGE_LENGTH;

  private readonly logger = new Logger(TelegramAdapter.name);
  private readonly bot: Bot;
  private readonly handlers: InboundHandler[] = [];

  constructor(
    @Inject(ENV) env: Env,
    private readonly links: LinkStore,
    private readonly memories: MemoryStore,
    private readonly users: UserStore,
    private readonly subscriptions: Subscriptions,
  ) {
    super();
    this.bot = new Bot(env.botToken);
  }

  async onModuleInit(): Promise<void> {
    this.bot.use(linkedOnly(this.links, this.logger));

    // Registered before the generic text handler so a handshake never reaches
    // the assistant as an ordinary message.
    this.bot.on('message:text', async (ctx, next) => {
      const token = parseStartToken(ctx.message.text);
      if (!token) return next();

      // The inline buttons come back through this same door. Left to the
      // handshake, "inline-off" would be tried as a pairing token and the
      // person told their link had expired — an answer to a question they
      // never asked, about a feature they were trying to turn on.
      const explanation = refusalReply(token);
      if (explanation) {
        await ctx.reply(explanation);
        return;
      }

      await this.completeLink(ctx, token);
    });

    this.bot.command('code', async (ctx) => {
      const address = this.addressOf(ctx.from!.id);

      if (await this.links.resolve(address)) {
        await ctx.reply('This chat is already connected. Send /unlink first if you want to move it.');
        return;
      }

      const wait = await this.links.pairingCooldown(address, PAIRING_COOLDOWN_MS);
      if (wait > 0) {
        await ctx.reply(`Hold on ${wait}s before asking for another code.`);
        return;
      }

      const code = await this.links.issuePairingCode(address, PAIRING_TTL_MS);
      await ctx.reply(
        `Your pairing code is\n\n${formatPairingCode(code)}\n\n` +
          `Type it into the "Connect manually" box on recalfy.com. It lasts ${PAIRING_TTL_MS / 60_000} minutes.\n\n` +
          'Nobody legitimate will ever ask you for this code — if someone did, ignore them.',
      );
    });

    this.bot.command('unlink', async (ctx) => {
      const email = await this.links.unlink(this.addressOf(ctx.from!.id));
      await ctx.reply(
        email
          ? `Disconnected from ${email}. I won't reply here until it's connected again.`
          : "This chat isn't connected to an account.",
      );
    });

    this.bot.on('message:text', async (ctx) => {
      const address = this.addressOf(ctx.from.id);
      const userId = await this.links.resolve(address);
      // The middleware already gated on this; belt and braces, since anything
      // downstream files memories under whatever id arrives here.
      if (!userId) return;

      await this.fanOut({
        userId,
        address,
        text: ctx.message.text,
        messageId: String(ctx.message.message_id),
        receivedAt: new Date(),
      });
    });

    /*
      A shared pin, turned into a sentence and sent down the ordinary path.

      Venue messages carry a `location` too, so this one filter catches both
      and the title is read off the message when Telegram supplied one — a
      second `message:venue` handler would double-file the same pin.

      Live locations arrive here as their first fix and then update through
      `edited_message`, which nothing subscribes to. That is deliberate: a
      fact that rewrites itself every thirty seconds is not a memory, so we
      keep the snapshot of where they were when they pressed send.
    */
    this.bot.on('message:location', async (ctx) => {
      const address = this.addressOf(ctx.from.id);
      const userId = await this.links.resolve(address);
      if (!userId) return;

      await this.fanOut({
        userId,
        address,
        text: describeSharedLocation(ctx.message.location, ctx.message.venue),
        messageId: String(ctx.message.message_id),
        receivedAt: new Date(),
      });
    });

    /*
      Inline mode: `@recalfy_bot rent` typed inside someone else's chat.

      This is the only path that answers without the user being in a chat with
      us, so it gates itself rather than relying on the middleware — see the
      note in linked-only.middleware.ts about why inline queries pass through
      it untouched.

      It is read-only by construction. The answer is a list of the person's own
      facts as plain text; tapping one sends it as their message. There is no
      tool call, no model call, and nothing here can change an account.
    */
    this.bot.on('inline_query', async (ctx) => {
      const startedAt = Date.now();
      const userId = await this.links.resolve(this.addressOf(ctx.from.id));
      if (!userId) {
        await this.refuseInline(ctx, 'unlinked');
        return;
      }

      // Silent: a lapsed account gets an empty list and a way back, not a
      // sales pitch typed into their conversation with somebody else.
      if (!(await this.subscriptions.limitsFor(userId))) {
        await this.refuseInline(ctx, 'lapsed');
        return;
      }

      // Answered together: this runs on every keystroke, and two Mongo round
      // trips in sequence is the difference between a list that keeps up with
      // typing and one that arrives after the person has given up.
      const [enabled, facts] = await Promise.all([
        this.users.inlineEnabled(userId),
        this.memories.facts(userId),
      ]);

      // Switched off in the dashboard. Says so rather than returning silence:
      // an empty panel is what a broken bot looks like, and someone who
      // forgot they turned this off would go looking for the bug in us.
      if (!enabled) {
        await this.refuseInline(ctx, 'off');
        return;
      }

      const hits = searchMemories(facts, ctx.inlineQuery.query);
      await ctx.answerInlineQuery(toInlineResults(hits), PRIVATE_ANSWER);
      // The only trace an inline query leaves. Never the query itself or what
      // matched: this is a lookup of someone's memory, and the timing is the
      // part worth keeping — a slow answer is an empty dropdown.
      this.logger.debug(`inline → ${hits.length} hit(s) in ${Date.now() - startedAt}ms`);
    });

    this.bot.catch((error) => this.logger.error(`Unhandled bot error: ${error.message}`));

    // Populates bot.botInfo; required before handleUpdate in webhook mode.
    await this.bot.init();
    this.logger.log(`@${this.bot.botInfo.username} ready — access is by linked account`);
  }

  /**
   * An empty list plus a button into the bot. Carries the same privacy flags
   * as a real answer: an empty result is still an answer about a specific
   * person, and caching "no results" across users would be its own small leak.
   */
  private async refuseInline(ctx: Context, refusal: InlineRefusal): Promise<void> {
    await ctx.answerInlineQuery([], { ...PRIVATE_ANSWER, button: refusalButton(refusal) });
  }

  private addressOf(telegramUserId: number): Address {
    return { channel: this.channel, handle: String(telegramUserId) };
  }

  private async completeLink(ctx: Context, token: string): Promise<void> {
    const result = await this.links.redeem(token, this.addressOf(ctx.from!.id));

    switch (result.status) {
      case 'linked':
        await ctx.reply(
          `Connected to ${result.email}.\n\n` +
            "Tell me anything you'd rather not hold in your head. If this wasn't you, send /unlink.",
        );
        return;
      case 'taken':
        await ctx.reply(
          `This Telegram account is already connected to ${result.email}. Send /unlink here first if you want to move it.`,
        );
        return;
      case 'account-linked':
        await ctx.reply(
          'That account is already connected to a different Telegram account. Disconnect it there first.',
        );
        return;
      case 'invalid':
        await ctx.reply(
          'That link has expired or was already used. Open recalfy.com and press "Connect Telegram" for a fresh one.',
        );
    }
  }

  onMessage(handler: InboundHandler): void {
    this.handlers.push(handler);
  }

  async send(handle: Handle, text: string): Promise<void> {
    await this.bot.api.sendMessage(handle, text);
  }

  /** Telegram draws no line between solicited and unsolicited messages. */
  async notify(handle: Handle, text: string): Promise<void> {
    await this.send(handle, text);
  }

  async typing(handle: Handle): Promise<void> {
    try {
      await this.bot.api.sendChatAction(handle, 'typing');
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
