import { Environment, Paddle } from '@paddle/paddle-node-sdk';

/**
 * Which Paddle account a script talks to, decided once, here.
 *
 * The key itself says which environment it belongs to, but that is not enough
 * to act on: a live key sitting in .env would otherwise silently turn every
 * script into a production operation. So live also needs `--live` on the
 * command line — the environment is inferred, the *intent* is stated.
 */
export interface PaddleTarget {
  paddle: Paddle;
  live: boolean;
  label: string;
}

export function paddleTarget(argv: string[] = process.argv): PaddleTarget {
  const key = required('PADDLE_API_KEY');
  const sandbox = key.includes('_sdbx');
  const wantsLive = argv.includes('--live');

  if (!sandbox && !wantsLive) {
    throw new Error(
      'PADDLE_API_KEY is a LIVE key. Re-run with --live if that is what you mean.\n' +
        'Live products and prices are real: they can be archived, but not deleted,\n' +
        "and a product's tax category is frozen the moment it makes its first sale.",
    );
  }

  if (sandbox && wantsLive) {
    throw new Error('--live was passed but PADDLE_API_KEY is a sandbox key. Refusing to guess.');
  }

  return {
    paddle: new Paddle(key, {
      environment: sandbox ? Environment.sandbox : Environment.production,
    }),
    live: !sandbox,
    label: sandbox ? 'sandbox' : 'LIVE',
  };
}

export function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
