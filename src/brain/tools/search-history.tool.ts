import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { HistorySearch } from '../history-search';
import { asObject, requireString } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class SearchHistoryTool extends Tool {
  readonly name = 'search_history';
  readonly description =
    'Keyword-search the full past conversation with this user. Use it when they ask ' +
    'about something not covered by what you know — "what did I say about…", "when did ' +
    'I mention…", "didn\'t we talk about…". Keywords match literally, so search the ' +
    'nouns ("geyser landlord"), not the question.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A few space-separated keywords likely to appear in the messages.',
      },
    },
    required: ['query'],
  };

  constructor(private readonly history: HistorySearch) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const query = requireString(asObject(args), 'query');
    const hits = await this.history.search(context.userId, query, context.timezone);

    if (hits.length === 0) {
      return `Nothing in the conversation history matches "${query}". Try different keywords, or tell the user you have no record of it.`;
    }
    return `Matching messages, oldest first:\n${hits.join('\n')}`;
  }
}
