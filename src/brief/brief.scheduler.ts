import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { ConversationLog } from '../bot/conversation-log';
import { UserStore } from '../memory/user.store';
import { UserDoc } from '../mongo/collections';
import { Outbox } from '../channels/outbox';
import { briefDueDay, reflectionDueDay } from './brief-time';
import { BriefComposer } from './brief-composer';

const TICK_MS = 60_000;

/**
 * Sends each user's daily brief — and, for those who opted in, the evening
 * reflection — when their local clock reaches the slot.
 *
 * The claim is taken *before* composing, so the brief is at-most-once per
 * day: a failed model call costs one morning's brief, never a double send —
 * the right trade for a message nobody asked for.
 *
 * The zone arithmetic happens in Node, not in a query — per-user timezones
 * don't index, and the users collection is tiny.
 */
@Injectable()
export class BriefScheduler {
  private readonly logger = new Logger(BriefScheduler.name);
  private ticking = false;

  constructor(
    private readonly users: UserStore,
    private readonly composer: BriefComposer,
    private readonly outbox: Outbox,
    private readonly log: ConversationLog,
  ) {}

  @Interval(TICK_MS)
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const now = new Date();
      for (const user of await this.users.onboarded()) {
        await this.maybeSendBrief(user, now);
        await this.maybeSendReflection(user, now);
      }
    } catch (error) {
      this.logger.error(`Brief tick failed: ${message(error)}`);
    } finally {
      this.ticking = false;
    }
  }

  private async maybeSendBrief(user: UserDoc, now: Date): Promise<void> {
    const day = briefDueDay(user, now);
    if (day === null) return;
    if (!(await this.users.claimBrief(user._id, day))) return;

    await this.deliver('Brief', user, day, () => this.composer.compose(user._id, user.tz, now));
  }

  private async maybeSendReflection(user: UserDoc, now: Date): Promise<void> {
    const day = reflectionDueDay(user, now);
    if (day === null) return;
    if (!(await this.users.claimReflection(user._id, day))) return;

    await this.deliver('Reflection', user, day, () =>
      this.composer.composeReflection(user._id, user.tz, now),
    );
  }

  private async deliver(
    kind: string,
    user: UserDoc,
    day: string,
    compose: () => Promise<string | null>,
  ): Promise<void> {
    try {
      const text = await compose();
      if (text === null) {
        this.logger.log(`${kind} for ${user._id} on ${day}: nothing to say`);
        return;
      }

      await this.outbox.notify(user._id, text);
      // Into the transcript, so "yes, it got fixed" resolves against the
      // question that was asked.
      await this.log.record(user._id, 'assistant', text);
      this.logger.log(`${kind} sent to ${user._id} for ${day}`);
    } catch (error) {
      this.logger.error(`${kind} for ${user._id} failed: ${message(error)}`);
    }
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
