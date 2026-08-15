import { encodeAction } from '../channels/action-data';
import { Action } from '../channels/channel';

export const SNOOZE = 'snooze';

/**
 * Deliberately all in minutes, and deliberately short.
 *
 * "Tomorrow morning" is the option people ask for, and it is the one left
 * out: it needs the user's zone and has to dodge their quiet hours, which
 * makes the button a scheduling decision rather than a delay. A delay is
 * something a button can honestly promise.
 */
export const SNOOZE_OPTIONS = [
  { key: '10m', label: '10 min', minutes: 10 },
  { key: '1h', label: '1 hour', minutes: 60 },
  { key: '3h', label: '3 hours', minutes: 180 },
] as const;

export type SnoozeKey = (typeof SNOOZE_OPTIONS)[number]['key'];

/** Null when the key is not one of ours — an old button, or a made-up one. */
export function snoozedTo(key: string, from: Date): { at: Date; label: string } | null {
  const option = SNOOZE_OPTIONS.find((candidate) => candidate.key === key);
  if (!option) return null;

  return { at: new Date(from.getTime() + option.minutes * 60_000), label: option.label };
}

/**
 * The buttons under a due reminder. Empty when the id will not fit in a
 * payload, which for a 24-character ObjectId it always does — the check is
 * there so that changing the id format later fails visibly rather than
 * shipping a keyboard Telegram refuses to draw.
 */
export function snoozeActions(reminderId: string): Action[] {
  return SNOOZE_OPTIONS.flatMap((option) => {
    const data = encodeAction(SNOOZE, reminderId, option.key);
    return data ? [{ label: option.label, data }] : [];
  });
}

/** What the message says once a button has been pressed. */
export function snoozedLine(label: string): string {
  return `💤 Snoozed — back in ${label}.`;
}
