import { ObjectId } from 'mongodb';

import { Limits } from '../../billing/entitlements';
import { JsonSchema } from '../../llm/llm.types';
import { UserId } from '../../mongo/collections';

export interface ToolContext {
  userId: UserId;
  /** The user's IANA zone, already resolved. */
  timezone: string;
  /**
   * What this account's plan permits. Carried here rather than fetched per
   * tool: the gate at the front of the turn already resolved it, and a tool
   * that had to ask billing itself would need a dependency on it — which is
   * how a limit ends up enforced in three places and disagreeing with itself.
   */
  limits: Limits;
  /** False while the zone is still the default rather than a known location. */
  onboarded: boolean;
  /** Passed in rather than read from the clock, so every path is testable. */
  now: Date;
  sourceMessageId: ObjectId;
  /**
   * Credential values found in the message this turn answers, as literal
   * strings. Whatever the model writes this turn — a fact, a reminder — has
   * them masked, however it reworded the sentence around them.
   */
  secrets: readonly string[];
  /**
   * What this turn did, written by the tools as they run.
   *
   * The same object across every round — the context is rebuilt each time a
   * tool runs, and a fresh record would forget what the last round wrote.
   */
  turn: TurnRecord;
}

export interface TurnRecord {
  /**
   * Ids of facts stored during this turn. The reply turns them into an Undo
   * button, which is the only way the user gets to disagree with a save
   * without composing a sentence about it.
   */
  saved: string[];
  /**
   * Whether the memory document is now different — a store, a deletion, a
   * supersession. Drives the topic mirror, which has nine groups to consider
   * and no reason to consider any of them after "what time is it in Berlin".
   */
  memoryChanged: boolean;
  /**
   * Ids of reminders scheduled during this turn, so Undo can take them back
   * too. Without this the button forgot the fact and left the reminder to fire
   * anyway — an undone interview still pinging at 8am the next morning.
   */
  scheduled: string[];
  /**
   * Credentials `reveal_secret` opened for the person, in plain text. Sent as
   * their own message after the reply and never logged — they exist here, and
   * not in the tool's result, so the model that asked for them never reads them.
   */
  revealed: string[];
}

export function newTurnRecord(): TurnRecord {
  return { saved: [], memoryChanged: false, scheduled: [], revealed: [] };
}

/**
 * One capability the model can invoke.
 *
 * `execute` returns the string the model reads back, so a tool is tested by
 * calling it and asserting on that sentence. Arguments arrive as `unknown`
 * because they come from a language model — every tool validates its own.
 */
export abstract class Tool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: JsonSchema;
  abstract execute(context: ToolContext, args: unknown): Promise<string>;
}

export const TOOLS = Symbol('TOOLS');
