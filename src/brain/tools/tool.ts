import { ObjectId } from 'mongodb';

import { JsonSchema } from '../../llm/llm.types';
import { UserId } from '../../mongo/collections';

export interface ToolContext {
  userId: UserId;
  /** The user's IANA zone, already resolved. */
  timezone: string;
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
