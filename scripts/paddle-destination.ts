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
import { type IEventName } from '@paddle/paddle-node-sdk';

import { paddleTarget } from './paddle-env';

const DESCRIPTION = 'Recalfy fulfilment';

/**
 * Hosts that are somebody's laptop today and nobody's tomorrow.
 *
 * Matched by suffix rather than by "does this look like a domain" — the first
 * version of this check tested for a valid TLD, which `ngrok-free.app` happily
 * satisfies, and it let a live destination through to a tunnel.
 */
const EPHEMERAL_HOSTS = [
  'ngrok.io',
  'ngrok-free.app',
  'ngrok.app',
  'ngrok.dev',
  'loca.lt',
  'localhost',
  'trycloudflare.com',
  'hkdk.events',
  'serveo.net',
  'lhr.life',
  'localhost.run',
  'devtunnels.ms',
  'vercel.app',
  'netlify.app',
  'onrender.com',
];

function isEphemeralHost(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return true;
  }
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  return EPHEMERAL_HOSTS.some((bad) => host === bad || host.endsWith(`.${bad}`));
}

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

  const { paddle, live, label } = paddleTarget();
  console.log(`— ${label} —`);

  if (live && isEphemeralHost(url)) {
    throw new Error(
      `Refusing to point a LIVE destination at ${url}.\n` +
        'Live fulfilment events must go to a stable, deployed host — not a tunnel\n' +
        'or preview URL. When the tunnel dies, real customers are charged and\n' +
        'provisioned nothing, silently, until the 3-day retry budget expires.',
    );
  }

  // Live takes platform traffic only. "all" additionally accepts simulator
  // runs, which would let a test scenario write fabricated subscriptions into
  // the production mirror.
  const trafficSource = live ? 'platform' : 'all';

  const existing = (await paddle.notificationSettings.list()).find(
    (d) => d.description === DESCRIPTION,
  );

  if (existing) {
    const updated = await paddle.notificationSettings.update(existing.id, {
      destination: url,
      subscribedEvents: EVENTS,
      active: true,
      trafficSource,
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
    // Sandbox needs "all" so the simulator can exercise the endpoint; live
    // stays on "platform" so only real events can reach the mirror.
    trafficSource,
  });
  console.log(`created ${created.id} -> ${url}`);
  console.log(`secret: ${created.endpointSecretKey}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
