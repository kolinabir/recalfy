import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { JsonSchema } from '../../llm/llm.types';
import { MemoryStore, Provenance } from '../../memory/memory.store';
import { asObject, requireStringArray } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class RecallSourceTool extends Tool {
  readonly name = 'recall_source';
  readonly description =
    'Trace facts back to when and how you learned them. Use it when the user asks ' +
    '"when did I tell you that?", "how do you know that?", or doubts a fact — cite the ' +
    'ids of the facts in question from the memory document.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'The short ids of the facts to trace, as listed in the memory document.',
      },
    },
    required: ['ids'],
  };

  constructor(private readonly memories: MemoryStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const ids = requireStringArray(asObject(args), 'ids');
    const traced = await this.memories.provenance(context.userId, ids);

    if (traced.length === 0) {
      return 'No facts with those ids. Check the ids against the memory document.';
    }
    return traced.map((entry) => describe(entry, context.timezone)).join('\n');
  }
}

function describe(entry: Provenance, timezone: string): string {
  const learned = day(entry.createdAt, timezone);
  const origin = entry.source
    ? ` — from their message on ${day(entry.source.at, timezone)}: "${entry.source.text}"`
    : ' — the original message is no longer on record';
  return `[${entry.sid}] "${entry.text}", learned ${learned}${origin}`;
}

function day(at: Date, timezone: string): string {
  return DateTime.fromJSDate(at, { zone: timezone }).toFormat('d LLL yyyy');
}
