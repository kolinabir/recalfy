import { Injectable } from '@nestjs/common';

import { DEFAULT_BRIEF } from '../../brief/brief-time';
import { JsonSchema } from '../../llm/llm.types';
import { UserStore } from '../../memory/user.store';
import { BadArguments, asObject, optionalString } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class SetDailyBriefTool extends Tool {
  readonly name = 'set_daily_brief';
  readonly description =
    'Turn the daily morning brief on or off, or move it to a different time. It is on ' +
    'by default at 08:00. "Stop the morning messages" means enabled=false; "send my ' +
    'brief at 7" means enabled=true, time="07:00".';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', description: 'Whether the daily brief is sent at all.' },
      time: {
        type: 'string',
        description: 'Local 24h time as HH:MM, e.g. "07:30". Omit to keep the current time.',
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

    // Omitting the time keeps whatever they had, so "turn it back on" after
    // "stop the briefs" comes back at their chosen hour, not the default.
    const current = (await this.users.ensure(context.userId)).brief ?? DEFAULT_BRIEF;
    const at = time ?? { hour: current.hour, minute: current.minute };

    await this.users.setBrief(context.userId, { enabled, ...at });

    return enabled
      ? `Daily brief on, at ${pad(at.hour)}:${pad(at.minute)} their local time.`
      : 'Daily brief turned off.';
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
  if (!match) throw new BadArguments(`"time" must be HH:MM, e.g. "07:30".`);

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new BadArguments(`"${time}" is not a real time of day.`);
  return { hour, minute };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
