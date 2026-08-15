import { Injectable, Logger } from '@nestjs/common';

import { LinkStore } from '../channels/link.store';
import { MemoryStore } from '../memory/memory.store';
import { Memory } from '../memory/memory.types';
import { UserStore } from '../memory/user.store';
import { Handle, TopicEntry, UserId } from '../mongo/collections';
import { TelegramAdapter } from '../telegram/telegram.adapter';
import { byGroup, hashOf, renderTopic, topicKey } from './topic-document';

/**
 * The memory, as tabs in the chat.
 *
 * Each group gets a topic holding exactly one message: the current list for
 * that group, rewritten whenever the group changes. Tapping "Home" shows what
 * the bot knows about home — not a log of when it learned it.
 *
 * Three gates, all of which must be open. The bot needs topic mode on (a
 * @BotFather setting covering every chat at once, which no API call can
 * change), the user has to have asked for it, and there has to be a Telegram
 * link to write into. Any one closed and this does nothing, quietly.
 *
 * Runs after the reply has gone out, and every call inside it is best-effort.
 * A tab that fails to redraw is a tab that is briefly stale; it is never a
 * turn the user notices going wrong.
 */
@Injectable()
export class TopicMirror {
  private readonly logger = new Logger(TopicMirror.name);
  /** So an unconfigured bot logs the reason once, not once per message. */
  private warned = false;

  constructor(
    private readonly links: LinkStore,
    private readonly users: UserStore,
    private readonly memories: MemoryStore,
    private readonly telegram: TelegramAdapter,
  ) {}

  async sync(userId: UserId, now = new Date()): Promise<void> {
    try {
      await this.run(userId, now);
    } catch (error) {
      this.logger.error(
        `Topic sync failed for ${userId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async run(userId: UserId, now: Date): Promise<void> {
    const user = await this.users.ensure(userId);
    const handle = await this.links.handleFor(userId, 'telegram');
    if (!handle) return;

    // Switched off. Taking the tabs away is the whole of the setting doing
    // what it says — leaving them behind, frozen at whatever they last said,
    // would be worse than never having offered it.
    if (user.topics !== true) {
      if (user.topicIndex) await this.teardown(userId, handle, user.topicIndex);
      return;
    }

    if (!this.telegram.topicsAvailable) {
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(
          'Topics are on for a user but off for the bot — enable topic mode for @' +
            'recalfy_bot in BotFather (Bot Settings → Topics). Nothing will be mirrored until then.',
        );
      }
      return;
    }

    const groups = byGroup(await this.memories.facts(userId, now));
    const index = user.topicIndex ?? {};
    const live = new Set<string>();

    for (const [group, facts] of groups) {
      const key = topicKey(group);
      live.add(key);
      await this.writeGroup(userId, handle, key, group, facts, index[key], now);
    }

    // A group nobody has a fact in any more. Deleting the topic rather than
    // leaving it empty: an empty tab is a question ("did I lose something?"),
    // and the facts that were in it went somewhere the user asked them to go.
    for (const key of Object.keys(index)) {
      if (live.has(key)) continue;
      await this.telegram.deleteTopic(handle, index[key].threadId);
      await this.users.dropTopic(userId, key);
    }
  }

  /**
   * The index is cleared whether or not Telegram cooperated. A tab we failed
   * to delete is a tab the user can delete; an index we refused to clear is a
   * feature that can never be switched off.
   */
  private async teardown(
    userId: UserId,
    handle: Handle,
    index: Record<string, TopicEntry>,
  ): Promise<void> {
    for (const entry of Object.values(index)) {
      await this.telegram.deleteTopic(handle, entry.threadId);
    }
    await this.users.clearTopics(userId);
    this.logger.log(`topics off for ${userId} — removed ${Object.keys(index).length} tab(s)`);
  }

  private async writeGroup(
    userId: UserId,
    handle: Handle,
    key: string,
    group: string,
    facts: readonly Memory[],
    entry: TopicEntry | undefined,
    now: Date,
  ): Promise<void> {
    const body = renderTopic(group, facts, now);
    const hash = hashOf(body);

    // The common case by a distance: nine groups, one of them changed.
    if (entry?.hash === hash) return;

    /*
      Three attempts, narrowest first, because the user can delete any of this
      by hand and the mirror has to heal rather than fail identically every
      turn from here on. Edit the message; if it is gone, post a new one into
      the same topic; if the topic is gone too, start over.
    */
    if (entry) {
      if (await this.telegram.editInTopic(handle, entry.messageId, body)) {
        await this.users.saveTopic(userId, key, { ...entry, hash });
        return;
      }

      const reposted = await this.telegram.postToTopic(handle, entry.threadId, body);
      if (reposted !== null) {
        await this.users.saveTopic(userId, key, { threadId: entry.threadId, messageId: reposted, hash });
        return;
      }

      this.logger.log(`rebuilding topic ${key} for ${userId}`);
      await this.users.dropTopic(userId, key);
    }

    const threadId = await this.telegram.createTopic(handle, group);
    if (threadId === null) return;

    const messageId = await this.telegram.postToTopic(handle, threadId, body);
    if (messageId === null) return;

    await this.users.saveTopic(userId, key, { threadId, messageId, hash });
  }
}
