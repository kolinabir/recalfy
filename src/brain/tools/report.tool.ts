import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { JsonSchema } from '../../llm/llm.types';
import { TrackerStore } from '../../tracker/tracker.store';
import { SPEND_TRACKER } from '../../tracker/tracker.types';
import { BadArguments, asObject, optionalString } from './args';
import { Tool, ToolContext } from './tool';

const PERIODS = ['today', 'yesterday', 'this_week', 'this_month', 'last_month'] as const;
type Period = (typeof PERIODS)[number];

@Injectable()
export class ReportTool extends Tool {
  readonly name = 'report';
  readonly description =
    'Sum tracker entries over a period, when the Tracking section cannot answer: past ' +
    'months, breakdowns, "how often did I go to the gym in June?".';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      tracker: {
        type: 'string',
        description: `Defaults to "${SPEND_TRACKER}".`,
      },
      period: {
        type: 'string',
        description: 'today, yesterday, this_week, this_month, last_month, or a month as YYYY-MM.',
      },
      group_by: {
        type: 'string',
        enum: ['category', 'item', 'day'],
        description: 'Omit for just the total.',
      },
    },
    required: [],
  };

  constructor(private readonly trackers: TrackerStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const parsed = asObject(args);
    const tracker = optionalString(parsed, 'tracker') ?? SPEND_TRACKER;
    const groupByRaw = optionalString(parsed, 'group_by');
    const groupBy =
      groupByRaw === 'category' || groupByRaw === 'item' || groupByRaw === 'day'
        ? groupByRaw
        : undefined;

    const { from, to, label } = resolvePeriod(
      optionalString(parsed, 'period') ?? 'this_month',
      context,
    );
    const { total, count, rows } = await this.trackers.report(context.userId, {
      tracker,
      from,
      to,
      groupBy,
    });

    if (count === 0) return `Nothing logged for ${tracker} in ${label}.`;

    const head = `${tracker}, ${label}: total ${format(total)} across ${count} entr${count === 1 ? 'y' : 'ies'}.`;
    if (rows.length === 0) return head;

    const breakdown = rows
      .map((row) => `${row.key}: ${format(row.total)} (${row.count})`)
      .join(' | ');
    return `${head} By ${groupBy}: ${breakdown}`;
  }
}

function resolvePeriod(
  period: string,
  context: ToolContext,
): { from: Date; to: Date; label: string } {
  const local = DateTime.fromJSDate(context.now, { zone: context.timezone });

  if (/^\d{4}-\d{2}$/.test(period)) {
    const month = DateTime.fromISO(`${period}-01`, { zone: context.timezone });
    if (!month.isValid) throw new BadArguments(`"${period}" is not a valid month.`);
    return {
      from: month.startOf('month').toJSDate(),
      to: month.endOf('month').toJSDate(),
      label: month.toFormat('LLLL yyyy'),
    };
  }

  switch (period as Period) {
    case 'today':
      return { from: local.startOf('day').toJSDate(), to: local.endOf('day').toJSDate(), label: 'today' };
    case 'yesterday': {
      const day = local.minus({ days: 1 });
      return { from: day.startOf('day').toJSDate(), to: day.endOf('day').toJSDate(), label: 'yesterday' };
    }
    case 'this_week':
      return { from: local.startOf('week').toJSDate(), to: local.endOf('week').toJSDate(), label: 'this week' };
    case 'this_month':
      return { from: local.startOf('month').toJSDate(), to: local.endOf('month').toJSDate(), label: 'this month' };
    case 'last_month': {
      const month = local.minus({ months: 1 });
      return {
        from: month.startOf('month').toJSDate(),
        to: month.endOf('month').toJSDate(),
        label: month.toFormat('LLLL'),
      };
    }
    default:
      throw new BadArguments(`"period" must be one of ${PERIODS.join(', ')} or YYYY-MM.`);
  }
}

function format(value: number): string {
  return value.toLocaleString('en-US');
}
