import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { Bot, InlineKeyboard, type Context } from 'grammy';
import type { Update } from 'grammy/types';

import { Subscriptions } from '../billing/subscriptions';
import {
  Action,
  ActionHandler,
  ChannelAdapter,
  InboundHandler,
  Outgoing,
} from '../channels/channel';
import { LinkStore } from '../channels/link.store';
import { formatPairingCode } from '../channels/pairing-code';
import { ENV, Env } from '../config/env';
import { siteLink } from '../config/site';
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
import { maskSecret } from './mask-secret';
import { withForwardOrigin } from './forward-text';
import { describeSharedLocation } from './location-text';

/** Short: there is no walk-to-another-device delay in the manual flow. */
const PAIRING_TTL_MS = 5 * 60 * 1000;
const PAIRING_COOLDOWN_MS = 30 * 1000;

/** Telegram rejects messages over 4096 characters; a rendered memory will pass that. */
const MAX_MESSAGE_LENGTH = 4000;

/**
 * How long a credential stays legible after the bot says it.
 *
 * Long enough to read a password across to another device and type it in;
 * short enough that it is not still sitting in the scrollback next week, when
 * the phone is unlocked on a table. Asking again is one sentence.
 */
const REDACT_AFTER_MS = 60_000;

/** Everything the bot handles. `npm run webhook:set` registers the same list. */
export const ALLOWED_UPDATES = ['message', 'inline_query', 'callback_query'] as const;

/** Telegram holds a long poll open this long when there is nothing to say. */
const POLL_TIMEOUT_S = 30;
const POLL_RETRY_MS = 5_000;

/**
 * grammY, wrapped. Used raw rather than through a decorator module: those add
 * interface surface while hiding nothing, and this is the whole of the glue.
 */
@Injectable()
export class TelegramAdapter
  extends ChannelAdapter
  implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown
{
  readonly channel: Channel = 'telegram';
  protected readonly maxMessageLength = MAX_MESSAGE_LENGTH;

  readonly streams: boolean;

  private readonly logger = new Logger(TelegramAdapter.name);
  private readonly bot: Bot;
  private readonly handlers: InboundHandler[] = [];
  private readonly actionHandlers: ActionHandler[] = [];
  private readonly buttons: boolean;
  private readonly polls: boolean;
  private readonly stopPolling = new AbortController();

  constructor(
    @Inject(ENV) env: Env,
    private readonly links: LinkStore,
    private readonly memories: MemoryStore,
    private readonly users: UserStore,
    private readonly subscriptions: Subscriptions,
  ) {
    super();
    this.bot = new Bot(env.botToken);
    this.streams = env.telegramStreaming;
    this.buttons = env.telegramButtons;
    this.polls = env.telegramMode === 'polling';
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
          `Type it into the "Connect manually" box on ${siteLink() ?? 'the website'}. It lasts ${PAIRING_TTL_MS / 60_000} minutes.\n\n` +
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
        // A forward is an ordinary text message with an origin attached. Left
        // alone it reads as something they said themselves — see forward-text.
        text: withForwardOrigin(ctx.message.forward_origin, ctx.message.text),
        messageId: String(ctx.message.message_id),
        threadId: ctx.message.message_thread_id,
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
        threadId: ctx.message.message_thread_id,
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

    /*
      A button press.

      Telegram spins the button until `answerCallbackQuery` comes back, so
      that is done first and unconditionally — an unanswered press looks
      broken for a full minute, whatever the outcome underneath.

      The payload names a row and nothing else. Who is allowed to touch that
      row is resolved here, from the linked account the press arrived on, and
      handed to the handler as a userId — the same identity a message would
      have carried.
    */
    this.bot.on('callback_query:data', async (ctx) => {
      await ctx.answerCallbackQuery().catch(() => {});

      const address = this.addressOf(ctx.from.id);
      const userId = await this.links.resolve(address);
      if (!userId) return;

      const action = {
        userId,
        address,
        data: ctx.callbackQuery.data,
        settle: (text: string) => this.settle(ctx, text),
      };

      for (const handler of this.actionHandlers) {
        if (await handler(action)) return;
      }

      // Nothing owned it: a button from a build that no longer exists. Take
      // the keyboard away rather than leave something tappable that does
      // nothing at all.
      this.logger.warn(`Unclaimed action: ${ctx.callbackQuery.data.slice(0, 32)}`);
      await this.settle(ctx, 'That button is from an older version and no longer works.');
    });

    this.bot.catch((error) => this.logger.error(`Unhandled bot error: ${error.message}`));

    // Populates bot.botInfo; required before handleUpdate in webhook mode.
    await this.bot.init();
    this.logger.log(`@${this.bot.botInfo.username} ready — access is by linked account`);
  }

