/**
 * The shape of a Cloud API webhook, narrowed to what Recalfy reads.
 *
 * Meta nests deeply and batches: one POST can carry several entries, each with
 * several changes, each with several messages. Everything here is optional
 * because a delivery-status callback arrives in the same envelope as a real
 * message and shares none of its fields.
 */
export interface WhatsAppWebhook {
  object?: string;
  entry?: {
    id?: string;
    changes?: {
      field?: string;
      value?: {
        messaging_product?: string;
        messages?: WhatsAppMessage[];
        statuses?: unknown[];
      };
    }[];
  }[];
}

export interface WhatsAppMessage {
  /** The sender's phone number, E.164 without '+'. Their handle. */
  from?: string;
  id?: string;
  /** Unix seconds, as a string. */
  timestamp?: string;
  type?: string;
  text?: { body?: string };
}

/** One inbound text, flattened out of the envelope. */
export interface ParsedMessage {
  from: string;
  messageId: string;
  text: string;
  receivedAt: Date;
}

/**
 * Pulls the text messages out of a webhook body, dropping everything else.
 *
 * Delivery receipts, read receipts, reactions, images and voice notes all
 * arrive here too. Recalfy is a text assistant, so anything without a text
 * body is ignored rather than half-handled — see `unsupportedTypes` for what
 * the caller may want to answer politely.
 */
export function parseMessages(body: WhatsAppWebhook): ParsedMessage[] {
  const parsed: ParsedMessage[] = [];

  for (const message of allMessages(body)) {
    const text = message.text?.body;
    if (message.type !== 'text' || !text || !message.from || !message.id) continue;

    parsed.push({
      from: message.from,
      messageId: message.id,
      text,
      receivedAt: timestampOf(message),
    });
  }

  return parsed;
}

/** Senders who sent something Recalfy can't read, so they get told so. */
export function unsupportedTypes(body: WhatsAppWebhook): { from: string; type: string }[] {
  return allMessages(body)
    .filter((message) => message.type && message.type !== 'text' && message.from)
    .map((message) => ({ from: message.from!, type: message.type! }));
}

function allMessages(body: WhatsAppWebhook): WhatsAppMessage[] {
  return (body.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
  );
}

/**
 * Meta's timestamp, or now. Webhooks can be retried for hours after the fact,
 * and the original instant is what the assistant should reason about — but a
 * missing or unparseable one must not produce an Invalid Date downstream.
 */
function timestampOf(message: WhatsAppMessage): Date {
  const seconds = Number(message.timestamp);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date();
}
