import { Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { ReminderDoc, Repeat, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { nextOccurrence } from './next-occurrence';

/** A reminder stuck in `claimed` this long is assumed to have died mid-send. */
const CLAIM_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Reminders, and the claim protocol that delivers them exactly once per tick.
 *
 * At-least-once by design: a duplicate reminder is annoying, a missed one is a
 * broken product.
 */
@Injectable()
export class ReminderStore {
  private readonly logger = new Logger(ReminderStore.name);

  constructor(private readonly mongo: MongoService) {}

  async schedule(
    userId: UserId,
    text: string,
    at: Date,
    recurrence?: { repeat: Repeat; tz: string },
  ): Promise<ReminderDoc> {
    const reminder: ReminderDoc = {
      _id: new ObjectId(),
      userId,
      text: text.trim(),
      dueAt: at,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      ...(recurrence && { repeat: recurrence.repeat, tz: recurrence.tz, anchorAt: at }),
    };
    await this.mongo.reminders.insertOne(reminder);
    this.logger.log(`scheduled ${reminder._id.toHexString()} for ${at.toISOString()}`);
    return reminder;
  }

  /** Pending reminders for this user, soonest first. */
  upcoming(userId: UserId): Promise<ReminderDoc[]> {
    return this.mongo.reminders
      .find({ userId, status: 'pending' })
      .sort({ dueAt: 1 })
      .toArray();
  }

  /**
   * One reminder, whatever state it is in — including `sent`, which is where
   * snooze finds it: the scheduler closes the row out the moment delivery
   * returns, so by the time the user presses a button the original is history
   * and only its text is still wanted.
   */
  async find(userId: UserId, id: string): Promise<ReminderDoc | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.mongo.reminders.findOne({ _id: new ObjectId(id), userId });
  }

  async cancel(userId: UserId, id: string): Promise<ReminderDoc | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.mongo.reminders.findOneAndUpdate(
      { _id: new ObjectId(id), userId, status: 'pending' },
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after' },
    );
  }

  /**
   * Atomically takes ownership of one due reminder, so two ticks — or two
   * processes — can never send the same one.
   */
  claimNextDue(now: Date): Promise<ReminderDoc | null> {
    return this.mongo.reminders.findOneAndUpdate(
      { status: 'pending', dueAt: { $lte: now } },
      { $set: { status: 'claimed', claimedAt: now }, $inc: { attempts: 1 } },
      { sort: { dueAt: 1 }, returnDocument: 'after' },
    );
  }

  /**
   * Closes out a delivered reminder. A recurring one seeds its next
   * occurrence as a fresh pending row — the fired row stays `sent` for audit,
   * and only ever one row of a series is pending, so cancelling that row ends
   * the series.
   */
  async complete(reminder: ReminderDoc, now: Date): Promise<ReminderDoc | null> {
    await this.mongo.reminders.updateOne({ _id: reminder._id }, { $set: { status: 'sent' } });

    const { repeat, tz, anchorAt, userId, text } = reminder;
    if (!repeat || !tz || !anchorAt) return null;

    const next: ReminderDoc = {
      _id: new ObjectId(),
      userId,
      text,
      dueAt: nextOccurrence(anchorAt, repeat, tz, now),
      status: 'pending',
      repeat,
      anchorAt,
      tz,
      attempts: 0,
      createdAt: new Date(),
    };
    await this.mongo.reminders.insertOne(next);
    this.logger.log(
      `rescheduled series ${anchorAt.toISOString()} → ${next.dueAt.toISOString()}`,
    );
    return next;
  }

  /**
   * Pushes a claimed reminder back to pending at a later instant — quiet hours.
   *
   * Only `dueAt` moves. A recurring series computes every occurrence from
   * `anchorAt`, so holding one of them back until morning cannot drag the rest
   * of the series with it: "every day at 9am", deferred once, is still 9am
   * tomorrow.
   */
  async defer(reminder: ReminderDoc, until: Date): Promise<void> {
    await this.mongo.reminders.updateOne(
      { _id: reminder._id },
      { $set: { status: 'pending', dueAt: until }, $unset: { claimedAt: '' } },
    );
    this.logger.log(
      `deferred ${reminder._id.toHexString()} to ${until.toISOString()} — quiet hours`,
    );
  }

  /** Crash recovery: anything claimed but never sent goes back in the queue. */
  async releaseStaleClaims(now: Date): Promise<number> {
    const { modifiedCount } = await this.mongo.reminders.updateMany(
      { status: 'claimed', claimedAt: { $lte: new Date(now.getTime() - CLAIM_EXPIRY_MS) } },
      { $set: { status: 'pending' }, $unset: { claimedAt: '' } },
    );
    if (modifiedCount > 0) this.logger.warn(`released ${modifiedCount} stale claim(s)`);
    return modifiedCount;
  }
}