  /**
   * Started only once every module is up, so the owner account exists and the
   * handlers are registered before the first update is read.
   */
  onApplicationBootstrap(): void {
    if (!this.polls) return;
    void this.poll();
  }

  onApplicationShutdown(): void {
    this.stopPolling.abort();
  }

  /**
   * Long polling, for installs with no public URL.
   *
   * A loop rather than grammY's `bot.start()`, which handles one update at a
   * time: a model call takes seconds, and every message behind it would wait.
   * Each update is dispatched without being awaited — the same treatment the
   * webhook controller gives them — and the per-user turn queue downstream is
   * what keeps one person's messages in order.
   */
  private async poll(): Promise<void> {
    // A webhook left over from another install makes getUpdates fail with 409.
    await this.bot.api.deleteWebhook().catch(() => {});
    this.logger.log('Polling Telegram for updates — no public URL needed');

    let offset = 0;
    const signal = this.stopPolling.signal;

    while (!signal.aborted) {
      try {
        const updates = await this.bot.api.getUpdates(
          { offset, timeout: POLL_TIMEOUT_S, allowed_updates: [...ALLOWED_UPDATES] },
          // grammY types its signal against the abort-controller polyfill;
          // the platform's own is what it actually uses at runtime.
          signal as unknown as Parameters<Bot['api']['getUpdates']>[1],
        );
        for (const update of updates) {
          offset = update.update_id + 1;
          void this.dispatch(update).catch((error: unknown) =>
            this.logger.error(
              `Failed handling update ${update.update_id}: ${error instanceof Error ? error.message : error}`,
            ),
          );
        }
      } catch (error) {
        if (signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        // 409 is the one worth spelling out: two installs sharing a token.
        const hint = message.includes('409') ? ' — is another copy of this bot running with the same token?' : '';
        this.logger.warn(`getUpdates failed: ${message}${hint}`);
        await new Promise((resolve) => setTimeout(resolve, POLL_RETRY_MS));
      }
    }
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
      case 'locked':
        await ctx.reply(
          'That account was locked down from the dashboard. Nothing can connect to it for ' +
            `another ${result.minutes} minute${result.minutes === 1 ? '' : 's'} — if that was you, try again then.`,
        );
        return;
      case 'invalid':
        await ctx.reply(
          `That link has expired or was already used. Open ${siteLink() ?? 'the website'} and press "Connect Telegram" for a fresh one.`,
        );
    }
  }

  onMessage(handler: InboundHandler): void {
    this.handlers.push(handler);
  }

  onAction(handler: ActionHandler): void {
    this.actionHandlers.push(handler);
  }

  async send(handle: Handle, { text, actions, threadId }: Outgoing): Promise<void> {
    const sent = await this.bot.api.sendMessage(handle, text, {
      ...this.keyboard(actions),
      // Replies land where the question was asked. Undefined is the main
      // thread, which is where every reply went before topics existed.
      ...(threadId !== undefined && { message_thread_id: threadId }),
    });

    this.scheduleRedaction(handle, sent.message_id, text);
  }

  /**
   * A password the bot has just said, taken back off the screen a minute later.
   *
   * The message is edited rather than deleted: deleting an answer leaves the
   * question hanging over nothing, and someone scrolling back should be able
   * to see that they did ask and did get told.
   *
   * Held in memory, not in the database. A restart inside that minute loses
   * the timer and the message stays legible — the honest tradeoff for not
   * putting every credential the bot utters into a second collection. Asking
   * again re-arms it.
   */
  private scheduleRedaction(handle: Handle, messageId: number, text: string): void {
    const masked = maskSecret(text);
    if (masked === text) return;

    const timer = setTimeout(() => {
      void this.bot.api.editMessageText(handle, messageId, masked).catch((error: unknown) => {
        // Edited by hand, deleted, or too old. All fine — the point was to
        // stop it being readable, and someone who deleted it agrees.
        this.logger.debug(`redaction skipped: ${error instanceof Error ? error.message : error}`);
      });
    }, REDACT_AFTER_MS);

    // A pending redaction must never be the reason the process stays alive.
    timer.unref?.();
  }

  /** Telegram draws no line between solicited and unsolicited messages. */
  async notify(handle: Handle, message: Outgoing): Promise<void> {
    await this.send(handle, message);
  }

  async typing(handle: Handle): Promise<void> {
    try {
      await this.bot.api.sendChatAction(handle, 'typing');
    } catch {
      // Cosmetic only — never let it fail a real reply.
    }
  }

