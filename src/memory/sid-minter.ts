import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';

const BASE36 = 36;
const MIN_SID_LENGTH = 2;

/**
 * Mints and resolves the short ids (`03`, `1a`) the model cites when it wants
 * to forget or supersede a fact. Base36 keeps them cheap in the prompt and
 * easy to type back.
 */
@Injectable()
export class SidMinter {
  constructor(private readonly mongo: MongoService) {}

  /** Reserves `count` ids atomically, so concurrent writes can never collide. */
  async mint(userId: UserId, count: number): Promise<string[]> {
    const user = await this.mongo.users.findOneAndUpdate(
      { _id: userId },
      { $inc: { sidCounter: count } },
      { returnDocument: 'after' },
    );
    if (!user) throw new Error(`Unknown user ${userId} — call UserStore.ensure() first`);

    const firstReserved = user.sidCounter - count + 1;
    return Array.from({ length: count }, (_, offset) => encode(firstReserved + offset));
  }

  async resolve(userId: UserId, sids: string[]): Promise<Map<string, ObjectId>> {
    if (sids.length === 0) return new Map();
    const found = await this.mongo.memories
      .find({ userId, sid: { $in: sids } }, { projection: { sid: 1 } })
      .toArray();
    return new Map(found.map((memory) => [memory.sid, memory._id]));
  }
}

function encode(sequence: number): string {
  return sequence.toString(BASE36).padStart(MIN_SID_LENGTH, '0');
}
