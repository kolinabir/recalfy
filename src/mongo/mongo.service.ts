import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Collection, Db, IndexDescription, MongoClient } from 'mongodb';

import { ENV, Env } from '../config/env';
import {
  COLLECTIONS,
  LinkTokenDoc,
  MemoryDoc,
  MessageDoc,
  PairingCodeDoc,
  ReminderDoc,
  UserDoc,
  WebUserDoc,
} from './collections';
import { INDEXES } from './indexes';

/** "Same name, different definition" — the two ways Mongo reports it. */
const INDEX_CONFLICT_CODES = new Set([85, 86]);

function isIndexConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    INDEX_CONFLICT_CODES.has((error as { code: number }).code)
  );
}

/** M0 allows 500 connections but only 100 ops/sec — a small pool is plenty. */
const POOL_SIZE = 10;
const SERVER_SELECTION_TIMEOUT_MS = 10_000;

/**
 * Owns the Atlas connection and the index set. Callers ask for a typed
 * collection and never see the client, the URI, or index management.
 */
@Injectable()
export class MongoService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(MongoService.name);
  private client!: MongoClient;
  private db!: Db;

  constructor(@Inject(ENV) private readonly env: Env) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.ensureIndexes();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client?.close();
  }

  get users(): Collection<UserDoc> {
    return this.db.collection<UserDoc>(COLLECTIONS.users);
  }

  get messages(): Collection<MessageDoc> {
    return this.db.collection<MessageDoc>(COLLECTIONS.messages);
  }

  get memories(): Collection<MemoryDoc> {
    return this.db.collection<MemoryDoc>(COLLECTIONS.memories);
  }

  get reminders(): Collection<ReminderDoc> {
    return this.db.collection<ReminderDoc>(COLLECTIONS.reminders);
  }

  get linkTokens(): Collection<LinkTokenDoc> {
    return this.db.collection<LinkTokenDoc>(COLLECTIONS.linkTokens);
  }

  get pairingCodes(): Collection<PairingCodeDoc> {
    return this.db.collection<PairingCodeDoc>(COLLECTIONS.pairingCodes);
  }

  /** Written by Better Auth in the web app; read here, and linked here. */
  get webUsers(): Collection<WebUserDoc> {
    return this.db.collection<WebUserDoc>(COLLECTIONS.webUsers);
  }

  private async connect(): Promise<void> {
    this.client = new MongoClient(this.env.mongoUri, {
      maxPoolSize: POOL_SIZE,
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    });
    await this.client.connect();
    this.db = this.client.db(this.env.mongoDb);
    this.logger.log(`Connected to database "${this.env.mongoDb}"`);
  }

  private async ensureIndexes(): Promise<void> {
    for (const [collection, indexes] of Object.entries(INDEXES)) {
      for (const index of indexes) {
        await this.ensureIndex(collection, index);
      }
    }
    this.logger.log('Indexes ensured');
  }

  /**
   * Creates one index, replacing an older definition that happens to share its
   * name.
   *
   * Mongo treats "same name, different key" as a hard error rather than an
   * update, so redefining an index — as the channels migration did to
   * `telegram_link` — would otherwise crash the process on boot, before
   * anything could be done about it. Dropping and recreating is safe here
   * because these collections are small and the index is rebuilt immediately.
   */
  private async ensureIndex(collection: string, index: IndexDescription): Promise<void> {
    try {
      await this.db.collection(collection).createIndexes([index]);
    } catch (error) {
      if (!isIndexConflict(error) || !index.name) throw error;

      this.logger.warn(`Index ${collection}.${index.name} changed shape; rebuilding it`);
      await this.db.collection(collection).dropIndex(index.name);
      await this.db.collection(collection).createIndexes([index]);
    }
  }
}
