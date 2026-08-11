import { IndexDescription } from 'mongodb';

import { CHANNELS, COLLECTIONS } from './collections';

/**
 * Ordinary B-tree indexes plus one plain Mongo text index — no Atlas Search,
 * no vector index. Free clusters support neither, and the whole memory goes
 * into the prompt rather than being retrieved. See DESIGN.md §1; the text
 * index serves `search_history`, episodic recall over the raw transcript.
 */
export const INDEXES: Record<string, IndexDescription[]> = {
  [COLLECTIONS.memories]: [
    { key: { userId: 1, deletedAt: 1, supersededBy: 1 }, name: 'render_scan' },
    { key: { userId: 1, sid: 1 }, name: 'sid_lookup', unique: true },
  ],
  [COLLECTIONS.entries]: [
    // Serves both the digest window ("this month") and every report query.
    { key: { userId: 1, tracker: 1, at: -1 }, name: 'by_tracker' },
    { key: { userId: 1, sid: 1 }, name: 'entry_sid_lookup', unique: true },
  ],
  [COLLECTIONS.reminders]: [
    { key: { status: 1, dueAt: 1 }, name: 'due_scan' },
    { key: { userId: 1, status: 1 }, name: 'by_user' },
  ],
  [COLLECTIONS.messages]: [
    { key: { userId: 1, createdAt: -1 }, name: 'recent' },
    // The equality prefix keeps a $text search inside one user's transcript.
    { key: { userId: 1, text: 'text' }, name: 'history_search' },
  ],
  [COLLECTIONS.linkTokens]: [
    // Atlas sweeps expired docs about once a minute, which is fine for
    // cleanup but too slow to be a security boundary — redemption filters on
    // expiresAt itself rather than trusting the reaper.
    { key: { expiresAt: 1 }, name: 'ttl', expireAfterSeconds: 0 },
    { key: { webUserId: 1 }, name: 'by_web_user' },
  ],
  [COLLECTIONS.pairingCodes]: [
    { key: { expiresAt: 1 }, name: 'ttl', expireAfterSeconds: 0 },
    { key: { channel: 1, handle: 1 }, name: 'by_chat_account' },
  ],
  // Both are keyed by their Paddle id, so `_id` already serves the webhook's
  // upsert. These serve the other direction: "what is this account entitled
  // to", which every gated read asks.
  [COLLECTIONS.paddleCustomers]: [
    {
      key: { userId: 1 },
      name: 'by_account',
      partialFilterExpression: { userId: { $type: 'string' } },
    },
  ],
  [COLLECTIONS.paddleSubscriptions]: [
    {
      key: { userId: 1, status: 1 },
      name: 'by_account',
      partialFilterExpression: { userId: { $type: 'string' } },
    },
    { key: { customerId: 1 }, name: 'by_customer' },
  ],
  // One chat account maps to at most one web account, per channel. Partial
  // rather than sparse so each constraint ignores the accounts that have not
  // connected that channel — which, for any given channel, is most of them.
  [COLLECTIONS.webUsers]: CHANNELS.map((channel) => ({
    key: { [`channels.${channel}.handle`]: 1 },
    name: `${channel}_link`,
    unique: true,
    partialFilterExpression: { [`channels.${channel}.handle`]: { $type: 'string' } },
  })),
};
