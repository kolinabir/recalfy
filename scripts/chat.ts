/**
 * Talks to the brain from the terminal — no Telegram involved.
 *
 *   npm run chat -- "hey im from bangladesh"
 *   npm run chat -- "remind me to call mum at 5 today"
 *   npm run chat -- --user 1228558424 "what do you know about me?"
 *   npm run chat -- --reset
 *
 * Defaults to a scratch user id so real memories are never touched.
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '../src/app.module';
import { BrainService } from '../src/brain/brain.service';
import { ConversationLog } from '../src/bot/conversation-log';
import { MemoryStore } from '../src/memory/memory.store';
import { MongoService } from '../src/mongo/mongo.service';

const SCRATCH_USER_ID = 999_000_001;

async function main(): Promise<void> {
  const { userId, text, reset } = parseArgv(process.argv.slice(2));

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    if (reset) return await wipe(app.get(MongoService), userId);
    if (!text) throw new Error('Nothing to say. Pass a message, or --reset.');

    const log = app.get(ConversationLog);
    const sourceMessageId = await log.record(userId, 'user', text);

    const started = Date.now();
    const reply = await app.get(BrainService).handle(userId, text, new Date(), sourceMessageId);
    await log.record(userId, 'assistant', reply);

    console.log(`\nyou › ${text}`);
    console.log(`bot › ${reply}`);
    console.log(`\n(${Date.now() - started}ms)\n`);
    console.log(await app.get(MemoryStore).render(userId));
  } finally {
    await app.close();
  }
}

async function wipe(mongo: MongoService, userId: number): Promise<void> {
  await Promise.all([
    mongo.users.deleteMany({ _id: userId }),
    mongo.messages.deleteMany({ userId }),
    mongo.memories.deleteMany({ userId }),
    mongo.reminders.deleteMany({ userId }),
  ]);
  console.log(`Wiped everything for user ${userId}.`);
}

interface Invocation {
  userId: number;
  text: string;
  reset: boolean;
}

function parseArgv(argv: string[]): Invocation {
  const userFlag = argv.indexOf('--user');
  const userId = userFlag === -1 ? SCRATCH_USER_ID : Number(argv[userFlag + 1]);
  if (!Number.isInteger(userId)) throw new Error('--user needs a numeric Telegram id');

  const rest = argv.filter((arg, index) => {
    if (arg === '--reset') return false;
    if (userFlag !== -1 && (index === userFlag || index === userFlag + 1)) return false;
    return true;
  });

  return { userId, text: rest.join(' ').trim(), reset: argv.includes('--reset') };
}

void main().catch((error: unknown) => {
  new Logger('chat').error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
