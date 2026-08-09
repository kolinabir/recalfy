import { Injectable } from '@nestjs/common';

import { Turn } from '../llm/llm.types';
import { MessageDoc, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';

/** Enough for "remind me about that" to resolve, small enough to stay cheap. */
const WINDOW_SIZE = 10;

/**
 * The recent conversation, as model turns. Long-term knowledge lives in the
 * memory document — this only exists so pronouns and follow-ups resolve.
 */
@Injectable()
export class ConversationWindow {
  constructor(private readonly mongo: MongoService) {}

  async recent(userId: UserId, limit: number = WINDOW_SIZE): Promise<Turn[]> {
    const messages = await this.recentMessages(userId, limit);
    return messages.map((message) => ({ role: message.role, content: message.text }));
  }

  /** The same window with timestamps intact — the reflection needs to know "today". */
  async recentMessages(userId: UserId, limit: number = WINDOW_SIZE): Promise<MessageDoc[]> {
    const messages = await this.mongo.messages
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return messages.reverse();
  }
}
