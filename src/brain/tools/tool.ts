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
