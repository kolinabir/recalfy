import { Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { LIMITS, Limits } from '../billing/entitlements';
import { GlmClient } from '../llm/glm.client';
import { Turn } from '../llm/llm.types';
import { MemoryStore } from '../memory/memory.store';
import { UserStore } from '../memory/user.store';
import { TrackerStore } from '../tracker/tracker.store';
import { UserId } from '../mongo/collections';
import { secretValues } from '../memory/vault';
import { NO_ACTION_TAKEN, claimsAction } from './claims-action';
import { ConversationWindow } from './conversation-window';
import { buildSystemPrompt } from './system-prompt';
import { ToolContext, TurnRecord, newTurnRecord } from './tools/tool';
import { ToolExecutor } from './tools/tool-executor';

/** Each round trip is one model call; this bounds a tool-calling loop. */
const MAX_ROUNDS = 4;

const FALLBACK_REPLY = 'Something went wrong on my end — try me again in a moment.';
const BUSY_REPLY = "I'm being rate-limited right now — give me a minute and say that again.";

/**
 * What to say, and what just happened while deciding to say it.
 *
 * The record is the turn's own rather than a query afterwards: "the facts
 * stored a moment ago" is not a thing the store can be asked for without
 * guessing at a time window.
 */
export type Reply = TurnRecord & { text: string };

/**
 * The assistant. One method: a message in, a reply out.
 *
 * Behind it: the memory document, the conversation window, the tool loop, and
 * the model itself. There is no intent classifier and no router — the model
 * decides whether to speak or to act, which is exactly what tool calling is for.
 */
@Injectable()
export class BrainService {
  private readonly logger = new Logger(BrainService.name);

  constructor(
    private readonly glm: GlmClient,
    private readonly memories: MemoryStore,
    private readonly trackers: TrackerStore,
    private readonly users: UserStore,
    private readonly window: ConversationWindow,
    private readonly tools: ToolExecutor,
  ) {}

  /**
   * `onText` is handed the answer as it is written, when the channel can show
   * it. Optional everywhere: the reply is identical without it.
   */
  async handle(
    userId: UserId,
    text: string,
    now: Date,
    sourceMessageId: ObjectId,
    limits: Limits = LIMITS.archive,
    onText?: (partial: string) => void,
  ): Promise<Reply> {
    const turn = newTurnRecord();
    try {
      const reply = await this.converse(userId, text, now, sourceMessageId, limits, turn, onText);
      return { text: reply, ...turn };
    } catch (error) {
      this.logger.error(
        `Brain failed for ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // The record is returned as it stands rather than emptied: a tool that
      // ran before the failure really did write, and the undo has to reach it.
      return { text: isRateLimit(error) ? BUSY_REPLY : FALLBACK_REPLY, ...turn };
    }
  }

  private async converse(
    userId: UserId,
    text: string,
    now: Date,
    sourceMessageId: ObjectId,
    limits: Limits,
    turn: TurnRecord,
    onText?: (partial: string) => void,
  ): Promise<string> {
    const secrets = secretValues(text);
    let context = await this.contextFor(userId, now, sourceMessageId, limits, turn, secrets);
    const turns: Turn[] = [
      { role: 'system', content: await this.systemPrompt(context) },
      // The window already ends with this message — BotService logs it first.
      ...(await this.window.recent(userId, undefined, { id: sourceMessageId, text })),
    ];

    const specs = this.tools.specs();

    let acted = false;
    let challenged = false;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      // Each round streams over the last: a round that opens with "let me
      // check…" and then calls a tool is replaced by the answer it produces,
      // rather than accumulating in front of the user.
      const { text: reply, toolCalls } = await this.glm.complete(turns, specs, onText);

      if (toolCalls.length === 0) {
        // Models reliably say "done" while calling nothing. Trusting that would
        // tell the user their data changed when it did not, so the claim is
        // checked and bounced back once before it can reach them.
        if (!acted && !challenged && claimsAction(reply)) {
          this.logger.warn(`Unbacked claim for ${userId}: "${reply.slice(0, 80)}"`);
          challenged = true;
          turns.push({ role: 'assistant', content: reply });
          turns.push({ role: 'system', content: NO_ACTION_TAKEN });
          continue;
        }
        return reply || FALLBACK_REPLY;
      }

      acted = true;

      turns.push({ role: 'assistant', content: reply, toolCalls });
      for (const call of toolCalls) {
        turns.push({
          role: 'tool',
          toolCallId: call.id,
          content: await this.tools.run(context, call),
        });
      }

      // A tool may have changed the memory or the timezone — "I'm from
      // Bangladesh, remind me at 5" sets the zone and then depends on it in
      // the same turn, so both are re-read before the next round.
      context = await this.contextFor(userId, now, sourceMessageId, limits, turn, secrets);
      turns[0] = { role: 'system', content: await this.systemPrompt(context) };
    }

    this.logger.warn(`Hit the ${MAX_ROUNDS}-round cap for ${userId}`);
    return "I got a bit tangled up there — say that again?";
  }

  private async contextFor(
    userId: UserId,
    now: Date,
    sourceMessageId: ObjectId,
    limits: Limits,
    turn: TurnRecord,
    secrets: readonly string[],
  ): Promise<ToolContext> {
    const user = await this.users.ensure(userId);
    return {
      userId,
      timezone: user.tz,
      onboarded: user.onboardedAt !== undefined,
      limits,
      now,
      sourceMessageId,
      secrets,
      turn,
    };
  }

  private async systemPrompt(context: ToolContext): Promise<string> {
    const [memory, tracking] = await Promise.all([
      this.memories.render(context.userId, context.now),
      this.trackers.digest(context.userId, context.timezone, context.now),
    ]);
    return buildSystemPrompt({
      memory,
      tracking,
      timezone: context.timezone,
      now: context.now,
      onboarded: context.onboarded,
      limits: context.limits,
    });
  }
}

/** The free GLM tiers cap requests per minute; that deserves its own answer. */
function isRateLimit(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 429;
}
