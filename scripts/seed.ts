/**
 * Seeds a handful of facts and prints the rendered memory document, so you can
 * see exactly what the model will be handed before wiring the model up.
 *
 *   npm run seed -- 123456789
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

import { COLLECTIONS, MemoryDoc, UserDoc } from '../src/mongo/collections';
import { renderMemoryDocument } from '../src/memory/memory-document';

const SAMPLE_FACTS: Array<Pick<MemoryDoc, 'text' | 'group'>> = [
  { text: 'Landlord is Rahim.', group: 'People' },
  { text: "Rahim's number is +91 98000 12345.", group: 'People' },
  { text: 'Rent is due on the 5th.', group: 'Home' },
  { text: 'The geyser in the bathroom leaks.', group: 'Home' },
];

async function main(): Promise<void> {
  const userId = Number(process.argv[2]);
  if (!Number.isInteger(userId)) {
    throw new Error('Pass your Telegram user id: npm run seed -- 123456789');
  }

  const client = new MongoClient(required('MONGODB_URI'));
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? 'recalfy');

  const now = new Date();
  await db.collection<UserDoc>(COLLECTIONS.users).updateOne(
    { _id: userId },
    {
      $setOnInsert: {
        tz: process.env.DEFAULT_TIMEZONE ?? 'UTC',
        sidCounter: 0,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const memories = db.collection<MemoryDoc>(COLLECTIONS.memories);
  await memories.deleteMany({ userId });

  const seeded: MemoryDoc[] = SAMPLE_FACTS.map((fact, index) => ({
    _id: new ObjectId(),
    userId,
    sid: (index + 1).toString(36).padStart(2, '0'),
    text: fact.text,
    group: fact.group,
    createdAt: new Date(now.getTime() + index),
  }));
  await memories.insertMany(seeded);
  await db
    .collection<UserDoc>(COLLECTIONS.users)
    .updateOne({ _id: userId }, { $set: { sidCounter: seeded.length } });

  const user = await db.collection<UserDoc>(COLLECTIONS.users).findOne({ _id: userId });
  console.log(renderMemoryDocument({ timezone: user?.tz ?? 'UTC', now: new Date(), memories: seeded }));

  await client.close();
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
