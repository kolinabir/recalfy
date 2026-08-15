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

/**
 * Raised when storing would take the account past its plan's ceiling.
 *
 * A thrown error rather than a silent truncation: the caller has to decide what
 * the user hears, and the one unacceptable outcome is the model reporting
 * "saved" over facts that were dropped. That exact failure — a confident
 * confirmation with no write behind it — is why the storage rule lives at the
 * end of the system prompt, and it must not come back through the ceiling.
 */
export class MemoryFull extends Error {
  constructor(
    readonly held: number,
    readonly cap: number,
  ) {
    super(`Memory is full: ${held} of ${cap} facts.`);
    this.name = 'MemoryFull';
  }
}

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
   *
   * `cap` is the plan's ceiling on live facts, or null for no ceiling. It is a
   * parameter rather than something this store looks up, so the store never
   * learns that billing exists and stays testable without it.
   */
  async remember(
    userId: UserId,
    facts: Fact[],
    sourceMessageId?: ObjectId,
    cap: number | null = null,
  ): Promise<Memory[]> {
    if (facts.length === 0) return [];

    const live = await this.liveMemoriesOf(userId);
    const { fresh, duplicates } = removeDuplicates(facts, live);
    if (duplicates.length > 0) {
      this.logger.log(`skipped ${duplicates.length} duplicate fact(s) for ${userId}`);
    }
    if (fresh.length === 0) return [];

    const replaced = await this.sids.resolve(userId, citedSids(fresh));

    // Checked after dedup and after supersession, because neither grows the
    // live set: correcting "rent is due on the 5th" to "the 3rd" must keep
    // working at the ceiling, or a full memory becomes a memory you cannot fix.
    //
    // `count()` rather than `live.length` — liveMemoriesOf still carries
    // superseded and expired rows, which the renderer drops. Counting those
    // would bill someone for facts they can no longer see.
    if (cap !== null) {
      const held = await this.count(userId);
      if (held + fresh.length - replaced.size > cap) throw new MemoryFull(held, cap);
    }
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
   * The live facts as rows, for callers that need to search or list them
   * rather than read the document — inline lookups, mainly.
   *
   * Filtered in the query rather than after the fact, so a superseded or
   * expired memory can never surface somewhere the rendered document would
   * not show it. That matters most here: inline results are inserted into
   * other people's chats, and "the old address" resurfacing there is a worse
   * failure than it would be in a reply.
   */
  async facts(userId: UserId, now: Date = new Date()): Promise<Memory[]> {
    const rows = await this.mongo.memories
      .find({
        userId,
        deletedAt: { $exists: false },
        supersededBy: { $exists: false },
        $or: [{ staleAfter: { $exists: false } }, { staleAfter: { $gt: now } }],
      })
      .sort({ createdAt: -1 })
      .toArray();

    return rows.map(toMemory);
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
