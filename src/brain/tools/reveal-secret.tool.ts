import { Injectable } from '@nestjs/common';

import { MemoryStore } from '../../memory/memory.store';
import { JsonSchema } from '../../llm/llm.types';
import { asObject, requireStringArray } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class RevealSecretTool extends Tool {
  readonly name = 'reveal_secret';
  readonly description =
    'Send the user a password, PIN or other credential shown as •••••••• in memory. You ' +
    'cannot see the value; this delivers it to them directly, in its own message after ' +
    'your reply. Call it whenever they ask for one, with the ids of the matching lines.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'The backticked ids of the masked lines, e.g. ["0k"].',
      },
    },
    required: ['ids'],
  };

  constructor(private readonly memories: MemoryStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const ids = requireStringArray(asObject(args), 'ids');
    const found = await this.memories.reveal(context.userId, ids, context.now);
    if (found.length === 0) return 'No live facts matched those ids — nothing was sent.';

    // The value goes on the turn record, never into this string: this string
    // is read by the model, and keeping the value out of the model is the
    // whole reason the fact was masked.
    const secret = found.filter((fact) => fact.sealed);
    context.turn.revealed.push(...secret.map((fact) => fact.text));

    const plain = found.filter((fact) => !fact.sealed);
    const notes = [
      secret.length > 0
        ? `${secret.length} will be sent to them in a separate message right after your reply. ` +
          'Say something short like "here it is" — do not repeat, guess or describe the value.'
        : '',
      plain.length > 0
        ? `Nothing hidden in: ${plain.map((fact) => `${fact.text} [${fact.sid}]`).join(' | ')} — answer from it directly.`
        : '',
    ];
    return notes.filter(Boolean).join(' ');
  }
}
