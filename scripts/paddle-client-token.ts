/**
 * Mints a sandbox client-side token for Paddle.js, or reuses the one this
 * script made earlier. Publishable (`test_...`) — it belongs in
 * NEXT_PUBLIC_PADDLE_CLIENT_TOKEN and is safe in the browser bundle.
 *
 *   npm run paddle:token
 */
import 'dotenv/config';

import { paddleTarget } from './paddle-env';

async function main(): Promise<void> {
  const { paddle, live, label } = paddleTarget();
  const NAME = `Recalfy web (${live ? 'live' : 'sandbox'})`;
  console.log(`— ${label} —`);

  for await (const existing of paddle.clientTokens.list({ status: ['active'] })) {
    if (existing.name === NAME) {
      console.log(`reused: ${existing.token}`);
      return;
    }
  }

  const created = await paddle.clientTokens.create({
    name: NAME,
    description: 'Paddle.js on recalfy.com — pricing page and checkout overlay.',
  });
  console.log(`created: ${created.token}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
