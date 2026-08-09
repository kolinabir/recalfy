import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Collection, Db, MongoClient } from 'mongodb';

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
      await this.db.collection(collection).createIndexes(indexes);
    }
    this.logger.log('Indexes ensured');
  }
}
