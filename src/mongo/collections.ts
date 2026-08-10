import { ObjectId } from 'mongodb';

/**
 * The person, independent of where they are typing. Hex form of the Better
 * Auth account `_id`, stored as the `_id` of `users`.
 *
 * It is deliberately *not* a channel's own id. Someone reaches Recalfy from
 * Telegram and from WhatsApp, and both have to land on one memory — so the
 * account they linked is the identity, and a channel id is only an address
 * that points at it.
 */
export type UserId = string;

/** Somewhere a person can be reached. Adding one means adding an adapter. */
export type Channel = 'telegram' | 'whatsapp';

export const CHANNELS: readonly Channel[] = ['telegram', 'whatsapp'];

/**
 * A channel's own id for a person, always as a string: a Telegram numeric
 * user id in decimal, or a WhatsApp `wa_id` — E.164 digits with no leading
 * `+`, which is the form Meta sends and expects back.
 */
export type Handle = string;

export interface Address {
  channel: Channel;
  handle: Handle;
}

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
  /**
   * The channel the last inbound message came from. Anything the user did not
   * just ask for — a reminder, the daily brief — goes here, so the assistant
   * answers where they last spoke rather than where they first signed up.
   */
  lastChannel?: Channel;
  /**
   * Last inbound message per channel. Routing recency, and on WhatsApp also a
   * hard constraint: Meta only allows free-form replies within 24 hours of the
   * user's own last message. Past that a send must be a template or not happen
   * at all — see channels/outbox.ts.
   */
  lastInboundAt?: Partial<Record<Channel, Date>>;
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

/**
 * A pending "connect" handshake. The web app mints one of these and sends the
 * person to the chat — `t.me/<bot>?start=<token>` on Telegram, `wa.me/<number>`
 * with the token pre-filled on WhatsApp. Whoever sends it proves they hold
 * that chat account, which typing a username never could.
 *
 * The token is public by construction — it travels in a URL and lands in chat
 * history — so it carries no identity of its own, only a pointer to the web
 * account that asked for it.
 */
export interface LinkTokenDoc {
  /** 32 random bytes, base64url. 43 chars, inside Telegram's 64-char cap. */
  _id: string;
  /** `_id` of the Better Auth user this will link to, as a string. */
  webUserId: string;
  /** Shown in the bot's confirmation so the person can spot a wrong account. */
  webUserEmail: string;
  /**
   * Which channel the token was minted for. A token issued for WhatsApp is
   * refused on Telegram: the two links are separate grants, and one press of
   * "Connect WhatsApp" should not be redeemable as a Telegram connection.
   */
  channel: Channel;
  createdAt: Date;
  /** TTL index target. Also filtered on at redemption — see LinkStore. */
  expiresAt: Date;
  /** Set on redemption; the filter that makes a token single-use. */
  consumedAt?: Date;
  consumedBy?: Handle;
}

/**
 * The manual fallback, for when neither the deep link nor the QR is usable.
 *
 * It runs the opposite way to a LinkTokenDoc: the bot mints this one, bound to
 * the Telegram account that asked, and it is redeemed in the signed-in web
 * app. That direction is deliberate — a code travelling towards an
 * authenticated form is one the holder must be persuaded to *reveal*, whereas
 * a code travelling towards the bot is one they can be persuaded to *paste*,
 * which is the shape every malicious-link scam already uses.
 */
export interface PairingCodeDoc {
  /** 8 Crockford base32 symbols, normalised — see channels/pairing-code.ts. */
  _id: string;
  /** The chat account that asked for the code, and will be linked by it. */
  channel: Channel;
  handle: Handle;
  createdAt: Date;
  expiresAt: Date;
  /**
   * Wrong guesses against this code from anyone. The code dies at the cap
   * rather than the guesser being throttled: an attacker can rotate accounts,
   * but cannot rotate the code they are trying to hit.
   */
  attempts: number;
  consumedAt?: Date;
  /** `_id` of the Better Auth user that redeemed it, as a string. */
  consumedBy?: string;
}

/** One connected chat account. At most one per channel, per web account. */
export interface ChannelLink {
  handle: Handle;
  linkedAt: Date;
}

/**
 * The Better Auth user record, as far as the bot is concerned. Better Auth
 * owns this collection and the rest of its shape; `channels` is the one field
 * we add, and the only one read here.
 *
 * This is also where identity resolution starts: an inbound message carries a
 * channel handle, and the `_id` found by matching it is the `UserId` that
 * every memory, reminder and message is filed under.
 */
export interface WebUserDoc {
  /** Better Auth stores an ObjectId here and exposes it as a hex string. */
  _id: ObjectId;
  email: string;
  name?: string;
  /** Keyed by channel. A unique partial index per key enforces "one owner". */
  channels?: Partial<Record<Channel, ChannelLink>>;
  /**
   * Where the Telegram link lived before channels existed. Read by the
   * migration in scripts/migrate-channels.ts and by nothing else.
   *
   * @deprecated
   */
  telegramUserId?: number;
  /** @deprecated see telegramUserId */
  telegramLinkedAt?: Date;
}

export const COLLECTIONS = {
  users: 'users',
  messages: 'messages',
  memories: 'memories',
  reminders: 'reminders',
  linkTokens: 'linkTokens',
  pairingCodes: 'pairingCodes',
  /** Better Auth's collection. Singular — that is its default, not a typo. */
  webUsers: 'user',
} as const;
