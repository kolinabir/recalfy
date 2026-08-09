import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { ReminderStore } from '../../reminders/reminder.store';
import { asObject, requireString } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class CancelReminderTool extends Tool {
  readonly name = 'cancel_reminder';
  readonly description =
    'Cancel an upcoming reminder by its id. Use list_reminders first if you do not ' +
    'already know the id.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The reminder id shown in square brackets.' },
    },
    required: ['id'],
  };

  constructor(private readonly reminders: ReminderStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const id = requireString(asObject(args), 'id');
    const cancelled = await this.reminders.cancel(context.userId, id);

    if (!cancelled) {
      return 'No pending reminder with that id — it may have already fired or been cancelled.';
    }
    // Only one row of a recurring series is ever pending, so this ends it.
    return cancelled.repeat
      ? `Cancelled "${cancelled.text}" — the whole recurring series is stopped.`
      : `Cancelled "${cancelled.text}".`;
  }
}
