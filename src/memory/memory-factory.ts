import { ObjectId } from 'mongodb';

import { MemoryDoc, UserId } from '../mongo/collections';
import { DEFAULT_GROUP, Fact, Memory } from './memory.types';

export interface BuildMemoryInput {
  userId: UserId;
  fact: Fact;
  sid: string;
  /** Short id → `_id` for every fact cited in a `supersedes`. */
  replaced: ReadonlyMap<string, ObjectId>;
  sourceMessageId?: ObjectId;
}

export function buildMemory({
  userId,
  fact,
  sid,
  replaced,
  sourceMessageId,
}: BuildMemoryInput): MemoryDoc {
  const [firstCited] = fact.supersedes ?? [];
  const supersedes = firstCited ? replaced.get(firstCited) : undefined;

  return {
    _id: new ObjectId(),
    userId,
    sid,
    text: fact.text.trim(),
    group: fact.group?.trim() || DEFAULT_GROUP,
    ...(supersedes ? { supersedes } : {}),
    ...(fact.staleAfter ? { staleAfter: fact.staleAfter } : {}),
    ...(sourceMessageId ? { sourceMessageId } : {}),
    createdAt: new Date(),
  };
}

/** Every short id the incoming facts claim to replace, deduplicated. */
export function citedSids(facts: Fact[]): string[] {
  return [...new Set(facts.flatMap((fact) => fact.supersedes ?? []))];
}

export function toMemory(memory: MemoryDoc): Memory {
  return {
    sid: memory.sid,
    text: memory.text,
    group: memory.group,
    createdAt: memory.createdAt,
  };
}
