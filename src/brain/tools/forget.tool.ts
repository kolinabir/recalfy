import { Injectable } from '@nestjs/common';

import { MemoryStore } from '../../memory/memory.store';
import { JsonSchema } from '../../llm/llm.types';
import { asObject, requireStringArray } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class ForgetTool extends Tool {
  readonly name = 'forget';
  readonly description =
    'Delete facts from the memory document. Call this whenever the user asks you to ' +
    'forget, drop, delete or remove something — never just say you did. Each line of ' +
    'the memory document ends with its id in backticks, like `04`; pass the ids of ' +
    'every line that matches what they want gone.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        description:
          'The backticked ids from the ends of the memory lines to delete, e.g. ["03", "04"].',
      },
    },
    required: ['ids'],
  };

  constructor(private readonly memories: MemoryStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const ids = requireStringArray(asObject(args), 'ids');
    const dropped = await this.memories.forget(context.userId, ids);

    if (dropped.length === 0) return 'No facts matched those ids — nothing was deleted.';
    return `Deleted ${dropped.length}: ${dropped.map((m) => m.text).join(' | ')}`;
  }
}
