import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { TrackerStore } from '../../tracker/tracker.store';
import {
  BadArguments,
  asObject,
  optionalBoolean,
  optionalPositiveNumber,
  optionalString,
  requireString,
} from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class UpdateEntryTool extends Tool {
  readonly name = 'update_entry';
  readonly description =
    'Correct a tracker entry by its `e…` id: a new value, category or item; bought=true ' +
    'when a shopping-list line was bought (with value if the price is only known now); ' +
    'remove=true if it was not an expense. Memory facts go through `remember`/`forget`.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      sid: { type: 'string', description: 'The entry id, e.g. e07.' },
      value: { type: 'number', description: 'The corrected amount.' },
      category: { type: 'string', description: 'The corrected category.' },
      item: { type: 'string', description: 'The corrected item name.' },
      bought: {
        type: 'boolean',
        description: 'A planned entry was actually bought.',
      },
      remove: { type: 'boolean', description: 'Delete the entry.' },
    },
    required: ['sid'],
  };

  constructor(private readonly trackers: TrackerStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const parsed = asObject(args);
    const sid = requireString(parsed, 'sid');
    const patch = {
      value: optionalPositiveNumber(parsed, 'value'),
      category: optionalString(parsed, 'category'),
      item: optionalString(parsed, 'item'),
      // False means "leave it alone", same as absent — never an empty update.
      bought: optionalBoolean(parsed, 'bought') === true ? true : undefined,
      remove: optionalBoolean(parsed, 'remove') === true ? true : undefined,
    };

    if (Object.values(patch).every((field) => field === undefined)) {
      throw new BadArguments('Nothing to change — pass value, category, item, bought, or remove.');
    }

    const updated = await this.trackers.update(context.userId, sid, patch);
    if (!updated) return `No entry with id ${sid}. Check the Tracking section for the right id.`;

    if (patch.remove) return `Removed ${updated.item ?? updated.tracker} [${sid}].`;
    const label = updated.item ?? updated.tracker;
    const state = updated.planned ? 'still on the list' : `in ${updated.tracker}`;
    return `Updated [${sid}]: ${label} ${updated.value}${updated.category ? `, ${updated.category}` : ''} — ${state}.`;
  }
}
