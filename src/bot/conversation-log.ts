import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { Vault } from '../memory/vault.service';

/**
 * Append-only transcript. Source of provenance for facts, and the conversation
 * window later.
 *
 * Both sides go through the vault: a password typed by the user, or repeated
 * back by the model, is stored masked. The turn that carries it still sees it
 * whole — BrainService hands the model the live text, not this row — but no
 * later prompt, history search or backup does.
 */
@Injectable()
export class ConversationLog {
  constructor(
    private readonly mongo: MongoService,
    private readonly vault: Vault,
  ) {}

  /** `known`: credential values from the message being answered — see vault.ts. */
  async record(
    userId: UserId,
    role: 'user' | 'assistant',
    text: string,
    known: readonly string[] = [],
  ): Promise<ObjectId> {
    const _id = new ObjectId();
    const stored = this.vault.protect(userId, text, known);
    await this.mongo.messages.insertOne({ _id, userId, role, ...stored, createdAt: new Date() });
    return _id;
  }
}
