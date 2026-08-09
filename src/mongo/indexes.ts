import { IndexDescription } from 'mongodb';

import { COLLECTIONS } from './collections';

/**
 * Three ordinary B-tree indexes — no Atlas Search, no vector index.
 * Free clusters support neither, and the whole memory goes into the prompt
 * rather than being retrieved. See DESIGN.md §1.
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
  [COLLECTIONS.messages]: [{ key: { userId: 1, createdAt: -1 }, name: 'recent' }],
};
