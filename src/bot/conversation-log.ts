import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';

/** Append-only transcript. Source of provenance for facts, and the conversation window later. */
@Injectable()
export class ConversationLog {
  constructor(private readonly mongo: MongoService) {}

  async record(userId: UserId, role: 'user' | 'assistant', text: string): Promise<ObjectId> {
    const _id = new ObjectId();
    await this.mongo.messages.insertOne({ _id, userId, role, text, createdAt: new Date() });
    return _id;
  }
}
