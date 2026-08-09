import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { describeRepeat } from '../../reminders/next-occurrence';
import { ReminderStore } from '../../reminders/reminder.store';
import { describeInstant } from '../../reminders/resolve-when';
import { Tool, ToolContext } from './tool';

@Injectable()
export class ListRemindersTool extends Tool {
  readonly name = 'list_reminders';
  readonly description =
    'List the reminders that have not fired yet. Call this before cancelling one, to ' +
    'find its id.';

  readonly parameters: JsonSchema = { type: 'object', properties: {} };

  constructor(private readonly reminders: ReminderStore) {
    super();
  }

  async execute(context: ToolContext): Promise<string> {
    const upcoming = await this.reminders.upcoming(context.userId);
    if (upcoming.length === 0) return 'No upcoming reminders.';

    return upcoming
      .map((r) => {
        const cadence = r.repeat ? ` (repeats ${describeRepeat(r.repeat)})` : '';
        return `${describeInstant(r.dueAt, context.timezone)} — ${r.text}${cadence} [${r._id.toHexString()}]`;
      })
      .join('\n');
  }
}
