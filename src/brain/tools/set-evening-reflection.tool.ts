import { Injectable } from '@nestjs/common';

import { DEFAULT_REFLECTION } from '../../brief/brief-time';
import { JsonSchema } from '../../llm/llm.types';
import { UserStore } from '../../memory/user.store';
import { BadArguments, asObject, optionalString } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class SetEveningReflectionTool extends Tool {
  readonly name = 'set_evening_reflection';
  readonly description =
    'Turn the optional evening reflection on or off, or move it. It is OFF by default; ' +
    'when on, a short end-of-day note goes out (default 21:30) asking if anything from ' +
    'the day is worth keeping. "Check in with me in the evenings" means enabled=true.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', description: 'Whether the evening reflection is sent.' },
      time: {
        type: 'string',
        description: 'Local 24h time as HH:MM, e.g. "21:00". Omit to keep the current time.',
      },
    },
    required: ['enabled'],
  };

  constructor(private readonly users: UserStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const parsed = asObject(args);
    const enabled = requireBoolean(parsed, 'enabled');
    const time = parseTime(optionalString(parsed, 'time'));

    // Omitting the time keeps whatever they had, so toggling off and on
    // brings it back at their chosen hour, not the default.
    const current = (await this.users.ensure(context.userId)).reflection ?? DEFAULT_REFLECTION;
    const at = time ?? { hour: current.hour, minute: current.minute };

    await this.users.setReflection(context.userId, { enabled, ...at });

    return enabled
      ? `Evening reflection on, at ${pad(at.hour)}:${pad(at.minute)} their local time.`
      : 'Evening reflection turned off.';
  }
}

function requireBoolean(args: Record<string, unknown>, key: string): boolean {
  const value = args[key];
  if (typeof value !== 'boolean') throw new BadArguments(`"${key}" must be true or false.`);
  return value;
}

function parseTime(time: string | undefined): { hour: number; minute: number } | undefined {
  if (time === undefined) return undefined;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) throw new BadArguments(`"time" must be HH:MM, e.g. "21:00".`);

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new BadArguments(`"${time}" is not a real time of day.`);
  return { hour, minute };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
