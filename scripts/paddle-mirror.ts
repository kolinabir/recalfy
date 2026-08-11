/**
 * Prints the billing mirror — what the webhook has actually written to Mongo,
 * and what the access helper would decide from it.
 *
 *   npm run paddle:mirror
 *
 * The question this answers during a test checkout is "did fulfilment land?",
 * which is otherwise a Mongo shell and two collection names.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main(): Promise<void> {
  const client = new MongoClient(required('MONGODB_URI'));
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? 'recalfy');

  const customers = await db.collection('paddleCustomers').find({}).toArray();
  const subscriptions = await db
    .collection('paddleSubscriptions')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  console.log(`customers (${customers.length}):`);
  for (const c of customers) {
    console.log(`  ${c._id}  ${c.email || '(no email)'}  userId=${c.userId ?? 'MISSING'}`);
  }

  console.log(`\nsubscriptions (${subscriptions.length}):`);
  for (const s of subscriptions) {
    const granted = ['active', 'trialing', 'past_due'].includes(s.status);
    const pending = s.scheduledChange
      ? `  pending ${s.scheduledChange.action} @ ${s.scheduledChange.at.toISOString()}`
      : '';
    console.log(`  ${s._id}`);
    console.log(`    status=${s.status}  access=${granted ? 'GRANTED' : 'DENIED'}${pending}`);
    console.log(`    price=${s.priceId}  customer=${s.customerId}  userId=${s.userId ?? 'MISSING'}`);
  }

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
