import { Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { generatePairingCode } from './pairing-code';

export type RedeemResult =
  | { status: 'linked'; email: string }
  /** Token unknown, already spent, or past its expiry. */
  | { status: 'invalid' }
  /** This Telegram account already belongs to a different web account. */
  | { status: 'taken'; email: string }
  /** The token's web account already linked to a different Telegram account. */
  | { status: 'account-linked' };

/**
 * Redeems the one-time tokens minted by the web app's "Connect Telegram"
 * button, and answers the only question the ingress cares about: is this
 * Telegram id attached to an account?
 */
@Injectable()
export class LinkStore {
  private readonly logger = new Logger(LinkStore.name);

  constructor(private readonly mongo: MongoService) {}

  /** The gate. One indexed lookup per inbound message. */
  async isLinked(telegramUserId: UserId): Promise<boolean> {
    const count = await this.mongo.webUsers.countDocuments({ telegramUserId }, { limit: 1 });
    return count > 0;
  }

  async redeem(token: string, telegramUserId: UserId): Promise<RedeemResult> {
    // Refuse to move an existing link. Someone who gets hold of another
    // person's token should not be able to re-point their own Telegram
    // account, and the owner should hear about it rather than silently lose
    // the connection.
    const existing = await this.mongo.webUsers.findOne({ telegramUserId });
    if (existing) {
      return { status: 'taken', email: existing.email };
    }

    // Single-use and freshness in one filter: a second /start racing the
    // first matches nothing, and an expired token fails here even though
    // Mongo's TTL sweep may not have removed it yet.
    const claimed = await this.mongo.linkTokens.findOneAndUpdate(
      { _id: token, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date(), consumedBy: telegramUserId } },
      { returnDocument: 'after' },
    );

    if (!claimed) return { status: 'invalid' };

    // Better Auth keys users by ObjectId; the token carries its hex form.
    if (!ObjectId.isValid(claimed.webUserId)) {
      this.logger.warn(`Token ${token} carries an unusable webUserId`);
      return { status: 'invalid' };
    }

    const linked = await this.mongo.webUsers.findOneAndUpdate(
      // The second condition keeps one web account from collecting several
      // Telegram accounts by minting a fresh token each time.
      { _id: new ObjectId(claimed.webUserId), telegramUserId: { $exists: false } },
      { $set: { telegramUserId, telegramLinkedAt: new Date() } },
      { returnDocument: 'after' },
    );

    if (!linked) {
      // The token was spent above; release it so a genuine retry isn't burnt
      // by a state we rejected.
      await this.mongo.linkTokens.updateOne(
        { _id: token },
        { $unset: { consumedAt: '', consumedBy: '' } },
      );
      return { status: 'account-linked' };
    }

    this.logger.log(`Linked Telegram ${telegramUserId} to ${linked.email}`);
    return { status: 'linked', email: linked.email };
  }

  /**
   * Mints the manual fallback code. Any outstanding code for this Telegram
   * account is dropped first, so a code read out earlier can't still be live
   * once someone asks for a new one.
   */
  async issuePairingCode(telegramUserId: UserId, ttlMs: number): Promise<string> {
    await this.mongo.pairingCodes.deleteMany({ telegramUserId });

    const code = generatePairingCode();
    const now = new Date();

    await this.mongo.pairingCodes.insertOne({
      _id: code,
      telegramUserId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      attempts: 0,
    });

    return code;
  }

  /** Seconds until this account may ask for another code, or 0 if it may now. */
  async pairingCooldown(telegramUserId: UserId, minIntervalMs: number): Promise<number> {
    const recent = await this.mongo.pairingCodes.findOne(
      { telegramUserId },
      { sort: { createdAt: -1 } },
    );
    if (!recent) return 0;

    const elapsed = Date.now() - recent.createdAt.getTime();
    return elapsed >= minIntervalMs ? 0 : Math.ceil((minIntervalMs - elapsed) / 1000);
  }

  /** Returns the email it was detached from, or null if it wasn't linked. */
  async unlink(telegramUserId: UserId): Promise<string | null> {
    const previous = await this.mongo.webUsers.findOneAndUpdate(
      { telegramUserId },
      { $unset: { telegramUserId: '', telegramLinkedAt: '' } },
      { returnDocument: 'before' },
    );

    if (!previous) return null;

    this.logger.log(`Unlinked Telegram ${telegramUserId} from ${previous.email}`);
    return previous.email;
  }
}
