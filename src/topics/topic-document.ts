import { createHash } from 'node:crypto';

import { Memory } from '../memory/memory.types';
import { maskSecret } from '../telegram/mask-secret';

/**
 * A memory group, rendered as the one message its topic holds.
 *
 * Credentials are masked, like everywhere else memory is *listed* rather than
 * asked for. A tab has no reveal of its own — but it does not need one now
 * that the conversation is the reveal: ask for the password and the bot says
 * it, legibly, for a minute. What a tab must not be is the place a password
 * sits in the open for months because it happens to be in the Home group.
 */

/** Telegram's limit is 4096; the margin covers the footer and a long group. */
const MAX_BODY = 3800;

const OVERFLOW = (n: number) =>
  `\n\n…and ${n} older — recalfy.com/dashboard/memories`;

export function renderTopic(group: string, facts: readonly Memory[], now: Date): string {
  const header = `${group}\n`;
  const footer = `\n\n${facts.length} ${facts.length === 1 ? 'fact' : 'facts'} · updated ${stamp(now)}`;

  const lines: string[] = [];
  let length = header.length + footer.length;

  // Newest first, and truncation drops the oldest. A group that outgrows one
  // message is rare, and when it happens the recent end is the half worth
  // keeping — the rest is one tap away on the dashboard.
  for (const fact of facts) {
    const line = `\n• ${maskSecret(fact.text)}`;
    if (length + line.length > MAX_BODY) break;
    lines.push(line);
    length += line.length;
  }

  const dropped = facts.length - lines.length;
  return `${header}${lines.join('')}${footer}${dropped > 0 ? OVERFLOW(dropped) : ''}`;
}

/**
 * Identifies the text last written, so an unchanged group costs no API call.
 * Truncated hard — this is a change detector, not a signature.
 */
export function hashOf(body: string): string {
  return createHash('sha1').update(body).digest('hex').slice(0, 16);
}

/**
 * Mongo keys cannot contain dots or start with `$`, and a group name comes
 * from a language model — "Work (Dhaka)" and "Health/Meds" are both plausible.
 * The key is a slug, so a group that renames itself gets a new topic rather
 * than silently rewriting the old one.
 */
export function topicKey(group: string): string {
  return group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other';
}

/** Groups in the order the memory document uses: most recently touched first. */
export function byGroup(facts: readonly Memory[]): Map<string, Memory[]> {
  const groups = new Map<string, Memory[]>();
  for (const fact of facts) {
    const list = groups.get(fact.group);
    if (list) list.push(fact);
    else groups.set(fact.group, [fact]);
  }
  return groups;
}

function stamp(now: Date): string {
  return now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
