import { Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { DateTime } from 'luxon';

import { EntryDoc, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { FALLBACK_CURRENCY } from './currency';
import { renderTrackerDigest } from './tracker-digest';
import {
  Aggregate,
  EntryPatch,
  NewEntry,
  ReportQuery,
  SPEND_TRACKER,
  TargetPeriod,
  TrackerConfig,
} from './tracker.types';

/** Entries the digest fetch will hand the renderer, at most. */
const DIGEST_WINDOW_LIMIT = 500;

const BASE36 = 36;
const MIN_SID_DIGITS = 2;

export interface RecordedEntry {
  sid: string;
  tracker: string;
  item?: string;
  value: number;
  planned: boolean;
}

export interface ReportRow {
  /** The bucket label: a category, an item, or a local ISO day. */
  key: string;
  total: number;
  count: number;
}

/**
 * The ledger: everything the assistant counts, and the only way to change it.
 *
 * The high-volume sibling of MemoryStore. Behind four methods and a digest:
 * entry-sid minting, tracker auto-creation, planned→spent transitions, soft
 * delete, and the aggregation that keeps thousands of rows out of the prompt.
 * Callers never touch a collection or an ObjectId.
 */
@Injectable()
export class TrackerStore {
  private readonly logger = new Logger(TrackerStore.name);

  constructor(private readonly mongo: MongoService) {}

  /**
   * Writes entries. An unknown tracker name quietly becomes a new tracker —
   * counting when no value came with it, summing otherwise — because "track
   * my water" should cost one turn, not a configuration dialogue.
   */
  async record(
    userId: UserId,
    entries: NewEntry[],
    sourceMessageId?: ObjectId,
  ): Promise<RecordedEntry[]> {
    if (entries.length === 0) return [];

    await this.ensureTrackers(userId, entries);
    const sids = await this.mint(userId, entries.length);

    const now = new Date();
    const documents: EntryDoc[] = entries.map((entry, index) => ({
      _id: new ObjectId(),
      userId,
      sid: sids[index],
      tracker: normalise(entry.tracker),
      ...(entry.item ? { item: entry.item } : {}),
      value: entry.value ?? 1,
      ...(entry.category ? { category: entry.category.toLowerCase() } : {}),
      ...(entry.planned ? { planned: true } : {}),
      at: now,
      ...(sourceMessageId ? { sourceMessageId } : {}),
      createdAt: now,
    }));

    await this.mongo.entries.insertMany(documents);
    this.logger.log(`recorded ${documents.length} entr${documents.length === 1 ? 'y' : 'ies'} for ${userId}`);

    return documents.map((doc) => ({
      sid: doc.sid,
      tracker: doc.tracker,
      item: doc.item,
      value: doc.value,
      planned: doc.planned === true,
    }));
  }

  /**
   * Corrects one entry by sid: amount, category, item, planned→bought, or
   * removal. Buying re-stamps `at` — the expense happened now, not when it
   * went on the list. Null when the sid matches nothing live.
   */
  async update(userId: UserId, sid: string, patch: EntryPatch): Promise<EntryDoc | null> {
    const sets: Partial<EntryDoc> = {};
    const unsets: Record<string, ''> = {};

    if (patch.value !== undefined) sets.value = patch.value;
    if (patch.category !== undefined) sets.category = patch.category.toLowerCase();
    if (patch.item !== undefined) sets.item = patch.item;
    if (patch.bought) {
      unsets.planned = '';
      sets.at = new Date();
    }
    if (patch.remove) sets.deletedAt = new Date();

    // An all-empty patch must not reach Mongo — {} is not a valid update.
    if (Object.keys(sets).length === 0 && Object.keys(unsets).length === 0) {
      return this.mongo.entries.findOne({ userId, sid, deletedAt: { $exists: false } });
    }

    const updated = await this.mongo.entries.findOneAndUpdate(
      { userId, sid, deletedAt: { $exists: false } },
      {
        ...(Object.keys(sets).length ? { $set: sets } : {}),
        ...(Object.keys(unsets).length ? { $unset: unsets } : {}),
      },
      { returnDocument: 'after' },
    );

    if (updated) this.logger.log(`updated entry ${sid} for ${userId}`);
    return updated;
  }

  /** Creates or reshapes a tracker; a budget or goal is just its target. */
  async configure(
    userId: UserId,
    config: {
      name: string;
      aggregate?: Aggregate;
      unit?: string;
      target?: number;
      targetPeriod?: TargetPeriod;
    },
  ): Promise<TrackerConfig> {
    const name = normalise(config.name);
    const existing = (await this.trackersOf(userId)).find((tracker) => tracker.name === name);

    const next: TrackerConfig = {
      name,
      aggregate: config.aggregate ?? existing?.aggregate ?? defaultAggregate(name),
      ...(config.unit ?? existing?.unit ? { unit: config.unit ?? existing?.unit } : {}),
      ...(config.target ?? existing?.target ? { target: config.target ?? existing?.target } : {}),
      targetPeriod:
        config.targetPeriod ?? existing?.targetPeriod ?? (name === SPEND_TRACKER ? 'month' : 'day'),
      createdAt: existing?.createdAt ?? new Date(),
    };

    await this.mongo.users.updateOne(
      { _id: userId },
      existing
        ? { $set: { 'trackers.$[t]': next } }
        : { $push: { trackers: next } },
      existing ? { arrayFilters: [{ 't.name': name }] } : {},
    );

    // Spending's unit *is* the user's currency; keep the two in step.
    if (name === SPEND_TRACKER && config.unit) {
      await this.mongo.users.updateOne({ _id: userId }, { $set: { currency: config.unit } });
    }

    this.logger.log(`configured tracker "${name}" for ${userId}`);
    return next;
  }

  /** Aggregates in Mongo — the rows themselves never leave the database. */
  async report(userId: UserId, query: ReportQuery): Promise<{ total: number; count: number; rows: ReportRow[] }> {
    const match = {
      userId,
      tracker: normalise(query.tracker),
      planned: { $ne: true },
      deletedAt: { $exists: false },
      at: { $gte: query.from, $lt: query.to },
    };

    const groups = await this.mongo.entries
      .aggregate<{ _id: string | null; total: number; count: number }>([
        { $match: match },
        {
          $group: {
            _id: groupKey(query.groupBy),
            total: { $sum: '$value' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ])
      .toArray();

    const rows = query.groupBy
      ? groups.map((group) => ({ key: group._id ?? 'uncategorised', total: group.total, count: group.count }))
      : [];
    const total = groups.reduce((sum, group) => sum + group.total, 0);
    const count = groups.reduce((sum, group) => sum + group.count, 0);

    return { total, count, rows };
  }

  /** The markdown section the system prompt carries. Empty until first use. */
  async digest(userId: UserId, timezone: string, now: Date): Promise<string> {
    const user = await this.mongo.users.findOne(
      { _id: userId },
      { projection: { currency: 1, trackers: 1 } },
    );

    const local = DateTime.fromJSDate(now, { zone: timezone });
    // A weekly target's window can begin before the month does.
    const windowStart = DateTime.min(local.startOf('month'), local.startOf('week')).toJSDate();

    const entries = await this.mongo.entries
      .find({
        userId,
        deletedAt: { $exists: false },
        $or: [{ at: { $gte: windowStart } }, { planned: true }],
      })
      .sort({ at: -1 })
      .limit(DIGEST_WINDOW_LIMIT)
      .toArray();

    return renderTrackerDigest({
      currency: user?.currency ?? FALLBACK_CURRENCY,
      trackers: user?.trackers ?? [],
      entries,
      timezone,
      now,
    });
  }

  async trackersOf(userId: UserId): Promise<TrackerConfig[]> {
    const user = await this.mongo.users.findOne({ _id: userId }, { projection: { trackers: 1 } });
    return user?.trackers ?? [];
  }

  /** Auto-creates any tracker named by an entry that doesn't exist yet. */
  private async ensureTrackers(userId: UserId, entries: NewEntry[]): Promise<void> {
    const known = new Set((await this.trackersOf(userId)).map((tracker) => tracker.name));
    known.add(SPEND_TRACKER); // Built in — never needs creating.

    const wanted = new Map<string, NewEntry>();
    for (const entry of entries) {
      const name = normalise(entry.tracker);
      if (!known.has(name) && !wanted.has(name)) wanted.set(name, entry);
    }

    for (const [name, sample] of wanted) {
      await this.configure(userId, {
        name,
        aggregate: sample.value === undefined ? 'count' : 'sum',
      });
    }
  }

  /** Entry sids: the memory counter's sibling, with an `e` prefix. */
  private async mint(userId: UserId, count: number): Promise<string[]> {
    const user = await this.mongo.users.findOneAndUpdate(
      { _id: userId },
      { $inc: { entrySidCounter: count } },
      { returnDocument: 'after' },
    );
    if (!user) throw new Error(`Unknown user ${userId} — call UserStore.ensure() first`);

    const last = user.entrySidCounter ?? count;
    const first = last - count + 1;
    return Array.from(
      { length: count },
      (_, offset) => `e${(first + offset).toString(BASE36).padStart(MIN_SID_DIGITS, '0')}`,
    );
  }
}

function normalise(name: string): string {
  return name.trim().toLowerCase();
}

/** Spending sums; anything else counts until told otherwise. */
function defaultAggregate(name: string): Aggregate {
  return name === SPEND_TRACKER ? 'sum' : 'count';
}

function groupKey(groupBy: ReportQuery['groupBy']): string | Record<string, unknown> | null {
  if (groupBy === 'category') return '$category';
  if (groupBy === 'item') return '$item';
  if (groupBy === 'day') return { $dateToString: { format: '%Y-%m-%d', date: '$at' } };
  return null;
}
