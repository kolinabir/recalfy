/**
 * Shows everything the bot currently knows about a user — the same memory
 * document the model sees, plus reminders and the recent transcript.
 *
 *   npm run inspect -- 1228558424
 *   npm run inspect -- 1228558424 --messages 20
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

import { COLLECTIONS, MemoryDoc, MessageDoc, ReminderDoc, UserDoc } from '../src/mongo/collections';
import { renderMemoryDocument } from '../src/memory/memory-document';
import { describeInstant } from '../src/reminders/resolve-when';

const DEFAULT_MESSAGE_COUNT = 8;

async function main(): Promise<void> {
  const { userId, messageCount } = parseArgv(process.argv.slice(2));
  const client = new MongoClient(required('MONGODB_URI'));
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB ?? 'recalfy');
    const user = await db.collection<UserDoc>(COLLECTIONS.users).findOne({ _id: userId });

    if (!user) {
      console.log(`No user ${userId}. They have never messaged the bot.`);
      return;
    }

    printUser(user);
    await printMemory(db, user);
    await printReminders(db, user);
    await printTranscript(db, user, messageCount);
  } finally {
    await client.close();
  }
}

type Db = ReturnType<MongoClient['db']>;

function printUser(user: UserDoc): void {
  heading('USER');
  console.log(`  id          ${user._id}`);
  console.log(`  timezone    ${user.tz}`);
  console.log(`  onboarded   ${user.onboardedAt ? user.onboardedAt.toISOString() : 'NO — next message triggers onboarding'}`);
}

async function printMemory(db: Db, user: UserDoc): Promise<void> {
  const all = await db
    .collection<MemoryDoc>(COLLECTIONS.memories)
    .find({ userId: user._id })
    .sort({ createdAt: 1 })
    .toArray();

  heading('MEMORY (exactly what the model sees)');
  console.log(indent(renderMemoryDocument({ timezone: user.tz, memories: all.filter(live) })));

  const hidden = all.filter((memory) => !live(memory));
  if (hidden.length > 0) {
    heading('HIDDEN (superseded or deleted — kept for audit)');
    for (const memory of hidden) {
      console.log(`  ${memory.deletedAt ? 'deleted   ' : 'superseded'}  ${memory.text}`);
    }
  }
}

function live(memory: MemoryDoc): boolean {
  return !memory.deletedAt;
}

async function printReminders(db: Db, user: UserDoc): Promise<void> {
  const reminders = await db
    .collection<ReminderDoc>(COLLECTIONS.reminders)
    .find({ userId: user._id })
    .sort({ dueAt: 1 })
    .toArray();

  heading(`REMINDERS (${reminders.length})`);
  if (reminders.length === 0) return console.log('  none');

  for (const reminder of reminders) {
    console.log(
      `  ${reminder.status.padEnd(10)} ${describeInstant(reminder.dueAt, user.tz)}  ${reminder.text}`,
    );
  }
}

async function printTranscript(db: Db, user: UserDoc, limit: number): Promise<void> {
  const messages = await db
    .collection<MessageDoc>(COLLECTIONS.messages)
    .find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  heading(`LAST ${messages.length} MESSAGES`);
  for (const message of messages.reverse()) {
    const who = message.role === 'user' ? 'you' : 'bot';
    console.log(`  ${who} › ${message.text.replace(/\n/g, ' ').slice(0, 100)}`);
  }
}

function heading(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

function indent(block: string): string {
  return block
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function parseArgv(argv: string[]): { userId: number; messageCount: number } {
  const userId = Number(argv[0]);
  if (!Number.isInteger(userId)) {
    throw new Error('Pass a Telegram user id: npm run inspect -- 1228558424');
  }

  const flag = argv.indexOf('--messages');
  const messageCount = flag === -1 ? DEFAULT_MESSAGE_COUNT : Number(argv[flag + 1]);
  if (!Number.isInteger(messageCount)) throw new Error('--messages needs a number');

  return { userId, messageCount };
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
