import { ObjectId } from 'mongodb';

/** Telegram numeric user id, stored as the `_id` of `users`. */
export type UserId = number;

/** Local wall-clock time the daily brief goes out. */
export interface BriefConfig {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface UserDoc {
  _id: UserId;
  /** IANA zone, e.g. "Asia/Kolkata". Every reminder resolution depends on it. */
  tz: string;
  /**
   * Set once we've learned where the user actually is, rather than assuming
   * the default. Until then the assistant is still introducing itself.
   */
  onboardedAt?: Date;
  /** Absent means the default: enabled at 08:00 once onboarded. */
  brief?: BriefConfig;
  /**
   * Local ISO date (yyyy-MM-dd) of the last brief, set atomically before
   * sending — the claim that makes the brief at-most-once per day.
   */
  lastBriefDay?: string;
  /** The evening mirror of the brief. Absent means off — it is opt-in. */
  reflection?: BriefConfig;
  lastReflectionDay?: string;
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
  /**
   * When an inherently temporary fact ("visiting parents next week") stops
   * being true. Past this instant it leaves the rendered memory on its own —
   * no sweep required, kept for audit like a soft delete.
   */
  staleAfter?: Date;
  sourceMessageId?: ObjectId;
  createdAt: Date;
}

export type ReminderStatus = 'pending' | 'claimed' | 'sent' | 'cancelled';

/** "Every 2 weeks" is { unit: 'week', interval: 2 }. */
export interface Repeat {
  unit: 'day' | 'week' | 'month' | 'year';
  interval: number;
}

export interface ReminderDoc {
  _id: ObjectId;
  userId: UserId;
  text: string;
  dueAt: Date;
  status: ReminderStatus;
  /**
   * Present on recurring reminders. When one fires, the next occurrence is
   * inserted as a fresh pending row — so at most one is ever pending, and
   * cancelling it ends the series.
   */
  repeat?: Repeat;
  /**
   * First instant of a recurring series, carried unchanged into every
   * occurrence. Recurrence is computed from here rather than from the last
   * firing, so a clamped month ("the 31st" in February) doesn't drift.
   */
  anchorAt?: Date;
  /**
   * Zone snapshot taken at scheduling. Recurrence is wall-clock arithmetic —
   * "every day at 9am" must stay 9am across a DST change, which only a zone
   * can express.
   */
  tz?: string;
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
