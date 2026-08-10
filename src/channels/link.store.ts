import { Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { Address, Channel, Handle, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { generatePairingCode } from './pairing-code';

export type RedeemResult =
  | { status: 'linked'; email: string }
  /** Token unknown, already spent, past its expiry, or minted for another channel. */
  | { status: 'invalid' }
  /** This chat account already belongs to a different web account. */
  | { status: 'taken'; email: string }
  /** The token's web account already connected a different chat account here. */
  | { status: 'account-linked' };

/** Mongo path for one channel's handle. Dotted keys are also the index keys. */
function handlePath(channel: Channel): string {
  return `channels.${channel}.handle`;
}

/**
 * Redeems the one-time tokens minted by the web app's "Connect" buttons, and
 * answers the only question an adapter cares about: which account is this chat
 * account, if any?
 */
@Injectable()
export class LinkStore {
  private readonly logger = new Logger(LinkStore.name);

  constructor(private readonly mongo: MongoService) {}

  /**
   * The gate and the identity lookup at once. One indexed hit per inbound
   * message; null means the sender is a stranger and the message is dropped.
   */
  async resolve({ channel, handle }: Address): Promise<UserId | null> {
    const doc = await this.mongo.webUsers.findOne(
      { [handlePath(channel)]: handle },
      { projection: { _id: 1 } },
    );
    return doc ? doc._id.toHexString() : null;
  }

  /** Where this account is reachable on a given channel, if it is. */
  async handleFor(userId: UserId, channel: Channel): Promise<Handle | null> {
    const doc = await this.mongo.webUsers.findOne(
      { _id: new ObjectId(userId) },
      { projection: { [handlePath(channel)]: 1 } },
    );
    return doc?.channels?.[channel]?.handle ?? null;
  }

  async redeem(token: string, { channel, handle }: Address): Promise<RedeemResult> {
    // Refuse to move an existing link. Someone who gets hold of another
    // person's token should not be able to re-point their own chat account,
    // and the owner should hear about it rather than silently lose it.
    const existing = await this.mongo.webUsers.findOne({ [handlePath(channel)]: handle });
    if (existing) {
      return { status: 'taken', email: existing.email };
    }

    // Single-use, fresh, and minted for *this* channel, in one filter: a
    // second send racing the first matches nothing, an expired token fails
    // here even though Mongo's TTL sweep may not have removed it yet, and a
    // token from the WhatsApp button cannot be redeemed on Telegram.
    const claimed = await this.mongo.linkTokens.findOneAndUpdate(
      { _id: token, channel, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date(), consumedBy: handle } },
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
      // chat accounts on the same channel by minting a fresh token each time.
      { _id: new ObjectId(claimed.webUserId), [handlePath(channel)]: { $exists: false } },
      { $set: { [`channels.${channel}`]: { handle, linkedAt: new Date() } } },
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

    this.logger.log(`Linked ${channel} ${handle} to ${linked.email}`);
    return { status: 'linked', email: linked.email };
  }

  /**
   * Mints the manual fallback code. Any outstanding code for this chat
   * account is dropped first, so a code read out earlier can't still be live
   * once someone asks for a new one.
   */
  async issuePairingCode({ channel, handle }: Address, ttlMs: number): Promise<string> {
    await this.mongo.pairingCodes.deleteMany({ channel, handle });

    const code = generatePairingCode();
    const now = new Date();

    await this.mongo.pairingCodes.insertOne({
      _id: code,
      channel,
      handle,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      attempts: 0,
    });

    return code;
  }

  /** Seconds until this chat account may ask for another code, or 0 if it may now. */
  async pairingCooldown({ channel, handle }: Address, minIntervalMs: number): Promise<number> {
    const recent = await this.mongo.pairingCodes.findOne(
      { channel, handle },
      { sort: { createdAt: -1 } },
    );
    if (!recent) return 0;

    const elapsed = Date.now() - recent.createdAt.getTime();
    return elapsed >= minIntervalMs ? 0 : Math.ceil((minIntervalMs - elapsed) / 1000);
  }

  /** Returns the email it was detached from, or null if it wasn't linked. */
  async unlink({ channel, handle }: Address): Promise<string | null> {
    const previous = await this.mongo.webUsers.findOneAndUpdate(
      { [handlePath(channel)]: handle },
      { $unset: { [`channels.${channel}`]: '' } },
      { returnDocument: 'before' },
    );

    if (!previous) return null;

    this.logger.log(`Unlinked ${channel} ${handle} from ${previous.email}`);
    return previous.email;
  }
}