  /**
   * The reply as it is being written. Empty text is not a no-op — Telegram
   * renders it as "Thinking…", which is what opens the frame before the model
   * has produced a word.
   *
   * A draft lives about thirty seconds and is superseded by the real message,
   * so nothing here needs cleaning up. Swallowing the error is the point: a
   * frame that fails to paint is invisible, while a throw would take the
   * answer down with it.
   */
  async draft(
    handle: Handle,
    draftId: number,
    text: string,
    threadId?: number,
  ): Promise<void> {
    const chatId = Number(handle);
    if (!Number.isSafeInteger(chatId)) return;

    try {
      await this.bot.api.sendMessageDraft(chatId, draftId, text.slice(0, MAX_MESSAGE_LENGTH), {
        // Painted in the thread it will land in, or it appears somewhere the
        // person is not looking and then the answer arrives elsewhere.
        ...(threadId !== undefined && { message_thread_id: threadId }),
      });
    } catch (error) {
      this.logger.debug(`draft dropped: ${error instanceof Error ? error.message : error}`);
    }
  }

  /*
    Topics, in the private chat.

    Kept off ChannelAdapter on purpose. A topic is a Telegram idea with no
    counterpart on WhatsApp, and four abstract methods that one adapter will
    never implement is a worse seam than one caller reaching for the adapter
    it actually means. TopicMirror is that caller, and the only one.
  */

  /**
   * Whether topics in private chats are switched on for this bot at all.
   *
   * It is a @BotFather setting, not an API call and not per-user: either every
   * chat with @recalfy_bot has topics or none does. When it is off, every
   * method below fails, so the mirror checks this first and does nothing.
   */
  get topicsAvailable(): boolean {
    return this.bot.botInfo?.has_topics_enabled === true;
  }

  /** The new topic's thread id, or null if Telegram refused. */
  async createTopic(handle: Handle, name: string): Promise<number | null> {
    return this.tryTopic('create', async () => {
      const topic = await this.bot.api.createForumTopic(handle, name.slice(0, 128));
      return topic.message_thread_id;
    });
  }

  /** The id of the message now holding the group's list, or null. */
  async postToTopic(handle: Handle, threadId: number, text: string): Promise<number | null> {
    return this.tryTopic('post', async () => {
      const message = await this.bot.api.sendMessage(handle, text, {
        message_thread_id: threadId,
        // The list is a reference, not news. A notification per edit would
        // make a quiet feature into a reason to mute the bot.
        disable_notification: true,
      });
      return message.message_id;
    });
  }

  /**
   * False when the edit did not land — including "message to edit not found",
   * which is what a topic deleted by hand looks like. The caller's answer to
   * that is to rebuild, so it needs to be told rather than reassured.
   */
  async editInTopic(handle: Handle, messageId: number, text: string): Promise<boolean> {
    const result = await this.tryTopic('edit', async () => {
      await this.bot.api.editMessageText(handle, messageId, text);
      return true;
    });
    return result === true;
  }

  async deleteTopic(handle: Handle, threadId: number): Promise<void> {
    await this.tryTopic('delete', async () => {
      await this.bot.api.deleteForumTopic(handle, threadId);
      return true;
    });
  }

  /**
   * Every topic call is best-effort. They run after the reply has already been
   * sent, so the worst honest outcome is a tab that is briefly out of date —
   * never a turn that fails because a tab could not be redrawn.
   */
  private async tryTopic<T>(what: string, run: () => Promise<T>): Promise<T | null> {
    try {
      return await run();
    } catch (error) {
      this.logger.warn(`topic ${what} failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /** Undefined rather than an empty keyboard: Telegram rejects the latter. */
  private keyboard(actions?: readonly Action[]) {
    if (!this.buttons || !actions?.length) return undefined;

    const keyboard = new InlineKeyboard();
    for (const action of actions) keyboard.text(action.label, action.data);
    return { reply_markup: keyboard };
  }

  /**
   * Answers a press on the message it came from: buttons off, one line added
   * saying what happened. Best-effort — the press has already been acted on,
   * and failing to redraw it must not undo that.
   */
  private async settle(ctx: Context, line: string): Promise<void> {
    const original = ctx.callbackQuery?.message?.text;
    try {
      if (original === undefined) {
        await ctx.editMessageReplyMarkup();
        return;
      }
      await ctx.editMessageText(`${original}\n\n${line}`);
    } catch (error) {
      this.logger.debug(`settle failed: ${error instanceof Error ? error.message : error}`);
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
