import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { MemoryStore } from '../../memory/memory.store';
import { Tool, ToolContext } from './tool';

/** Where the download lives. Same host the linking copy already names. */
const EXPORT_PAGE = 'recalfy.com/dashboard/settings';

/**
 * Hands over the whole memory.
 *
 * The file itself is not sent into the chat: a real memory is tens of
 * thousands of characters, neither channel accepts that as a message, and a
 * model asked to repeat a document verbatim will quietly reword it — which is
 * the one thing an export must never do. So the bot points at the download,
 * and the bytes come from the same store the dashboard reads.
 */
@Injectable()
export class ExportMemoryTool extends Tool {
  readonly name = 'export_memory';
  readonly description =
    'Tell the user how to download everything you know about them. Use it when they ask ' +
    'to export, download, back up, or "get a copy of" their memory or their data, and ' +
    'when they ask what happens to their facts if they leave.';

  readonly parameters: JsonSchema = { type: 'object', properties: {} };

  constructor(private readonly memories: MemoryStore) {
    super();
  }

  async execute(context: ToolContext): Promise<string> {
    const count = await this.memories.count(context.userId, context.now);
    const noun = count === 1 ? 'fact' : 'facts';

    return (
      `Their memory holds ${count} ${noun}. The export is on ${EXPORT_PAGE}, under "Your data", ` +
      'in two formats: Markdown — the same document you recite, grouped the same way — or ' +
      'JSON, which additionally carries corrections and the facts they asked you to forget. ' +
      'Both download the moment they press one; nothing is queued and nothing expires. ' +
      'Tell them the count and where to press, and say plainly that the file is theirs to keep.'
    );
  }
}
