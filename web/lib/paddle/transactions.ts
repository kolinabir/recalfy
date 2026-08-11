import "server-only";

import { customers } from "./mirror";
import { paddle } from "./server";

/**
 * The invoice list behind /dashboard/billing.
 *
 * Reads from Paddle rather than the mirror: receipts are historical records we
 * never need to serve offline, and mirroring them would mean keeping a second
 * copy of money correct forever.
 */

export interface Invoice {
  id: string;
  billedAt: string | null;
  status: string;
  total: string;
  currency: string;
}

export interface InvoicePage {
  items: Invoice[];
  hasMore: boolean;
}

/**
 * Paddle sends amounts in the currency's lowest unit, with no formatted
 * string on a Transaction — unlike PricePreview, which has one.
 */
export function fromLowestUnit(amount: string, currency: string): number {
  switch (currency) {
    // No minor units: "1200" already means ¥1,200, not ¥12.00.
    case "JPY":
    case "KRW":
    case "CLP":
      return parseFloat(amount);
    default:
      return parseFloat(amount) / 100;
  }
}

export function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(fromLowestUnit(amount, currency));
}

/**
 * One page of invoices for the signed-in account.
 *
 * The `customerId` filter is the security boundary, not a nicety: without it
 * the SDK happily returns every transaction in the account. The id is resolved
 * from the session's userId here and is never accepted from a caller.
 */
export async function invoicesForUser(
  userId: string,
  after?: string,
): Promise<InvoicePage> {
  const customer = await customers().findOne({ userId });
  if (!customer) return { items: [], hasMore: false };

  const collection = paddle().transactions.list({
    customerId: [customer._id],
    // draft and ready are in-flight internal states, not receipts.
    status: ["billed", "paid", "past_due", "completed", "canceled"],
    perPage: 10,
    after,
  });

  // One page only. Looping hasMore server-side would pull a customer's entire
  // history into memory and burn rate limit for a screen showing ten rows.
  const page = (await collection.next()) ?? [];

  return {
    items: page.map((t) => ({
      id: t.id,
      billedAt: t.billedAt ?? null,
      status: t.status,
      // Paddle's precomputed total already includes tax, discounts and
      // credits. Re-summing line items would drift from the real charge.
      total: formatMoney(t.details?.totals?.total ?? "0", t.currencyCode),
      currency: t.currencyCode,
    })),
    hasMore: collection.hasMore,
  };
}
