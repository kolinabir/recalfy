/**
 * Prints the Telegram user ids that have messaged this bot, so a `@username`
 * in TELEGRAM_ALLOWED_USERS can be replaced by a permanent numeric id.
 *
 *   1. Start with your @handle in TELEGRAM_ALLOWED_USERS and send a message
 *   2. npm run whoami
 *   3. Paste the id in, and restart
 *
 * Reads the conversation log rather than calling getUpdates, which would
 * require tearing down the webhook.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

import { COLLECTIONS, MessageDoc } from '../src/mongo/collections';

async function main(): Promise<void> {
  const client = new MongoClient(required('MONGODB_URI'));
  await client.connect();

  try {
    const senders = await countSenders(client);

    if (senders.length === 0) {
      console.log('No messages recorded yet. Send your bot a message, then run this again.');
      console.log('If nothing arrives, check `npm run webhook:info` for last_error_message.');
      return;
    }

    console.log('Senders seen:\n');
    for (const { userId, messages } of senders) {
      console.log(`  ${userId}  (${messages} message${messages === 1 ? '' : 's'})`);
    }
    console.log(`\nTELEGRAM_ALLOWED_USERS=${senders.map((s) => s.userId).join(',')}`);
  } finally {
    await client.close();
  }
}

interface SenderCount {
  userId: number;
  messages: number;
}

function countSenders(client: MongoClient): Promise<SenderCount[]> {
  return client
    .db(process.env.MONGODB_DB ?? 'recalfy')
    .collection<MessageDoc>(COLLECTIONS.messages)
    .aggregate<SenderCount>([
      { $match: { role: 'user' } },
      { $group: { _id: '$userId', messages: { $sum: 1 } } },
      { $sort: { messages: -1 } },
      { $project: { _id: 0, userId: '$_id', messages: 1 } },
    ])
    .toArray();
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
