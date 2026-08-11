/**
 * Creates the Paddle notification destination that feeds the fulfilment
 * webhook, or points an existing one at a new URL.
 *
 *   npm run paddle:destination -- https://xxxx.ngrok-free.app/api/paddle/webhook
 *
 * Prints the signing secret, which goes in PADDLE_NOTIFICATION_WEBHOOK_SECRET.
 * It is NOT the API key, and each destination has its own — verifying with the
 * wrong one fails every delivery.
 *
 * A destination is part of the running system: nothing here deletes one. A
 * tunnel URL changes every time ngrok restarts, so re-running this updates the
 * existing destination in place and keeps the same secret.
 */
import 'dotenv/config';
import { Environment, Paddle, type IEventName } from '@paddle/paddle-node-sdk';

const DESCRIPTION = 'Recalfy fulfilment';

/** Everything the mirror acts on. Anything else the handler ignores. */
const EVENTS: IEventName[] = [
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'customer.created',
  'customer.updated',
  'transaction.completed',
];

async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url?.startsWith('https://')) {
    throw new Error('Pass the https URL of the webhook route as the first argument.');
  }

  const key = required('PADDLE_API_KEY');
  if (!key.includes('_sdbx')) throw new Error('Not a sandbox key. Refusing.');
  const paddle = new Paddle(key, { environment: Environment.sandbox });

  const existing = (await paddle.notificationSettings.list()).find(
    (d) => d.description === DESCRIPTION,
  );

  if (existing) {
    const updated = await paddle.notificationSettings.update(existing.id, {
      destination: url,
      subscribedEvents: EVENTS,
      active: true,
      trafficSource: 'all',
    });
    console.log(`updated ${updated.id} -> ${url}`);
    console.log(`secret: ${updated.endpointSecretKey}`);
    return;
  }

  const created = await paddle.notificationSettings.create({
    description: DESCRIPTION,
    destination: url,
    subscribedEvents: EVENTS,
    type: 'url',
    // "platform" is the default and refuses simulator traffic, so a scenario
    // run cannot exercise the endpoint. "all" takes both real and simulated.
    trafficSource: 'all',
  });
  console.log(`created ${created.id} -> ${url}`);
  console.log(`secret: ${created.endpointSecretKey}`);
}

function required(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required environment variable: ${k}`);
  return v;
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
