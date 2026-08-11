/**
 * Prints what actually exists in the Paddle sandbox — products, prices,
 * trials, country overrides, and notification destinations.
 *
 *   npm run paddle:inspect
 *
 * Read-only. This is the answer to "did that seed really land, and is the
 * webhook destination still pointed at my tunnel?", which is otherwise four
 * clicks in the dashboard.
 */
import 'dotenv/config';
import { type CountryCode, Environment, Paddle } from '@paddle/paddle-node-sdk';

async function main(): Promise<void> {
  const key = required('PADDLE_API_KEY');
  const paddle = new Paddle(key, {
    environment: key.includes('_sdbx') ? Environment.sandbox : Environment.production,
  });

  console.log(key.includes('_sdbx') ? '— sandbox —\n' : '— PRODUCTION —\n');

  for await (const product of paddle.products.list({ status: ['active'] })) {
    console.log(`${product.name}  ${product.id}  tax=${product.taxCategory}`);

    for await (const price of paddle.prices.list({ productId: [product.id], status: ['active'] })) {
      const cycle = price.billingCycle
        ? `${price.billingCycle.frequency} ${price.billingCycle.interval}`
        : 'one-time';
      const trial = price.trialPeriod
        ? `${price.trialPeriod.frequency}-${price.trialPeriod.interval} trial`
        : 'no trial';
      const overrides = (price.unitPriceOverrides ?? [])
        .map((o) => `${o.countryCodes.join('/')} ${o.unitPrice.amount} ${o.unitPrice.currencyCode}`)
        .join(', ');

      console.log(`  ${price.id}`);
      console.log(
        `    ${cycle} · ${price.unitPrice.amount} ${price.unitPrice.currencyCode} · ${trial}`,
      );
      console.log(`    overrides: ${overrides || 'none'}`);
    }
    console.log();
  }

  // What a visitor in a given country is actually quoted, straight from
  // Paddle — the same call the pricing page makes in the browser.
  //
  //   npm run paddle:inspect -- GB IE AU
  const countries = process.argv.slice(2).filter((a) => /^[A-Z]{2}$/.test(a));
  for (const countryCode of countries) {
    const priceIds: string[] = [];
    for await (const product of paddle.products.list({ status: ['active'] })) {
      for await (const price of paddle.prices.list({ productId: [product.id], status: ['active'] })) {
        priceIds.push(price.id);
      }
    }

    const preview = await paddle.pricingPreview.preview({
      items: priceIds.map((priceId) => ({ priceId, quantity: 1 })),
      // The SDK types this as a union of every ISO code; argv is just a string.
      address: { countryCode: countryCode as CountryCode },
    });

    console.log(`${countryCode}:`);
    for (const line of preview.details.lineItems) {
      console.log(
        `  ${line.price.name ?? line.price.id}  total=${line.formattedTotals.total}  (net ${line.formattedTotals.subtotal}, tax ${line.formattedTotals.tax})`,
      );
    }
    console.log();
  }

  // Unlike products and prices, this one returns a plain array, not a paginator.
  for (const destination of await paddle.notificationSettings.list()) {
    console.log(`destination ${destination.id}  ${destination.description}`);
    console.log(`  ${destination.destination}`);
    console.log(`  active=${destination.active}  events=${destination.subscribedEvents.length}`);
  }
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
