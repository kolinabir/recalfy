import {
  EventName,
  type CustomerCreatedEvent,
  type CustomerUpdatedEvent,
  type EventEntity,
  type SubscriptionCanceledEvent,
  type SubscriptionCreatedEvent,
  type SubscriptionUpdatedEvent,
  type TransactionCompletedEvent,
} from "@paddle/paddle-node-sdk";

import { paddle, webhookSecret } from "@/lib/paddle/server";
import {
  type SubscriptionStatus,
  upsertCustomer,
  upsertSubscription,
} from "@/lib/paddle/mirror";

/**
 * Where Paddle tells us what happened. This is the only writer of the billing
 * mirror, and the only thing that may grant paid access — the browser's
 * post-checkout redirect is decoration and can be closed, blocked, or faked.
 *
 * Paddle counts a delivery as successful only on a 2xx within five seconds,
 * and retries everything else (60 attempts over ~3 days on live). So the one
 * unrecoverable mistake is answering 2xx to something we did not actually
 * handle — that marks the event delivered and it is gone. Every failure path
 * below returns non-2xx on purpose.
 */
export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("paddle-signature") ?? "";
  // Must be the raw bytes. Parsing and re-serialising changes them and the
  // HMAC will not match what Paddle signed.
  const body = await request.text();

  if (!signature || !body) {
    return Response.json({ error: "Missing signature or body" }, { status: 400 });
  }

  try {
    // Verifies the HMAC and the timestamp, and throws on any mismatch. Nothing
    // reads the payload before this line.
    const event = await paddle().webhooks.unmarshal(
      body,
      webhookSecret(),
      signature,
    );
    if (event) await handle(event);

    return Response.json({ received: true });
  } catch (error) {
    // A thrown unmarshal cannot tell a forged request from a rotated secret
    // from an expired timestamp, so there is no honest way to split this into
    // 401-vs-500 — one status for the whole catch. 500 keeps the event in the
    // retry budget, which is what recovers the rotated-secret case by itself.
    console.error("[paddle] webhook failed", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

async function handle(event: EventEntity): Promise<void> {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
      return onSubscription(event);
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      return onCustomer(event);
    case EventName.TransactionCompleted:
      return onTransaction(event);
    default:
      // Subscribed to more than we handle is normal and must not throw — a
      // throw here would 500 and make Paddle retry an event forever.
      return;
  }
}

async function onSubscription(
  event:
    | SubscriptionCreatedEvent
    | SubscriptionUpdatedEvent
    | SubscriptionCanceledEvent,
): Promise<void> {
  const data = event.data;
  const item = data.items[0];

  await upsertSubscription({
    subscriptionId: data.id,
    customerId: data.customerId,
    userId: userIdFrom(data.customData),
    status: data.status as SubscriptionStatus,
    priceId: item?.price?.id ?? "",
    productId: item?.price?.productId ?? "",
    scheduledChange: data.scheduledChange
      ? {
          action: data.scheduledChange.action,
          at: new Date(data.scheduledChange.effectiveAt),
        }
      : undefined,
    occurredAt: new Date(event.occurredAt),
  });
}

async function onCustomer(
  event: CustomerCreatedEvent | CustomerUpdatedEvent,
): Promise<void> {
  await upsertCustomer({
    customerId: event.data.id,
    email: event.data.email,
    userId: userIdFrom(event.data.customData),
  });
}

/**
 * Subscriptions carry their own events, so this exists for the customer link
 * rather than the money: `transaction.completed` is often the first event that
 * names both the Paddle customer and our account id.
 */
async function onTransaction(event: TransactionCompletedEvent): Promise<void> {
  const userId = userIdFrom(event.data.customData);
  const customerId = event.data.customerId;
  if (!userId || !customerId) return;

  // No email here: the transaction payload carries only the customer id, and
  // upsertCustomer leaves a known address alone rather than blanking it.
  await upsertCustomer({ customerId, userId });
}

/**
 * The account id we put on the checkout. Everything else about a customer can
 * change — email especially — so this is the only join we trust.
 */
function userIdFrom(customData: unknown): string | undefined {
  if (typeof customData !== "object" || customData === null) return undefined;
  const value = (customData as { userId?: unknown }).userId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
