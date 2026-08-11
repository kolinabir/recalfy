/**
 * Fires a real Paddle-generated event at the notification destination, so the
 * webhook is exercised with a payload Paddle actually signed rather than one
 * we hand-rolled.
 *
 *   npm run paddle:simulate -- subscription.created
 *
 * Creates a reusable simulation the first time and re-runs it after that.
 */
import 'dotenv/config';
import {
  Environment,
  Paddle,
  type CreateSimulationRequestBody,
} from '@paddle/paddle-node-sdk';

async function main(): Promise<void> {
  // Either a scenario ("subscription_creation" — a whole lifecycle) or a
  // single event name ("subscription.updated").
  const type = process.argv[2] ?? 'subscription_creation';
  // Keep monthly, unless another price is named.
  const priceId = process.argv[3] ?? 'pri_01kzrj0y3qycgb7ryc1cxx5p11';

  const key = required('PADDLE_API_KEY');
  if (!key.includes('_sdbx')) throw new Error('Not a sandbox key. Refusing.');
  const paddle = new Paddle(key, { environment: Environment.sandbox });

  const destination = (await paddle.notificationSettings.list()).find(
    (d) => d.description === 'Recalfy fulfilment',
  );
  if (!destination) {
    throw new Error('No "Recalfy fulfilment" destination — run npm run paddle:destination first.');
  }

  const name = `sim ${type}`;
  let simulationId: string | undefined;
  for await (const existing of paddle.simulations.list()) {
    if (existing.name === name && existing.notificationSettingId === destination.id) {
      simulationId = existing.id;
      break;
    }
  }

  if (!simulationId) {
    const body: CreateSimulationRequestBody =
      type === 'subscription_creation'
        ? {
            notificationSettingId: destination.id,
            name,
            type: 'subscription_creation',
            // The whole signup path — transaction.completed, customer.created
            // and subscription.created — against a real price.
            config: {
              subscriptionCreation: {
                entities: {
                  items: [{ priceId, quantity: 1 }],
                },
                options: { customerSimulatedAs: 'new' },
              },
            },
          }
        : // IEventName covers events the simulator cannot produce, so the
          // narrower simulatable union is asserted rather than inferred.
          ({
            notificationSettingId: destination.id,
            name,
            type,
          } as CreateSimulationRequestBody);

    const created = await paddle.simulations.create(body);
    simulationId = created.id;
    console.log(`created simulation ${simulationId}`);
  }

  const run = await paddle.simulationRuns.create(simulationId);
  console.log(`run ${run.id} status=${run.status}`);
  console.log('Paddle delivers asynchronously — check the app log and the mirror.');
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
