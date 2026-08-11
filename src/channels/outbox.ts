import { Inject, Injectable, Logger } from '@nestjs/common';

import { UserStore } from '../memory/user.store';
import { Channel, Handle, UserId } from '../mongo/collections';
import { CHANNEL_ADAPTERS, ChannelAdapter } from './channel';
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
  async reply(userId: UserId, text: string): Promise<void> {
    const target = await this.route(userId);
    if (!target) return;

    const { adapter, handle } = target;
    for (const chunk of adapter.chunk(toPlainText(text))) {
      await adapter.send(handle, chunk);
    }
  }

  /**
   * A message the user did not ask for right now: a due reminder, the daily
   * brief. On Telegram this is an ordinary send. On WhatsApp it is free-form
   * if they happen to have messaged within the last 24 hours, and a billed
   * template otherwise.
   */
  async notify(userId: UserId, text: string): Promise<void> {
    const target = await this.route(userId);
    if (!target) return;

    const { adapter, handle, windowOpen } = target;
    const plain = toPlainText(text);

    if (windowOpen) {
      for (const chunk of adapter.chunk(plain)) {
        await adapter.send(handle, chunk);
      }
      return;
    }

    // Templates take one body parameter and cannot be chunked — a reminder
    // that overflows is truncated rather than split, because two templates
    // would be billed twice and arrive out of order.
    await adapter.notify(handle, plain);
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
  ): Promise<{ adapter: ChannelAdapter; handle: Handle; windowOpen: boolean } | null> {
    const routing = await this.users.routing(userId);

    for (const channel of this.preference(routing?.lastChannel)) {
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
