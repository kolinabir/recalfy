import { Inject, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { ENV, Env } from '../config/env';
import { UserDoc, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';

/**
 * The user record: timezone and the short-id counter. Small on purpose —
 * identity is the Telegram user id, so there is nothing to authenticate.
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
    return true;
  }
}
