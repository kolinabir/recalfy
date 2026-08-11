/**
 * Replays scripted conversations against the real Brain and the real model,
 * asserting on the tool calls each message must (or must not) produce.
 *
 *   npm run eval                 # the whole suite
 *   npm run eval -- monday       # only cases whose name matches
 *
 * Every case runs as its own scratch user, wiped before and after, so real
 * memories are never touched. Failures exit 1, so this can gate a deploy.
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { BrainService } from '../src/brain/brain.service';
import { ToolExecutor } from '../src/brain/tools/tool-executor';
import { ConversationLog } from '../src/bot/conversation-log';
import { MemoryStore } from '../src/memory/memory.store';
import { UserStore } from '../src/memory/user.store';
import { MongoService } from '../src/mongo/mongo.service';
import { UserId } from '../src/mongo/collections';
import { CASES, EvalCase, EvalTurn } from './eval-cases';

/** Synthetic account ids, one per case, disjoint from anything real. */
const scratchUserId = (index: number): UserId =>
  `0000000000000000000001${index.toString(16).padStart(2, '0')}`;

interface CapturedCall {
  name: string;
  args: Record<string, unknown>;
}

async function main(): Promise<void> {
  const filter = process.argv.slice(2).join(' ').trim().toLowerCase();
  const cases = filter ? CASES.filter((c) => c.name.toLowerCase().includes(filter)) : CASES;
  if (cases.length === 0) throw new Error(`No cases match "${filter}".`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const captured = tapToolCalls(app.get(ToolExecutor));

  let failures = 0;
  try {
    for (const [index, evalCase] of cases.entries()) {
      const userId = scratchUserId(index);
      await wipe(app.get(MongoService), userId);
      try {
        const ok = await runCase(app, evalCase, userId, captured);
        if (!ok) failures++;
      } finally {
        await wipe(app.get(MongoService), userId);
      }
    }
  } finally {
    await app.close();
  }

  console.log(`\n${cases.length - failures}/${cases.length} cases passed`);
  process.exit(failures === 0 ? 0 : 1);
}

async function runCase(
  app: { get<T>(type: abstract new (...args: never[]) => T): T },
  evalCase: EvalCase,
  userId: UserId,
  captured: CapturedCall[],
): Promise<boolean> {
  console.log(`\n■ ${evalCase.name}`);

  const users = app.get(UserStore);
  const log = app.get(ConversationLog);

  await users.ensure(userId);
  if (evalCase.timezone) await users.setTimezone(userId, evalCase.timezone);
  for (const text of evalCase.seedMessages ?? []) {
    await log.record(userId, 'user', text);
  }
  if (evalCase.seedFacts?.length) {
    await app.get(MemoryStore).remember(userId, evalCase.seedFacts);
  }

  let ok = true;
  for (const turn of evalCase.turns) {
    captured.length = 0;

    const sourceMessageId = await log.record(userId, 'user', turn.say);
    const reply = await app
      .get(BrainService)
      .handle(userId, turn.say, new Date(), sourceMessageId);
    await log.record(userId, 'assistant', reply);

    console.log(`  you › ${turn.say}`);
    console.log(`  bot › ${reply.slice(0, 140)}${reply.length > 140 ? '…' : ''}`);
    ok = assertTurn(turn, captured, reply) && ok;
  }
  return ok;
}

function assertTurn(turn: EvalTurn, calls: CapturedCall[], reply: string): boolean {
  let ok = true;
  const seen = calls.map((c) => c.name).join(', ') || 'none';

  for (const expected of turn.expect ?? []) {
    const hit = calls.find(
      (call) => call.name === expected.tool && (expected.check?.(call.args) ?? true),
    );
    const label = expected.label ? `${expected.tool} (${expected.label})` : expected.tool;
    if (hit) console.log(`  ✓ ${label}`);
    else {
      console.log(`  ✗ ${label} — calls seen: ${seen}`);
      ok = false;
    }
  }

  for (const tool of turn.forbid ?? []) {
    if (calls.some((call) => call.name === tool)) {
      console.log(`  ✗ ${tool} must not be called — calls seen: ${seen}`);
      ok = false;
    } else {
      console.log(`  ✓ no ${tool}`);
    }
  }

  if (turn.replyMatch) {
    if (turn.replyMatch.test(reply)) console.log(`  ✓ reply matches ${turn.replyMatch}`);
    else {
      console.log(`  ✗ reply does not match ${turn.replyMatch}`);
      ok = false;
    }
  }

  return ok;
}

/** Wraps the executor so every tool call is recorded and still runs for real. */
function tapToolCalls(executor: ToolExecutor): CapturedCall[] {
  const captured: CapturedCall[] = [];
  const original = executor.run.bind(executor);

  executor.run = async (context, call) => {
    captured.push({ name: call.name, args: parse(call.rawArguments) });
    return original(context, call);
  };
  return captured;
}

function parse(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw || '{}');
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function wipe(mongo: MongoService, userId: UserId): Promise<void> {
  await Promise.all([
    mongo.users.deleteMany({ _id: userId }),
    mongo.messages.deleteMany({ userId }),
    mongo.memories.deleteMany({ userId }),
    mongo.entries.deleteMany({ userId }),
    mongo.reminders.deleteMany({ userId }),
  ]);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
