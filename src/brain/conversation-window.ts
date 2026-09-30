import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';

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

  /**
   * `live` is the message this turn is answering, as it arrived. Its logged
   * row is masked if it carried a credential, and this is the turn that has
   * to store it — so that one row reads as typed. Matched by id rather than
   * by position: a reminder logged a moment later would otherwise be "last".
   */
  async recent(
    userId: UserId,
    limit: number = WINDOW_SIZE,
    live?: { id: ObjectId; text: string },
  ): Promise<Turn[]> {
    const messages = await this.recentMessages(userId, limit);
    return messages.map((message) => ({
      role: message.role,
      content: live && message._id.equals(live.id) ? live.text : message.text,
    }));
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
