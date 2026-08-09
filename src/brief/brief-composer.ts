import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { ConversationWindow } from '../brain/conversation-window';
import { GlmClient } from '../llm/glm.client';
import { MemoryStore } from '../memory/memory.store';
import { UserId } from '../mongo/collections';
import { describeRepeat } from '../reminders/next-occurrence';
import { ReminderStore } from '../reminders/reminder.store';
import { describeInstant } from '../reminders/resolve-when';
import { SKIP, buildBriefPrompt, buildReflectionPrompt } from './brief-prompt';

/** More history than the chat window sees — open loops live a few days back. */
const CONVERSATION_TURNS = 30;
/** Sundays reach further back: the week-review needs the week. */
const WEEK_REVIEW_TURNS = 60;

/**
 * Writes the morning brief for one user, or decides there isn't one.
 *
 * Gathers what the assistant knows — the memory document, today's reminders,
 * the recent conversation — and asks the model for a short message with a
 * hard licence to say SKIP. Null means silence, and silence is a feature.
 */
@Injectable()
export class BriefComposer {
  constructor(
    private readonly glm: GlmClient,
    private readonly memories: MemoryStore,
    private readonly reminders: ReminderStore,
    private readonly window: ConversationWindow,
  ) {}

  async compose(userId: UserId, timezone: string, now: Date): Promise<string | null> {
    // Sunday mornings carry the week-in-review over the Goals group.
    const weekReview = DateTime.fromJSDate(now, { zone: timezone }).weekday === 7;

    const prompt = buildBriefPrompt({
      memory: await this.memories.render(userId, now),
      reminders: await this.today(userId, timezone, now),
      conversation: await this.recentLines(userId, weekReview ? WEEK_REVIEW_TURNS : undefined),
      timezone,
      now,
      weekReview,
    });

    return this.completeOrSkip(prompt);
  }

  /** The evening note. Null when today held nothing worth reflecting on. */
  async composeReflection(userId: UserId, timezone: string, now: Date): Promise<string | null> {
    const startOfDay = DateTime.fromJSDate(now, { zone: timezone }).startOf('day').toJSDate();
    const today = (await this.window.recentMessages(userId, CONVERSATION_TURNS))
      .filter((message) => message.createdAt >= startOfDay)
      .map((message) => `${message.role}: ${message.text}`);

    // A silent day needs no model call to know there is nothing to reflect on.
    if (today.length === 0) return null;

    return this.completeOrSkip(
      buildReflectionPrompt({
        memory: await this.memories.render(userId, now),
        today,
        timezone,
        now,
      }),
    );
  }

  private async completeOrSkip(prompt: string): Promise<string | null> {
    const { text } = await this.glm.complete([{ role: 'system', content: prompt }], []);
    const message = text.trim();

    if (message === '' || message.toUpperCase().startsWith(SKIP)) return null;
    return message;
  }

  private async today(userId: UserId, timezone: string, now: Date): Promise<string[]> {
    const endOfDay = DateTime.fromJSDate(now, { zone: timezone }).endOf('day').toJSDate();

    return (await this.reminders.upcoming(userId))
      .filter((r) => r.dueAt <= endOfDay)
      .map((r) => {
        const cadence = r.repeat ? ` (repeats ${describeRepeat(r.repeat)})` : '';
        return `${describeInstant(r.dueAt, timezone)} — ${r.text}${cadence}`;
      });
  }

  private async recentLines(userId: UserId, limit = CONVERSATION_TURNS): Promise<string[]> {
    const turns = await this.window.recent(userId, limit);
    return turns
      .filter((turn) => turn.role === 'user' || turn.role === 'assistant')
      .map((turn) => `${turn.role}: ${turn.content}`);
  }
}
