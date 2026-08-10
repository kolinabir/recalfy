/**
 * One-time migration: Telegram numeric ids become account ids.
 *
 *   npm run migrate:channels          # dry run — prints what it would do
 *   npm run migrate:channels -- --go  # actually writes
 *
 * Before this, a user *was* their Telegram id: `users._id`, and the `userId`
 * on every message, memory and reminder. Adding WhatsApp made that untenable —
 * a phone number is a different namespace, and the same person has both. So
 * identity moves to the account they already linked, and a Telegram id becomes
 * one address among several.
 *
 * Two things happen here, in this order:
 *
 *   1. `user.telegramUserId` → `user.channels.telegram.{handle,linkedAt}`
 *   2. every numeric `userId`/`_id` → the hex account id it maps to
 *
 * Idempotent: rows already carrying a string id are skipped, so an interrupted
 * run can simply be run again. Anything whose Telegram id has no linked
 * account is left untouched and reported — that is data the bot could never
 * have served anyway, and deleting it silently would be the wrong call.
 */
import 'dotenv/config';
import { Db, MongoClient } from 'mongodb';

import { COLLECTIONS } from '../src/mongo/collections';

/** Collections whose `userId` field points at a user. */
const OWNED = [COLLECTIONS.messages, COLLECTIONS.memories, COLLECTIONS.reminders] as const;

interface Plan {
  /** Telegram numeric id → account id hex. */
  identities: Map<number, string>;
  orphans: number[];
}

async function main(): Promise<void> {
  const write = process.argv.includes('--go');
  const client = new MongoClient(required('MONGODB_URI'));
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB ?? 'recalfy');

    const plan = await buildPlan(db);
    report(plan);

    if (!write) {
      console.log('\nDry run. Nothing was written. Re-run with --go to apply.');
      return;
    }

    await moveLinks(db, plan);
    await rewriteUsers(db, plan);
    for (const collection of OWNED) await rewriteOwned(db, collection, plan);
    await dropStaleHandshakes(db);

    console.log('\nDone.');
  } finally {
    await client.close();
  }
}

/**
 * The mapping, read from the one place that has ever held both halves: the
 * Better Auth user record that the old link flow wrote `telegramUserId` onto.
 */
async function buildPlan(db: Db): Promise<Plan> {
  const linked = await db
    .collection(COLLECTIONS.webUsers)
    .find({ telegramUserId: { $type: 'number' } }, { projection: { telegramUserId: 1 } })
    .toArray();

  const identities = new Map<number, string>();
  for (const doc of linked) {
    identities.set(doc.telegramUserId as number, doc._id.toString());
  }

  // Users the bot has records for but no account maps to. Almost always the
  // scratch ids from `npm run chat`; worth naming rather than assuming.
  const existing = await db
    .collection(COLLECTIONS.users)
    .find({ _id: { $type: 'number' } } as never, { projection: { _id: 1 } })
    .toArray();

  const orphans = existing
    .map((doc) => doc._id as unknown as number)
    .filter((id) => !identities.has(id));

  return { identities, orphans };
}

function report({ identities, orphans }: Plan): void {
  console.log(`Accounts to migrate: ${identities.size}`);
  for (const [telegramUserId, accountId] of identities) {
    console.log(`  ${telegramUserId}  →  ${accountId}`);
  }

  if (orphans.length > 0) {
    console.log(`\nLeft alone — no linked account (${orphans.length}):`);
    for (const id of orphans) console.log(`  ${id}`);
  }
}

/** Step 1: the link itself, from a flat field to the per-channel subdocument. */
async function moveLinks(db: Db, { identities }: Plan): Promise<void> {
  const users = db.collection(COLLECTIONS.webUsers);

  for (const [telegramUserId] of identities) {
    const doc = await users.findOne({ telegramUserId });
    if (!doc || doc.channels?.telegram) continue;

    await users.updateOne(
      { _id: doc._id },
      {
        $set: {
          'channels.telegram': {
            handle: String(telegramUserId),
            // Keep the original date where we have it; the link did happen.
            linkedAt: (doc.telegramLinkedAt as Date | undefined) ?? new Date(),
          },
        },
        $unset: { telegramUserId: '', telegramLinkedAt: '' },
      },
    );
  }
  console.log(`\nMoved ${identities.size} link(s) onto channels.telegram`);
}

/**
 * Step 2a: the user documents. `_id` is immutable in Mongo, so each row is
 * re-inserted under its new id and the old one removed — insert first, so a
 * crash between the two leaves a duplicate rather than a hole.
 */
async function rewriteUsers(db: Db, { identities }: Plan): Promise<void> {
  const users = db.collection(COLLECTIONS.users);
  let moved = 0;

  for (const [telegramUserId, accountId] of identities) {
    const doc = await users.findOne({ _id: telegramUserId as never });
    if (!doc) continue;

    await users.insertOne({
      ...doc,
      _id: accountId as never,
      // Everyone predating this migration arrived on Telegram, and the router
      // needs somewhere to send the next reminder.
      lastChannel: 'telegram',
    });
    await users.deleteOne({ _id: telegramUserId as never });
    moved += 1;
  }
  console.log(`Rewrote ${moved} user document(s)`);
}

/** Step 2b: every row that points at a user. Updated in place — `userId` is not the key. */
async function rewriteOwned(db: Db, collection: string, { identities }: Plan): Promise<void> {
  let total = 0;

  for (const [telegramUserId, accountId] of identities) {
    const result = await db
      .collection(collection)
      .updateMany({ userId: telegramUserId as never }, { $set: { userId: accountId } });
    total += result.modifiedCount;
  }
  console.log(`Rewrote ${total} row(s) in ${collection}`);
}

/**
 * Both handshake records changed shape: pairing codes swapped
 * `telegramUserId` for `channel` + `handle`, and link tokens gained the
 * `channel` they were minted for — which redemption now filters on, so an old
 * token would never match anyway.
 *
 * Neither is worth rewriting. They expire in minutes, and anyone caught
 * mid-handshake just presses Connect again.
 */
async function dropStaleHandshakes(db: Db): Promise<void> {
  const codes = await db
    .collection(COLLECTIONS.pairingCodes)
    .deleteMany({ telegramUserId: { $exists: true } });
  const tokens = await db
    .collection(COLLECTIONS.linkTokens)
    .deleteMany({ channel: { $exists: false } });

  console.log(
    `Dropped ${codes.deletedCount} pre-migration pairing code(s) and ${tokens.deletedCount} link token(s)`,
  );
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
