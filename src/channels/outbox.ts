import { Inject, Injectable, Logger } from '@nestjs/common';

import { UserStore } from '../memory/user.store';
import { Channel, Handle, UserId } from '../mongo/collections';
import { Action, CHANNEL_ADAPTERS, ChannelAdapter } from './channel';
import { Draft } from './draft';
import { LinkStore } from './link.store';
import { toPlainText } from './plain-text';

/**
 * WhatsApp's "customer service window". Meta allows free-form replies for 24
 * hours after the user's own last message; past that only a pre-approved
 * template may be sent, and it is billed. Telegram has no such rule, which is
 * why this lives in the router rather than in either adapter.
 */
const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Decides *where* a message goes, and on WhatsApp *what kind* it is allowed to
 * be. Everything outbound goes through here — the one place that knows a user
 * can be reachable in more than one chat.
 */
@Injectable()
export class Outbox {
  private readonly logger = new Logger(Outbox.name);
  private readonly byChannel: Map<Channel, ChannelAdapter>;

  constructor(
    @Inject(CHANNEL_ADAPTERS) adapters: ChannelAdapter[],
    private readonly links: LinkStore,
    private readonly users: UserStore,
  ) {
    this.byChannel = new Map(adapters.map((adapter) => [adapter.channel, adapter]));
  }

  /**
   * A reply to something the user just said. The window is open by
   * construction — they messaged us moments ago — so this is always free-form,
   * and on WhatsApp always free.
   */
  async reply(
    userId: UserId,
    text: string,
    options: { actions?: readonly Action[]; threadId?: number } = {},
  ): Promise<void> {
    const target = await this.route(userId);
    if (!target) return;

    const { adapter, handle } = target;
    const chunks = adapter.chunk(toPlainText(text));

    // Buttons ride on the last chunk only. Anywhere else and the user would
    // be asked to decide something while the rest of the answer is still
    // arriving underneath it. The thread is on every chunk — they are one
    // message that did not fit, not a conversation.
    for (const [index, chunk] of chunks.entries()) {
      const last = index === chunks.length - 1;
      await adapter.send(handle, {
        text: chunk,
        actions: last ? options.actions : undefined,
        threadId: options.threadId,
      });
    }
  }

  /**
   * A place to paint the reply while it is being written, or null when this
   * user's channel cannot — which every caller must treat as ordinary.
   *
   * Routed once and handed back bound, because the alternative is a Mongo
   * round trip per token.
   */
  async draft(userId: UserId, draftId: number, threadId?: number): Promise<Draft | null> {
    const target = await this.route(userId);
    if (!target?.adapter.streams) return null;

    const { adapter, handle } = target;
    return new Draft((text) => adapter.draft(handle, draftId, toPlainText(text), threadId));
  }

  /**
   * A message the user did not ask for right now: a due reminder, the daily
   * brief. On Telegram this is an ordinary send. On WhatsApp it is free-form
   * if they happen to have messaged within the last 24 hours, and a billed
   * template otherwise.
   *
   * `allowed` narrows where it may land, which matters only here and not on
   * `reply`: an inbound message on a channel the plan does not cover is
   * already refused at the gate, but an *unprompted* send has no such gate in
   * front of it. Without this, an account that connected WhatsApp on Archive
   * and then moved to Keep would keep receiving billed templates there
   * forever — us paying Meta to message someone who stopped paying for it.
   */
  async notify(
    userId: UserId,
    text: string,
    allowed?: readonly Channel[],
    actions?: readonly Action[],
  ): Promise<void> {
    const target = await this.route(userId, allowed);
    if (!target) return;

    const { adapter, handle, windowOpen } = target;
    const plain = toPlainText(text);

    if (windowOpen) {
      const chunks = adapter.chunk(plain);
      for (const [index, chunk] of chunks.entries()) {
        const last = index === chunks.length - 1;
        await adapter.send(handle, { text: chunk, actions: last ? actions : undefined });
      }
      return;
    }

    // Templates take one body parameter and cannot be chunked — a reminder
    // that overflows is truncated rather than split, because two templates
    // would be billed twice and arrive out of order.
    await adapter.notify(handle, { text: plain });
  }

  async typing(userId: UserId): Promise<void> {
    const target = await this.route(userId);
    if (target) await target.adapter.typing(target.handle);
  }

  /**
   * Where this user should be reached: the channel they last spoke on, or the
   * only one they have connected. Null when nothing is reachable, which is a
   * real state — someone can disconnect every channel and still own memories.
   */
  private async route(
    userId: UserId,
    allowed?: readonly Channel[],
  ): Promise<{ adapter: ChannelAdapter; handle: Handle; windowOpen: boolean } | null> {
    const routing = await this.users.routing(userId);

    for (const channel of this.preference(routing?.lastChannel)) {
      if (allowed && !allowed.includes(channel)) continue;

      const adapter = this.byChannel.get(channel);
      if (!adapter) continue;

      const handle = await this.links.handleFor(userId, channel);
      if (!handle) continue;

      return { adapter, handle, windowOpen: this.isWindowOpen(channel, routing?.lastInboundAt) };
    }

    this.logger.warn(`No reachable channel for ${userId}; dropping outbound message`);
    return null;
  }

  /** Last channel used first, then whatever else is registered. */
  private preference(last: Channel | undefined): Channel[] {
    const rest = [...this.byChannel.keys()].filter((channel) => channel !== last);
    return last ? [last, ...rest] : rest;
  }

  private isWindowOpen(
    channel: Channel,
    lastInboundAt: Partial<Record<Channel, Date>> | undefined,
  ): boolean {
    // Only WhatsApp has a window at all; everywhere else is always open.
    if (channel !== 'whatsapp') return true;

    const last = lastInboundAt?.whatsapp;
    return last !== undefined && Date.now() - last.getTime() < SERVICE_WINDOW_MS;
  }
}
