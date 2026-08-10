import { Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { MemoryDoc, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { removeDuplicates } from './duplicate-filter';
import { renderMemoryDocument } from './memory-document';
import { buildMemory, citedSids, toMemory } from './memory-factory';
import { Fact, Memory } from './memory.types';
import { SidMinter } from './sid-minter';

const FALLBACK_TIMEZONE = 'UTC';

/** A fact traced back to the message that taught it. */
export interface Provenance {
  sid: string;
  text: string;
  createdAt: Date;
  source?: { text: string; at: Date };
}

/**
 * Everything the assistant knows, and the only way to change it.
 *
 * Three methods. Behind them: short-id minting, supersession, soft delete,
 * grouping, and the markdown rendering that becomes the system prompt.
 * Callers never touch a collection or an ObjectId.
 */
@Injectable()
export class MemoryStore {
  private readonly logger = new Logger(MemoryStore.name);

  constructor(
    private readonly mongo: MongoService,
    private readonly sids: SidMinter,
  ) {}

  /**
   * Writes new facts. A fact carrying `supersedes` replaces those facts: the
   * old rows stay for audit but leave the rendered memory.
   */
  async remember(userId: UserId, facts: Fact[], sourceMessageId?: ObjectId): Promise<Memory[]> {
    if (facts.length === 0) return [];

    const { fresh, duplicates } = removeDuplicates(facts, await this.liveMemoriesOf(userId));
    if (duplicates.length > 0) {
      this.logger.log(`skipped ${duplicates.length} duplicate fact(s) for ${userId}`);
    }
    if (fresh.length === 0) return [];

    const replaced = await this.sids.resolve(userId, citedSids(fresh));
    const minted = await this.sids.mint(userId, fresh.length);
    const documents = fresh.map((fact, index) =>
      buildMemory({ userId, fact, sid: minted[index], replaced, sourceMessageId }),
    );

    await this.mongo.memories.insertMany(documents);
    await this.linkSupersessions(userId, fresh, documents, replaced);

    this.logger.log(`remembered ${documents.length} fact(s) for ${userId}`);
    return documents.map(toMemory);
  }

  /** The live memory as markdown — this is what goes into the system prompt. */
  async render(userId: UserId, now: Date = new Date()): Promise<string> {
    const [user, memories] = await Promise.all([
      this.mongo.users.findOne({ _id: userId }),
      this.liveMemoriesOf(userId),
    ]);

    return renderMemoryDocument({ timezone: user?.tz ?? FALLBACK_TIMEZONE, memories, now });
  }

  /**
   * How many facts the live memory holds — the same set `render` returns,
   * counted in the database rather than by rendering and re-parsing it.
   */
  count(userId: UserId, now: Date = new Date()): Promise<number> {
    return this.mongo.memories.countDocuments({
      userId,
      deletedAt: { $exists: false },
      supersededBy: { $exists: false },
      $or: [{ staleAfter: { $exists: false } }, { staleAfter: { $gt: now } }],
    });
  }

  /**
   * Where a fact came from: the memory row joined to the message that taught
   * it. This is what lets "when did I tell you that?" get a real answer.
   */
  async provenance(userId: UserId, sids: string[]): Promise<Provenance[]> {
    if (sids.length === 0) return [];

    const memories = await this.mongo.memories.find({ userId, sid: { $in: sids } }).toArray();

    const sourceIds = memories
      .map((memory) => memory.sourceMessageId)
      .filter((id): id is ObjectId => id !== undefined);
    const sources = new Map(
      (await this.mongo.messages.find({ userId, _id: { $in: sourceIds } }).toArray()).map(
        (message) => [message._id.toHexString(), message],
      ),
    );

    return memories.map((memory) => {
      const source =
        memory.sourceMessageId && sources.get(memory.sourceMessageId.toHexString());
      return {
        sid: memory.sid,
        text: memory.text,
        createdAt: memory.createdAt,
        ...(source ? { source: { text: source.text, at: source.createdAt } } : {}),
      };
    });
  }

  /** Soft-deletes by short id. Returns what actually went, for the confirmation. */
  async forget(userId: UserId, sids: string[]): Promise<Memory[]> {
    if (sids.length === 0) return [];

    const doomed = await this.mongo.memories
      .find({ userId, sid: { $in: sids }, deletedAt: { $exists: false } })
      .toArray();
    if (doomed.length === 0) return [];

    await this.mongo.memories.updateMany(
      { _id: { $in: doomed.map((memory) => memory._id) } },
      { $set: { deletedAt: new Date() } },
    );

    this.logger.log(`forgot ${doomed.length} fact(s) for ${userId}`);
    return doomed.map(toMemory);
  }

  /** Superseded rows are included — the renderer needs them for "was:" notes. */
  private liveMemoriesOf(userId: UserId): Promise<MemoryDoc[]> {
    return this.mongo.memories
      .find({ userId, deletedAt: { $exists: false } })
      .sort({ createdAt: 1 })
      .toArray();
  }

  /** Points every replaced row at whichever new row took its place. */
  private async linkSupersessions(
    userId: UserId,
    facts: Fact[],
    documents: MemoryDoc[],
    replaced: ReadonlyMap<string, ObjectId>,
  ): Promise<void> {
    for (const [index, document] of documents.entries()) {
      const oldIds = (facts[index].supersedes ?? [])
        .map((sid) => replaced.get(sid))
        .filter((id): id is ObjectId => id !== undefined);

      if (oldIds.length === 0) continue;

      await this.mongo.memories.updateMany(
        { _id: { $in: oldIds }, userId },
        { $set: { supersededBy: document._id } },
      );
    }
  }
}
