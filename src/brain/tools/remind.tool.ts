import { Injectable } from '@nestjs/common';

import { JsonSchema } from '../../llm/llm.types';
import { Repeat } from '../../mongo/collections';
import { describeRepeat } from '../../reminders/next-occurrence';
import { ReminderStore } from '../../reminders/reminder.store';
import { Resolution, resolveLeadTime, resolveWhen } from '../../reminders/resolve-when';
import { BadArguments, asObject, optionalPositiveInteger, optionalString, requireString } from './args';
import { Tool, ToolContext } from './tool';
import { siteLink } from '../../config/site';

const REPEAT_UNITS: Repeat['unit'][] = ['day', 'week', 'month', 'year'];

@Injectable()
export class RemindTool extends Tool {
  readonly name = 'remind';
  readonly description =
    'Schedule a reminder. Work out the absolute time yourself from the current time in ' +
    'your instructions. Recurring: the FIRST occurrence as `when`, plus `repeat`. "N days ' +
    'before X": `event_at` and `lead_days` instead of `when` — never do that subtraction yourself.';

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
          'ISO-8601 instant with an offset, e.g. 2026-08-10T18:00:00+06:00 — never a relative ' +
          'phrase. Omit when using event_at.',
      },
      event_at: {
        type: 'string',
        description: 'For "N days before X": the ISO-8601 instant of X itself.',
      },
      lead_days: {
        type: 'number',
        description: 'Days before event_at to fire.',
      },
      repeat: {
        type: 'string',
        enum: [...REPEAT_UNITS],
        description:
          '"every Monday" is week, "the 3rd of each month" is month. Omit for one-offs.',
      },
      every: {
        type: 'number',
        description: 'Interval, default 1: "every 2 weeks" is week with every=2.',
      },
    },
    required: ['text'],
  };

  constructor(private readonly reminders: ReminderStore) {
    super();
  }

  async execute(context: ToolContext, args: unknown): Promise<string> {
    const parsed = asObject(args);
    const text = requireString(parsed, 'text');
    const when = optionalString(parsed, 'when');
    const eventAt = optionalString(parsed, 'event_at');
    const leadDays = optionalPositiveInteger(parsed, 'lead_days');
    const asked = readRepeat(parsed);

    // Recurring is an Archive feature. The first occurrence is still scheduled
    // rather than refused outright — someone who said "remind me every Monday"
    // wants next Monday more than they want a sales pitch, and dropping it
    // entirely would lose the thing they actually asked for.
    const denied = asked !== undefined && !context.limits.recurringReminders;
    const repeat = denied ? undefined : asked;

    if (when === undefined && (eventAt === undefined || leadDays === undefined)) {
      throw new BadArguments('Pass either "when", or both "event_at" and "lead_days".');
    }

    // Scheduling a wall-clock time against a guessed zone fires hours out.
    // Relative offsets are safe because they resolve to the same instant
    // whatever the zone is labelled — but a recurring series or a lead-time
    // computation is wall-clock by nature, so those always need the real zone.
    if (!context.onboarded && (asked || !when || !isSoon(when, context.now))) {
      return 'Cannot schedule that yet — you do not know where the user is. Ask which city or country they are in first, then try again.';
    }

    // The model's arithmetic is never trusted: a misparse must surface as a
    // question to the user, not as a reminder that silently never fires.
    const resolved: Resolution =
      when !== undefined
        ? resolveWhen(when, context.timezone, context.now)
        : resolveLeadTime(eventAt!, leadDays!, context.timezone, context.now);
    if (!resolved.ok) {
      return `Could not schedule: ${resolved.reason} Ask the user what they meant.`;
    }

    const reminder = await this.reminders.schedule(
      context.userId,
      text,
      resolved.at,
      repeat && { repeat, tz: context.timezone },
      context.secrets,
    );
    context.turn.scheduled.push(reminder._id.toHexString());

    const cadence = repeat ? `, repeating ${describeRepeat(repeat)}` : '';
    const scheduled =
      `Scheduled "${text}" for ${resolved.spoken}${cadence} ` +
      `[${reminder._id.toHexString()}]. Confirm that exact time back to the user.`;

    if (!denied) return scheduled;
    return (
      `${scheduled} IMPORTANT: they asked for a repeating reminder, and repeating ` +
      'reminders are an Archive feature — this one is a ONE-OFF. Say so plainly: ' +
      'this one is set, but it will not repeat, and Archive at ' +
      `${siteLink('/dashboard/billing')} makes it recurring. Do not imply it repeats.`
    );
  }
}

function readRepeat(args: Record<string, unknown>): Repeat | undefined {
  const unit = optionalString(args, 'repeat');
  if (unit === undefined) return undefined;
  if (!REPEAT_UNITS.includes(unit as Repeat['unit'])) {
    throw new BadArguments(`"repeat" must be one of: ${REPEAT_UNITS.join(', ')}.`);
  }
  return { unit: unit as Repeat['unit'], interval: optionalPositiveInteger(args, 'every') ?? 1 };
}

/** Within a few hours means a relative offset, which no zone can get wrong. */
const RELATIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

function isSoon(iso: string, now: Date): boolean {
  const at = Date.parse(iso);
  return Number.isFinite(at) && at - now.getTime() <= RELATIVE_WINDOW_MS;
}
