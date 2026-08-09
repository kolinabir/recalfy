import { Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { ReminderDoc, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';

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

  async schedule(userId: UserId, text: string, at: Date): Promise<ReminderDoc> {
    const reminder: ReminderDoc = {
      _id: new ObjectId(),
      userId,
      text: text.trim(),
      dueAt: at,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
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

  async markSent(id: ObjectId): Promise<void> {
    await this.mongo.reminders.updateOne({ _id: id }, { $set: { status: 'sent' } });
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
