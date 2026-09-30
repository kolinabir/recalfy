import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { MemoryStore } from '../../memory/memory.store';
import { JsonSchema } from '../../llm/llm.types';
import { asObject, requireString } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class SearchMemoryTool extends Tool {
  readonly name = 'search_memory';
  readonly description =
    'Keyword-search every stored fact, including the ones not listed in the memory ' +
    'document. Returns matching facts with their ids, for answering, correcting or ' +
    'forgetting. Search names and nouns ("Rahim landlord"), not the question.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A few space-separated keywords, e.g. "dentist appointment".',
      },
    },
    required: ['query'],
  };

  constructor(private readonly memories: MemoryStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const query = requireString(asObject(args), 'query');
    const hits = await this.memories.search(context.userId, query, context.now);

    if (hits.length === 0) {
      return (
        `No stored fact matches "${query}". Try other keywords — a name, a place, a thing — ` +
        'or search_history for something said but never saved.'
      );
    }
    // Same line shape as the memory document, so an id found here is cited
    // exactly like one read there.
    const lines = hits.map((memory) => {
      const day = DateTime.fromJSDate(memory.createdAt, { zone: context.timezone }).toFormat(
        'd LLL yyyy',
      );
      return `- ${memory.text} \`${memory.sid}\` (${memory.group}, ${day})`;
    });
    return `Matching facts, best first:\n${lines.join('\n')}`;
  }
}
