import { DateTime } from 'luxon';

import { EntryDoc } from '../mongo/collections';
import { SPEND_TRACKER, TargetPeriod, TrackerConfig } from './tracker.types';

export interface TrackerDigestInput {
  /** The user's currency — the spending tracker's unit. */
  currency: string;
  /** Configured trackers. Spending is rendered even when not among them. */
  trackers: TrackerConfig[];
  /**
   * Live entries (not deleted), reaching back to at least the start of the
   * current month in the user's zone, plus every open planned entry
   * regardless of age. The store guarantees the window; this stays pure.
   */
  entries: EntryDoc[];
  timezone: string;
  now: Date;
}

/** How many just-logged entries stay citable for cross-turn corrections. */
const RECENT_LIMIT = 5;
/** Categories worth naming before the tail collapses into the total. */
const TOP_CATEGORIES = 3;

/**
 * Renders the tracking digest that joins the memory document in the system
 * prompt. Pure — entries in, markdown out — for the same reason as
 * memory-document.ts: what the model sees must be assertable in a test.
 *
 * This is the deep end of the tracker module: because totals, budget state,
 * the open shopping list, and recent sids are already in the prompt, the
 * model answers "how much this month?" and resolves "bought the cucumber"
 * with zero tool calls.
 */
export function renderTrackerDigest(input: TrackerDigestInput): string {
  const live = input.entries.filter((entry) => !entry.deletedAt);
  const spend = live.filter((entry) => entry.tracker === SPEND_TRACKER);
  const others = input.trackers.filter((tracker) => tracker.name !== SPEND_TRACKER);

  // No entries ever and nothing configured: stay out of the prompt entirely.
  if (live.length === 0 && others.length === 0) return '';

  const sections = [
    renderSpending(spend, spendConfig(input.trackers), input),
    ...others.map((tracker) => renderTracker(tracker, live, input)),
    renderRecent(live, input),
  ].filter((section) => section !== '');

  return ['# Tracking', ...sections].join('\n\n');
}

function spendConfig(trackers: TrackerConfig[]): TrackerConfig | undefined {
  return trackers.find((tracker) => tracker.name === SPEND_TRACKER);
}

function renderSpending(
  spend: EntryDoc[],
  config: TrackerConfig | undefined,
  input: TrackerDigestInput,
): string {
  const monthStart = startOf('month', input);
  const done = spend.filter((entry) => !entry.planned);
  const thisMonth = done.filter((entry) => entry.at >= monthStart);
  const planned = spend.filter((entry) => entry.planned);

  if (done.length === 0 && planned.length === 0 && !config) return '';

  const month = DateTime.fromJSDate(input.now, { zone: input.timezone }).toFormat('LLLL');
  const lines = [`## Spending (${month})`];

  const total = sum(thisMonth);
  lines.push(`Total: ${amount(total, input.currency)}${topCategories(thisMonth, input.currency)}`);

  if (config?.target) {
    const used = Math.round((total / config.target) * 100);
    lines.push(
      `Budget: ${amount(config.target, input.currency)}/${config.targetPeriod ?? 'month'} — ${used}% used`,
    );
  }

  if (planned.length > 0) {
    // Value 1 is the "no price named" default, not an estimate worth showing.
    const items = planned.map(
      (entry) => `${entry.item ?? '?'}${entry.value > 1 ? ` ~${entry.value}` : ''} \`${entry.sid}\``,
    );
    lines.push(`Shopping list: ${items.join(' · ')}`);
  }

  return lines.join('\n');
}

function renderTracker(
  tracker: TrackerConfig,
  live: EntryDoc[],
  input: TrackerDigestInput,
): string {
  const entries = live.filter((entry) => entry.tracker === tracker.name && !entry.planned);
  const unit = tracker.unit ? ` ${tracker.unit}` : '';

  if (tracker.aggregate === 'last') {
    const latest = entries.reduce<EntryDoc | undefined>(
      (best, entry) => (!best || entry.at > best.at ? entry : best),
      undefined,
    );
    if (!latest) return `## ${title(tracker.name)}\nNo readings yet.`;
    const when = DateTime.fromJSDate(latest.at, { zone: input.timezone }).toFormat('d LLL');
    return `## ${title(tracker.name)}\nLatest: ${latest.value}${unit} (${when})`;
  }

  const period = tracker.targetPeriod ?? 'day';
  const inPeriod = entries.filter((entry) => entry.at >= startOf(period, input));
  const total = tracker.aggregate === 'count' ? inPeriod.length : sum(inPeriod);
  const goal = tracker.target ? ` of ${tracker.target}${unit}` : `${unit}`;

  return `## ${title(tracker.name)} (this ${period})\n${total}${goal}`;
}

/** The last few entries, sids included, so "actually 350" stays resolvable. */
function renderRecent(live: EntryDoc[], input: TrackerDigestInput): string {
  const recent = live
    .filter((entry) => !entry.planned)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_LIMIT);
  if (recent.length === 0) return '';

  const lines = recent.map((entry) => {
    const when = DateTime.fromJSDate(entry.at, { zone: input.timezone }).toFormat('d LLL');
    const label = entry.item ?? entry.tracker;
    const category = entry.category ? `, ${entry.category}` : '';
    return `- ${label} ${entry.value} (${entry.tracker}${category}) ${when} \`${entry.sid}\``;
  });

  return `Recent entries:\n${lines.join('\n')}`;
}

function startOf(period: TargetPeriod, input: Pick<TrackerDigestInput, 'timezone' | 'now'>): Date {
  return DateTime.fromJSDate(input.now, { zone: input.timezone }).startOf(period).toJSDate();
}

function sum(entries: EntryDoc[]): number {
  return entries.reduce((total, entry) => total + entry.value, 0);
}

function topCategories(entries: EntryDoc[], currency: string): string {
  const byCategory = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.category) continue;
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.value);
  }
  if (byCategory.size === 0) return '';

  const top = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CATEGORIES)
    .map(([category, total]) => `${category} ${amount(total, currency)}`);
  return ` · ${top.join(' · ')}`;
}

function amount(value: number, currency: string): string {
  return `${value.toLocaleString('en-US')} ${currency}`;
}

function title(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
