import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ENV, Env } from '../config/env';
import { MongoService } from '../mongo/mongo.service';

/** Placeholder address for an owner who never gave one. Never mailed. */
const DEFAULT_OWNER_EMAIL = 'owner@recalfy.local';

/**
 * The self-hosted shortcut past the website.
 *
 * On recalfy.com an account comes from signing in on the site, and a chat
 * attaches to it through a one-time link. A self-hosted install usually has no
 * site, and the one person it is for already said who they are when the
 * installer asked. So that person's account is made here, at boot, with their
 * Telegram id already attached — and from then on every other part of the bot
 * sees exactly what it would have seen after a real link.
 *
 * Idempotent: it runs on every start, finds the account it made last time, and
 * only moves the link if the owner id in `.env` has changed — onto the same
 * account, so the memory moves with it.
 */
@Injectable()
export class OwnerAccount implements OnModuleInit {
  private readonly logger = new Logger(OwnerAccount.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly mongo: MongoService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.env.selfHosted) return;

    const handle = this.env.ownerTelegramId;
    if (!handle) {
      this.logger.warn(
        'Self-hosted with no OWNER_TELEGRAM_ID — nobody is linked, so the bot will answer no one. ' +
          'Run `npx recalfy` again, or set it in .env.',
      );
      return;
    }

    // Whoever holds this handle already is the owner's account, and stays so.
    // Every memory is filed under that account's id, so the one thing this
    // must never do is make a second account and move the link to it — that
    // would leave the whole memory behind, attached to nobody.
    const current = await this.mongo.webUsers.findOne(
      { 'channels.telegram.handle': handle },
      { projection: { _id: 1 } },
    );
    if (current) {
      this.logger.log(`Owner account ready — Telegram ${handle} is linked`);
      return;
    }

    // First boot, or the owner id in .env changed to a different Telegram
    // account. Either way the link goes on the one owner account, found by
    // its email, so a changed id carries the memory over rather than
    // starting a new one.
    const email = process.env.OWNER_EMAIL?.trim() || DEFAULT_OWNER_EMAIL;
    const now = new Date();
    await this.mongo.webUsers.updateOne(
      { email },
      {
        // The shape Better Auth writes, so the dashboard can adopt this
        // account later if the owner signs in with the same email.
        $setOnInsert: { name: 'Owner', emailVerified: false, createdAt: now },
        $set: { 'channels.telegram': { handle, linkedAt: now }, updatedAt: now },
      },
      { upsert: true },
    );

    this.logger.log(`Owner account ready — Telegram ${handle} is linked`);
  }
}
