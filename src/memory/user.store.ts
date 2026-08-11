import { Inject, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { ENV, Env } from '../config/env';
import { BriefConfig, Channel, UserDoc, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { currencyForZone } from '../tracker/currency';

/**
 * The user record: timezone, the short-id counter, and where the person was
 * last reachable. Small on purpose — identity is settled before a message
 * gets here, by resolving a channel handle to a linked account.
 */
@Injectable()
export class UserStore {
  constructor(
    private readonly mongo: MongoService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Idempotent; safe to call on every inbound message. */
  async ensure(userId: UserId): Promise<UserDoc> {
    const user = await this.mongo.users.findOneAndUpdate(
      { _id: userId },
      {
        $setOnInsert: {
          tz: this.env.defaultTimezone,
          sidCounter: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    if (!user) throw new Error(`Failed to upsert user ${userId}`);
    return user;
  }

  /**
   * Records that the user just spoke, and where. Drives two things: which
   * chat an unprompted message goes to, and whether WhatsApp's 24-hour
   * free-form window is open — see channels/outbox.ts.
   */
  async noteInbound(userId: UserId, channel: Channel, at: Date): Promise<void> {
    await this.mongo.users.updateOne(
      { _id: userId },
      { $set: { lastChannel: channel, [`lastInboundAt.${channel}`]: at } },
    );
  }

  /** What the router needs, and nothing else. */
  async routing(userId: UserId): Promise<Pick<UserDoc, 'lastChannel' | 'lastInboundAt'> | null> {
    return this.mongo.users.findOne(
      { _id: userId },
      { projection: { lastChannel: 1, lastInboundAt: 1 } },
    );
  }

  /**
   * Rejects anything Luxon can't resolve, so a bad zone never reaches a
   * reminder. Learning where someone is also ends onboarding — it is the one
   * fact the assistant cannot work without.
   */
  async setTimezone(userId: UserId, tz: string): Promise<boolean> {
    if (!DateTime.local().setZone(tz).isValid) return false;

    await this.mongo.users.updateOne(
      { _id: userId },
      // $min sets the field when it's missing and keeps the earlier value
      // otherwise, so a later move doesn't rewrite when we first met them.
      { $set: { tz }, $min: { onboardedAt: new Date() } },
    );
    // The zone is also the currency default — but only ever the first time.
    // Moving to Berlin must not silently re-denominate a BDT ledger.
    await this.mongo.users.updateOne(
      { _id: userId, currency: { $exists: false } },
      { $set: { currency: currencyForZone(tz) } },
    );
    return true;
  }

  /** An explicit "use dollars" from the user, via configure_tracker. */
  async setCurrency(userId: UserId, currency: string): Promise<void> {
    await this.mongo.users.updateOne({ _id: userId }, { $set: { currency } });
  }

  async setBrief(userId: UserId, brief: BriefConfig): Promise<void> {
    await this.mongo.users.updateOne({ _id: userId }, { $set: { brief } });
  }

  async setReflection(userId: UserId, reflection: BriefConfig): Promise<void> {
    await this.mongo.users.updateOne({ _id: userId }, { $set: { reflection } });
  }

  /** Everyone the daily brief could apply to. One user today; a cursor never hurts. */
  onboarded(): Promise<UserDoc[]> {
    return this.mongo.users.find({ onboardedAt: { $exists: true } }).toArray();
  }

  /**
   * Takes today's brief slot for this user, atomically — two ticks (or two
   * processes) can never both send it. False means someone else already did.
   */
  claimBrief(userId: UserId, day: string): Promise<boolean> {
    return this.claimDay(userId, 'lastBriefDay', day);
  }

  claimReflection(userId: UserId, day: string): Promise<boolean> {
    return this.claimDay(userId, 'lastReflectionDay', day);
  }

  private async claimDay(
    userId: UserId,
    field: 'lastBriefDay' | 'lastReflectionDay',
    day: string,
  ): Promise<boolean> {
    const claimed = await this.mongo.users.findOneAndUpdate(
      // $ne matches a missing field too, so first-ever claims work cleanly.
      { _id: userId, [field]: { $ne: day } },
      { $set: { [field]: day } },
    );
    return claimed !== null;
  }
}
