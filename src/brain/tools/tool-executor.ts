import { Inject, Injectable, Logger } from '@nestjs/common';

import { ToolCall } from '../../llm/llm.types';
import { BadArguments } from './args';
import { TOOLS, Tool, ToolContext } from './tool';

/**
 * Runs a tool call and always produces a string for the model to read.
 *
 * Nothing here throws: a bad name, malformed JSON, or a failing tool becomes a
 * sentence the model can react to on the next turn. An exception would abort
 * the conversation; a message lets it apologise or retry.
 */
@Injectable()
export class ToolExecutor {
  private readonly logger = new Logger(ToolExecutor.name);
  private readonly byName: Map<string, Tool>;

  constructor(@Inject(TOOLS) private readonly tools: Tool[]) {
    this.byName = new Map(tools.map((tool) => [tool.name, tool]));
  }

  specs(): { name: string; description: string; parameters: Record<string, unknown> }[] {
    return this.tools.map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }

  async run(context: ToolContext, call: ToolCall): Promise<string> {
    const tool = this.byName.get(call.name);
    if (!tool) return `No such tool "${call.name}".`;

    try {
      const result = await tool.execute(context, parseArguments(call.rawArguments));
      this.logger.log(`${call.name} → ${result.slice(0, 120)}`);
      return result;
    } catch (error) {
      return this.explain(call, error);
    }
  }

  private explain(call: ToolCall, error: unknown): string {
    if (error instanceof BadArguments) {
      this.logger.warn(`${call.name} rejected arguments: ${error.message}`);
      return `Invalid arguments: ${error.message}`;
    }
    this.logger.error(`${call.name} failed: ${error instanceof Error ? error.message : error}`);
    return 'That failed for a technical reason. Tell the user something went wrong.';
  }
}

function parseArguments(raw: string): unknown {
  if (raw.trim() === '') return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new BadArguments('Arguments were not valid JSON.');
  }
}
