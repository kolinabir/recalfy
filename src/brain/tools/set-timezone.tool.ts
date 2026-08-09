import { Injectable } from '@nestjs/common';

import { UserStore } from '../../memory/user.store';
import { JsonSchema } from '../../llm/llm.types';
import { asObject, requireString } from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class SetTimezoneTool extends Tool {
  readonly name = 'set_timezone';
  readonly description =
    "Set the user's timezone. Call this whenever they reveal where they are — " +
    '"I\'m from Bangladesh" means Asia/Dhaka, "I moved to Berlin" means Europe/Berlin. ' +
    'Every reminder depends on it, so do it without being asked.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'An IANA zone name, e.g. Asia/Dhaka. Never an abbreviation or offset.',
      },
    },
    required: ['timezone'],
  };

  constructor(private readonly users: UserStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const timezone = requireString(asObject(args), 'timezone');
    const accepted = await this.users.setTimezone(context.userId, timezone);

    return accepted
      ? `Timezone set to ${timezone}.`
      : `"${timezone}" is not a valid IANA zone. Try again with something like Asia/Dhaka.`;
  }
}
