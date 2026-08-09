import { IndexDescription } from 'mongodb';

import { COLLECTIONS } from './collections';

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
  [COLLECTIONS.webUsers]: [
    // One Telegram account maps to at most one web account. Partial rather
    // than sparse so the constraint ignores the unlinked majority.
    {
      key: { telegramUserId: 1 },
      name: 'telegram_link',
      unique: true,
      partialFilterExpression: { telegramUserId: { $type: 'number' } },
    },
  ],
};
