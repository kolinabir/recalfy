/**
 * Mints a sandbox client-side token for Paddle.js, or reuses the one this
 * script made earlier. Publishable (`test_...`) — it belongs in
 * NEXT_PUBLIC_PADDLE_CLIENT_TOKEN and is safe in the browser bundle.
 *
 *   npm run paddle:token
 */
import 'dotenv/config';
import { Environment, Paddle } from '@paddle/paddle-node-sdk';

const NAME = 'Recalfy web (sandbox)';

async function main(): Promise<void> {
  const key = required('PADDLE_API_KEY');
  if (!key.includes('_sdbx')) throw new Error('Not a sandbox key. Refusing.');
  const paddle = new Paddle(key, { environment: Environment.sandbox });

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

function required(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required environment variable: ${k}`);
  return v;
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
