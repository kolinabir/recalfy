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
    'Correct or resolve a tracker entry by its id (`e…`, shown in the Tracking section ' +
    'and in track results). "actually it was 350" → new value. "that was transport" → new ' +
    'category. "bought the cucumber" → bought=true, turning a shopping-list line into a ' +
    'real expense — and when the price is only now known ("got the milk, it was 80"), ' +
    'pass value together with bought. "that wasn\'t an expense" → remove=true. Only ' +
    'entry ids work here; memory facts are corrected through `remember`/`forget`.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      sid: { type: 'string', description: 'The entry id, e.g. e07.' },
      value: { type: 'number', description: 'The corrected amount.' },
      category: { type: 'string', description: 'The corrected category.' },
      item: { type: 'string', description: 'The corrected item name.' },
      bought: {
        type: 'boolean',
        description: 'True to mark a planned (shopping-list) entry as actually bought now.',
      },
      remove: { type: 'boolean', description: 'True to delete the entry entirely.' },
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
