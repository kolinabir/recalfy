import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { MemoryStore } from '../../memory/memory.store';
import { Fact } from '../../memory/memory.types';
import { JsonSchema } from '../../llm/llm.types';
import {
  BadArguments,
  asObject,
  optionalString,
  optionalStringArray,
  requireObjectArray,
  requireString,
} from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class RememberTool extends Tool {
  readonly name = 'remember';
  readonly description =
    'Store new facts about the user. Split everything into separate atomic facts — ' +
    '"landlord is Rahim" and "rent is due on the 5th" are two facts, not one. Write each ' +
    'as a self-contained third-person sentence. If a fact replaces something already in ' +
    'memory, list the old ids in `supersedes` instead of storing a contradiction.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      facts: {
        type: 'array',
        description: 'The atomic facts to store.',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'One self-contained fact.' },
            group: {
              type: 'string',
              description: 'Heading it belongs under, e.g. People, Home, Work, Health.',
            },
            supersedes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ids of existing facts this replaces.',
            },
            expires: {
              type: 'string',
              description:
                'For inherently temporary facts only ("visiting parents next week"): ' +
                'the local date (YYYY-MM-DD) after which it stops being true. Omit for ' +
                'anything durable.',
            },
          },
          required: ['text'],
        },
      },
    },
    required: ['facts'],
  };

  constructor(private readonly memories: MemoryStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const facts = requireObjectArray(asObject(args), 'facts').map((raw) => toFact(raw, context));
    const stored = await this.memories.remember(context.userId, facts, context.sourceMessageId);

    if (stored.length === 0) {
      return 'Already knew all of that — nothing new stored. Just reply naturally.';
    }
    return `Stored ${stored.length}: ${stored.map((m) => `${m.text} [${m.sid}]`).join(' | ')}`;
  }
}

function toFact(raw: Record<string, unknown>, context: ToolContext): Fact {
  return {
    text: requireString(raw, 'text'),
    group: optionalString(raw, 'group'),
    supersedes: optionalStringArray(raw, 'supersedes'),
    staleAfter: resolveExpiry(optionalString(raw, 'expires'), context),
  };
}

/** A local date becomes end-of-that-day in the user's zone — never a misparse. */
function resolveExpiry(expires: string | undefined, context: ToolContext): Date | undefined {
  if (expires === undefined) return undefined;

  const day = DateTime.fromISO(expires, { zone: context.timezone });
  if (!day.isValid) throw new BadArguments(`"expires" must be a date like 2026-08-17.`);

  const at = day.endOf('day');
  if (at.toMillis() <= context.now.getTime()) {
    throw new BadArguments(`"expires" (${expires}) is already in the past.`);
  }
  return at.toJSDate();
}
