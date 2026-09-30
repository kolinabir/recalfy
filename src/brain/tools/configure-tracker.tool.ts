import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { TrackerStore } from '../../tracker/tracker.store';
import { SPEND_TRACKER } from '../../tracker/tracker.types';
import {
  BadArguments,
  asObject,
  optionalPositiveNumber,
  optionalString,
  requireString,
} from './args';
import { Tool, ToolContext } from './tool';

@Injectable()
export class ConfigureTrackerTool extends Tool {
  readonly name = 'configure_tracker';
  readonly description =
    'Create or adjust a tracker\'s unit, aggregation or target. "Keep me under 15000 a ' +
    `month" is a monthly target on "${SPEND_TRACKER}", whose unit is the currency. "3L of ` +
    'water a day" → water, sum, unit L, target 3 per day. Plain logging never needs this.';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'e.g. spending, water, gym, weight.' },
      aggregate: {
        type: 'string',
        enum: ['sum', 'count', 'last'],
        description:
          'sum adds amounts (money, litres); count counts occurrences (gym); last keeps ' +
          'the latest reading (weight).',
      },
      unit: {
        type: 'string',
        description: `e.g. L, kg, pages — a currency code for ${SPEND_TRACKER}.`,
      },
      target: {
        type: 'number',
        description: 'Budget or goal per period. Omit to keep it.',
      },
      target_period: {
        type: 'string',
        enum: ['day', 'week', 'month'],
        description: 'The period the target applies to.',
      },
    },
    required: ['name'],
  };

  constructor(private readonly trackers: TrackerStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const parsed = asObject(args);
    const aggregateRaw = optionalString(parsed, 'aggregate');
    if (aggregateRaw && !['sum', 'count', 'last'].includes(aggregateRaw)) {
      throw new BadArguments('"aggregate" must be sum, count, or last.');
    }
    const periodRaw = optionalString(parsed, 'target_period');
    if (periodRaw && !['day', 'week', 'month'].includes(periodRaw)) {
      throw new BadArguments('"target_period" must be day, week, or month.');
    }

    const config = await this.trackers.configure(context.userId, {
      name: requireString(parsed, 'name'),
      aggregate: aggregateRaw as 'sum' | 'count' | 'last' | undefined,
      unit: optionalString(parsed, 'unit'),
      target: optionalPositiveNumber(parsed, 'target'),
      targetPeriod: periodRaw as 'day' | 'week' | 'month' | undefined,
    });

    const unit = config.unit ? ` in ${config.unit}` : '';
    const target = config.target
      ? `, target ${config.target}${config.unit ? ` ${config.unit}` : ''} per ${config.targetPeriod}`
      : '';
    return `Tracker "${config.name}" set: ${config.aggregate}${unit}${target}.`;
  }
}
