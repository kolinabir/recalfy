import { MongoClient } from 'mongodb';

import { renderMemoryDocument } from '../memory/memory-document';
import { COLLECTIONS, MemoryDoc, ReminderDoc, UserDoc, WebUserDoc } from '../mongo/collections';

/**
 * `recalfy export` — the self-hosted stand-in for the dashboard's download.
 *
 * Runs inside the bot's container (`docker compose exec bot node
 * dist/cli/export.js`) and prints to stdout, so the CLI on the host can write
 * the file wherever the person asked. Talks to Mongo directly rather than
 * booting Nest: booting Nest would start a second Telegram poller next to the
 * running one, and Telegram answers that with 409 on both.
 *
 *   --json   every record: live facts, corrected and forgotten ones, reminders
 *   default  the Markdown document the bot itself reads
 */
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const json = process.argv.includes('--json');

  const client = await MongoClient.connect(uri);
  try {
    const db = client.db(process.env.MONGODB_DB || 'recalfy');
    const owner = process.env.OWNER_TELEGRAM_ID;

    const account = await db
      .collection<WebUserDoc>(COLLECTIONS.webUsers)
      .findOne(owner ? { 'channels.telegram.handle': owner } : {});
    if (!account) throw new Error('No account found — has the bot been started at least once?');

    const userId = account._id.toHexString();
    const [user, memories] = await Promise.all([
      db.collection<UserDoc>(COLLECTIONS.users).findOne({ _id: userId }),
      db
        .collection<MemoryDoc>(COLLECTIONS.memories)
        .find({ userId })
        .sort({ createdAt: 1 })
        .toArray(),
    ]);

    if (!json) {
      const live = memories.filter((memory) => !memory.deletedAt);
      process.stdout.write(
        renderMemoryDocument({ timezone: user?.tz ?? 'UTC', memories: live, now: new Date() }) + '\n',
      );
      return;
    }

    const reminders = await db
      .collection<ReminderDoc>(COLLECTIONS.reminders)
      .find({ userId })
      .sort({ createdAt: 1 })
      .toArray();

    process.stdout.write(
      JSON.stringify(
        { exportedAt: new Date(), timezone: user?.tz ?? 'UTC', memories, reminders },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
