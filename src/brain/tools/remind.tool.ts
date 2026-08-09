import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { ReminderStore } from '../../reminders/reminder.store';
import { resolveWhen } from '../../reminders/resolve-when';
import { asObject, requireString } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class RemindTool extends Tool {
  readonly name = 'remind';
  readonly description =
    'Schedule a reminder to be sent to the user at a specific time. Resolve relative ' +
    'phrasing ("tomorrow at 6", "in 20 minutes", "at 5 today") yourself against the ' +
    'current time and timezone given in your instructions.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'What to remind them of, phrased as the message they will receive.',
      },
      when: {
        type: 'string',
        description:
          'Absolute ISO-8601 instant with an offset, e.g. 2026-08-10T18:00:00+06:00. ' +
          'Never a relative phrase.',
      },
    },
    required: ['text', 'when'],
  };

  constructor(private readonly reminders: ReminderStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const parsed = asObject(args);
    const text = requireString(parsed, 'text');
    const when = requireString(parsed, 'when');

    // Scheduling a wall-clock time against a guessed zone fires hours out.
    // Relative offsets are safe because they resolve to the same instant
    // whatever the zone is labelled.
    if (!context.onboarded && !isSoon(when, context.now)) {
      return 'Cannot schedule that yet — you do not know where the user is. Ask which city or country they are in first, then try again.';
    }

    // The model's arithmetic is never trusted: a misparse must surface as a
    // question to the user, not as a reminder that silently never fires.
    const resolved = resolveWhen(when, context.timezone, context.now);
    if (!resolved.ok) {
      return `Could not schedule: ${resolved.reason} Ask the user what they meant.`;
    }

    const reminder = await this.reminders.schedule(context.userId, text, resolved.at);
    return `Scheduled "${text}" for ${resolved.spoken} [${reminder._id.toHexString()}]. Confirm that exact time back to the user.`;
  }
}

/** Within a few hours means a relative offset, which no zone can get wrong. */
const RELATIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

function isSoon(iso: string, now: Date): boolean {
  const at = Date.parse(iso);
  return Number.isFinite(at) && at - now.getTime() <= RELATIVE_WINDOW_MS;
}
