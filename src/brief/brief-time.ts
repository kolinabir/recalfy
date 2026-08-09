import { DateTime } from 'luxon';

import { BriefConfig } from '../mongo/collections';

/** On unless turned off: a memory assistant that never speaks first is a notebook. */
export const DEFAULT_BRIEF: BriefConfig = { enabled: true, hour: 8, minute: 0 };

/** Off unless asked for: a second unprompted message a day must be opted into. */
export const DEFAULT_REFLECTION: BriefConfig = { enabled: false, hour: 21, minute: 30 };

/**
 * A message that missed its slot by this much is skipped, not sent late — a
 * "good morning" at 9pm after an outage is worse than none.
 */
const MAX_LATE_MINUTES = 4 * 60;

export interface SlotTarget {
  tz: string;
  onboardedAt?: Date;
}

/**
 * Whether a daily slot should fire now — and for which local day.
 *
 * Returns the local ISO date to claim, or null. Pure: the tick calls this
 * with the clock, tests call it with whatever they like. Both the morning
 * brief and the evening reflection are this one rule with different defaults.
 */
export function slotDueDay(
  target: SlotTarget,
  config: BriefConfig | undefined,
  fallback: BriefConfig,
  lastDay: string | undefined,
  now: Date,
): string | null {
  // Not onboarded means the zone is a guess; a message at a guessed hour is spam.
  if (!target.onboardedAt) return null;

  const slot = config ?? fallback;
  if (!slot.enabled) return null;

  const local = DateTime.fromJSDate(now, { zone: target.tz });
  if (!local.isValid) return null;

  const day = local.toISODate();
  if (day === null || lastDay === day) return null;

  const minutesSinceSlot = local.hour * 60 + local.minute - (slot.hour * 60 + slot.minute);
  if (minutesSinceSlot < 0 || minutesSinceSlot > MAX_LATE_MINUTES) return null;

  return day;
}

export interface BriefTarget extends SlotTarget {
  brief?: BriefConfig;
  lastBriefDay?: string;
}

export function briefDueDay(target: BriefTarget, now: Date): string | null {
  return slotDueDay(target, target.brief, DEFAULT_BRIEF, target.lastBriefDay, now);
}

export interface ReflectionTarget extends SlotTarget {
  reflection?: BriefConfig;
  lastReflectionDay?: string;
}

export function reflectionDueDay(target: ReflectionTarget, now: Date): string | null {
  return slotDueDay(target, target.reflection, DEFAULT_REFLECTION, target.lastReflectionDay, now);
}
