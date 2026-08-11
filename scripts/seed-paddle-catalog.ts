/**
 * Creates the Recalfy plans — Keep and Archive — in the Paddle *sandbox*, each
 * with a monthly and an annual price, a 7-day trial, and GB/IE/AU overrides.
 *
 *   1. Create a sandbox API key with product.write and price.write at
 *      https://sandbox-vendors.paddle.com/authentication-v2
 *   2. Put it in .env as PADDLE_API_KEY (sandbox keys contain "_sdbx")
 *   3. npm run seed:paddle
 *
 * Prints the product and price ids as JSON — that mapping is what checkout
 * needs, so keep the output.
 *
 * Products are the unit of duplication here: run it twice and you get two
 * "Keep" products, which is why it refuses to touch a plan whose name already
 * exists. Pass --force to create anyway.
 *
 * Sandbox only by design. Live prices are a pricing decision, not a script.
 */
import 'dotenv/config';
import { Environment, Paddle } from '@paddle/paddle-node-sdk';

/**
 * Amounts are strings in the currency's lowest denomination — "600" is $6.00.
 * All four currencies here have two decimal places; the zero-decimal ones
 * (JPY, KRW, CLP) would be whole units instead.
 */
interface PlanPrice {
  interval: 'month' | 'year';
  usd: string;
  gbp: string;
  eur: string;
  aud: string;
}

interface Plan {
  name: string;
  description: string;
  prices: PlanPrice[];
}

const TRIAL = { interval: 'day', frequency: 7 } as const;

const PLANS: Plan[] = [
  {
    name: 'Keep',
    description: 'Everything you tell Recalfy, remembered and searchable.',
    prices: [
      { interval: 'month', usd: '600', gbp: '499', eur: '599', aud: '999' },
      { interval: 'year', usd: '5000', gbp: '4199', eur: '4999', aud: '8499' },
    ],
  },
  {
    name: 'Archive',
    description: 'Keep, plus long-term history, trackers, and exports.',
    prices: [
      { interval: 'month', usd: '1400', gbp: '1199', eur: '1399', aud: '2199' },
      { interval: 'year', usd: '12000', gbp: '9999', eur: '11999', aud: '18999' },
    ],
  },
];

async function main(): Promise<void> {
  const key = required('PADDLE_API_KEY');
  if (!key.includes('_sdbx')) {
    throw new Error('PADDLE_API_KEY is not a sandbox key (sandbox keys contain "_sdbx"). Refusing to touch live.');
  }

  const paddle = new Paddle(key, { environment: Environment.sandbox });
  const force = process.argv.includes('--force');

  if (!force) {
    const taken = new Set<string>();
    for await (const product of paddle.products.list({ status: ['active'] })) {
      taken.add(product.name);
    }
    const clashes = PLANS.map((plan) => plan.name).filter((name) => taken.has(name));
    if (clashes.length > 0) {
      throw new Error(
        `Already in this sandbox: ${clashes.join(', ')}. Creating again would duplicate them — ` +
          'archive the old ones in the dashboard, or re-run with --force.',
      );
    }
  }

  const catalog: Record<string, unknown> = {};

  for (const plan of PLANS) {
    const product = await paddle.products.create({
      name: plan.name,
      // Cannot be changed once the product has sold. Recalfy is hosted software.
      taxCategory: 'saas',
      description: plan.description,
    });

    const prices: Record<string, string> = {};
    for (const price of plan.prices) {
      const created = await paddle.prices.create({
        productId: product.id,
        description: `${plan.name} ${price.interval}ly USD`,
        unitPrice: { amount: price.usd, currencyCode: 'USD' },
        billingCycle: { interval: price.interval, frequency: 1 },
        trialPeriod: TRIAL,
        unitPriceOverrides: [
          { countryCodes: ['GB'], unitPrice: { amount: price.gbp, currencyCode: 'GBP' } },
          { countryCodes: ['IE'], unitPrice: { amount: price.eur, currencyCode: 'EUR' } },
          { countryCodes: ['AU'], unitPrice: { amount: price.aud, currencyCode: 'AUD' } },
        ],
      });
      prices[price.interval] = created.id;
    }

    catalog[plan.name.toLowerCase()] = { productId: product.id, prices };
  }

  console.log(JSON.stringify(catalog, null, 2));
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
