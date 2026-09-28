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
 * only moves the link if the owner id in `.env` has changed.
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
          'Run `recalfy setup` again, or set it in .env.',
      );
      return;
    }

    const email = process.env.OWNER_EMAIL?.trim() || DEFAULT_OWNER_EMAIL;
    const now = new Date();

    // Someone else holding this handle can only be an earlier owner account
    // with a different email. Unlinked first, or the unique index refuses.
    await this.mongo.webUsers.updateMany(
      { 'channels.telegram.handle': handle, email: { $ne: email } },
      { $unset: { 'channels.telegram': '' } },
    );

    // The shape Better Auth writes, so the dashboard can adopt this account
    // later if the owner turns it on and signs in with the same email.
    await this.mongo.webUsers.updateOne(
      { email },
      {
        $setOnInsert: { name: 'Owner', emailVerified: false, createdAt: now },
        $set: { 'channels.telegram': { handle, linkedAt: now }, updatedAt: now },
      },
      { upsert: true },
    );

    this.logger.log(`Owner account ready — Telegram ${handle} is linked`);
  }
}
