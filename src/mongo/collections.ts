import { ObjectId } from 'mongodb';

/** Telegram numeric user id, stored as the `_id` of `users`. */
export type UserId = number;

export interface UserDoc {
  _id: UserId;
  /** IANA zone, e.g. "Asia/Kolkata". Every reminder resolution depends on it. */
  tz: string;
  /**
   * Set once we've learned where the user actually is, rather than assuming
   * the default. Until then the assistant is still introducing itself.
   */
  onboardedAt?: Date;
  /** Monotonic counter behind the short ids (`sid`) shown to the model. */
  sidCounter: number;
  createdAt: Date;
}

export interface MessageDoc {
  _id: ObjectId;
  userId: UserId;
  role: 'user' | 'assistant';
  text: string;
  createdAt: Date;
}

export interface MemoryDoc {
  _id: ObjectId;
  userId: UserId;
  /** Short, stable, per-user id the model cites when forgetting or superseding. */
  sid: string;
  text: string;
  /** Heading this fact renders under, e.g. "People", "Home". */
  group: string;
  /** Set when this fact replaces an older one. */
  supersedes?: ObjectId;
  /** Set on the older fact when a newer one replaces it. Excluded from render. */
  supersededBy?: ObjectId;
  /** Soft delete. Excluded from render, kept for audit. */
  deletedAt?: Date;
  sourceMessageId?: ObjectId;
  createdAt: Date;
}

export type ReminderStatus = 'pending' | 'claimed' | 'sent' | 'cancelled';

export interface ReminderDoc {
  _id: ObjectId;
  userId: UserId;
  text: string;
  dueAt: Date;
  status: ReminderStatus;
  claimedAt?: Date;
  attempts: number;
  createdAt: Date;
}

export const COLLECTIONS = {
  users: 'users',
  messages: 'messages',
  memories: 'memories',
  reminders: 'reminders',
} as const;
