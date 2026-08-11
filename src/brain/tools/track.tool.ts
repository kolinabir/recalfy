import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { TrackerStore } from '../../tracker/tracker.store';
import { NewEntry, SPEND_TRACKER } from '../../tracker/tracker.types';
import {
  asObject,
  optionalBoolean,
  optionalPositiveNumber,
  optionalString,
  requireObjectArray,
  requireString,
} from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class TrackTool extends Tool {
  readonly name = 'track';
  readonly description =
    'Log tracker entries: money spent, things done, things measured. "cucumber 250" is ' +
    'money already spent — tracker "spending", value 250, item cucumber. "buy cucumber 250" ' +
    'is money NOT yet spent — same, plus planned=true (it joins the shopping list). ' +
    '"drank 2L water" or "went to the gym" go to that tracker by name, which is created on ' +
    'first use. This is for numbers that recur; a durable fact is `remember`, a future ' +
    'to-do at a specific time is `remind`.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        description: 'The entries to log — one per amount or occurrence.',
        items: {
          type: 'object',
          properties: {
            tracker: {
              type: 'string',
              description: `Which tracker. Money is always "${SPEND_TRACKER}"; anything else by name ("water", "gym").`,
            },
            item: {
              type: 'string',
              description: 'What it was for: "cucumber", "rickshaw". Omit when meaningless.',
            },
            value: {
              type: 'number',
              description:
                'The amount, in the tracker\'s unit. Omit for a bare occurrence ("went to the gym") — it counts as 1.',
            },
            category: {
              type: 'string',
              description:
                'Spending only: a broad bucket like groceries, transport, rent, eating out, health.',
            },
            planned: {
              type: 'boolean',
              description:
                'Spending only: true when the money is not spent yet — "buy cucumber" is a shopping-list line, not an expense.',
            },
          },
          required: ['tracker'],
        },
      },
    },
    required: ['entries'],
  };

  constructor(private readonly trackers: TrackerStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const entries = requireObjectArray(asObject(args), 'entries').map(toEntry);
    const recorded = await this.trackers.record(context.userId, entries, context.sourceMessageId);

    const lines = recorded.map((entry) => {
      const label = entry.item ?? entry.tracker;
      const state = entry.planned ? 'on the list' : entry.tracker;
      return `${label} ${entry.value} → ${state} [${entry.sid}]`;
    });
    return `Logged ${recorded.length}: ${lines.join(' | ')}`;
  }
}

function toEntry(raw: Record<string, unknown>): NewEntry {
  return {
    tracker: requireString(raw, 'tracker'),
    item: optionalString(raw, 'item'),
    value: optionalPositiveNumber(raw, 'value'),
    category: optionalString(raw, 'category'),
    planned: optionalBoolean(raw, 'planned'),
  };
}
