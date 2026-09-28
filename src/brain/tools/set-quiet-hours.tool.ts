import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { UserStore } from '../../memory/user.store';
import { describeQuietHours } from '../../reminders/quiet-hours';
import { BadArguments, asObject, optionalString } from './args';
import { Tool, ToolContext } from './tool';
import { siteLink } from '../../config/site';

@Injectable()
export class SetQuietHoursTool extends Tool {
  readonly name = 'set_quiet_hours';
  readonly description =
    'Set or clear the hours when reminders should not arrive. "Nothing after 10pm" is ' +
    'from="22:00" with the existing end kept, "no reminders between 11pm and 7am" is ' +
    'from="23:00" to="07:00". Pass enabled=false to turn quiet hours off entirely. ' +
    'A reminder that comes due inside the window waits until it ends — it is never lost.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', description: 'False clears quiet hours entirely.' },
      from: { type: 'string', description: 'Local time quiet starts, HH:MM, e.g. "22:00".' },
      to: { type: 'string', description: 'Local time quiet ends, HH:MM, e.g. "08:00".' },
    },
    required: ['enabled'],
  };

  constructor(private readonly users: UserStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    // Checked here rather than by hiding the tool, because the model is told
    // in its rules that this is unavailable and may still try. A refusal it
    // can read beats a tool that silently is not there.
    if (!context.limits.quietHours) {
      return (
        'NOT SET — quiet hours are an Archive feature and their plan does not include ' +
        `it. Tell them plainly, and mention ${siteLink('/dashboard/billing')}. Do not ` +
        'pretend it is set.'
      );
    }

    const parsed = asObject(args);
    const enabled = requireBoolean(parsed, 'enabled');

    if (!enabled) {
      await this.users.setQuietHours(context.userId, undefined);
      return 'Quiet hours turned off — reminders arrive whenever they come due.';
    }

    const current = (await this.users.ensure(context.userId)).quiet;
    const from = parseHour(optionalString(parsed, 'from')) ?? current?.from;
    const to = parseHour(optionalString(parsed, 'to')) ?? current?.to;

    if (from === undefined || to === undefined) {
      throw new BadArguments('Setting quiet hours needs both a start and an end time.');
    }
    // Equal bounds would mean either no window or a permanently silent day,
    // and there is no way to tell which they meant — so ask instead of guessing.
    if (from === to) {
      throw new BadArguments('Quiet hours cannot start and end at the same hour.');
    }

    const quiet = { from, to };
    await this.users.setQuietHours(context.userId, quiet);
    return `Quiet hours set between ${describeQuietHours(quiet)} their local time. Reminders due inside that window arrive when it ends.`;
  }
}

function requireBoolean(args: Record<string, unknown>, key: string): boolean {
  const value = args[key];
  if (typeof value !== 'boolean') throw new BadArguments(`"${key}" must be true or false.`);
  return value;
}

/** Minutes are accepted and dropped — the window is whole hours. */
function parseHour(time: string | undefined): number | undefined {
  if (time === undefined) return undefined;
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(time.trim());
  if (!match) throw new BadArguments(`"${time}" must be a time like "22:00".`);

  const hour = Number(match[1]);
  if (hour > 23) throw new BadArguments(`"${time}" is not a real time of day.`);
  return hour;
}
