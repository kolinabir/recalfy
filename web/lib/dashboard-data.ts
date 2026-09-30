import "server-only";

import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/mongo";
import { revealText } from "@/lib/vault";

/**
 * Read models for the dashboard, serialised to plain JSON-safe shapes so they
 * can cross into client components. The bot owns these collections; the web
 * app only ever reads them.
 */

export interface MemoryItem {
  id: string;
  sid: string;
  text: string;
  group: string;
  createdAt: string;
}

export interface ReminderItem {
  id: string;
  text: string;
  dueAt: string;
  repeat?: { unit: "day" | "week" | "month" | "year"; interval: number };
}

export type Channel = "telegram" | "whatsapp";

export interface Viewer {
  /** The account id — and, since the channels migration, the bot's `userId`. */
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  /** Which chats are connected. Empty means the bot has never met them. */
  channels: Partial<Record<Channel, { handle: string; linkedAt?: string }>>;
}

/** True if any chat is connected — the dashboard has data either way. */
export function isConnected(viewer: Viewer): boolean {
  return Object.keys(viewer.channels).length > 0;
}

/**
 * The signed-in account, or null. Route handlers use this: a redirect to
 * /login is the right answer for a page and the wrong one for a download,
 * where the caller wants a status code it can act on.
 */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  // Read from the collection rather than the session: the bot writes this
  // when it redeems a link token, and a session minted before that would
  // still be carrying the old answer.
  const row = await db
    .collection("user")
    .findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { channels: 1 } },
    );

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    channels: (row?.channels as Viewer["channels"]) ?? {},
  };
}

/** Session gate every dashboard page runs. The proxy only checked the cookie exists. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/**
 * The rendered memory: what the bot itself would recite. Superseded, deleted
 * and expired facts stay in the collection for audit but are not memory.
 */
export async function getMemories(userId: string): Promise<MemoryItem[]> {
  const rows = await db
    .collection("memories")
    .find(
      {
        userId,
        deletedAt: { $exists: false },
        supersededBy: { $exists: false },
        $or: [
          { staleAfter: { $exists: false } },
          { staleAfter: { $gt: new Date() } },
        ],
      },
      { projection: { userId: 1, sid: 1, text: 1, sealed: 1, group: 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1 })
    .toArray();

  return rows.map((row) => ({
    id: row._id.toString(),
    sid: String(row.sid),
    text: revealText(row),
    group: String(row.group ?? "General"),
    createdAt: (row.createdAt as Date).toISOString(),
  }));
}

/** Pending reminders, soonest first. `limit: 0` means all of them — Mongo's own convention, and what the export wants. */
export async function getReminders(
  userId: string,
  limit = 50,
): Promise<ReminderItem[]> {
  const rows = await db
    .collection("reminders")
    .find(
      { userId, status: "pending" },
      { projection: { userId: 1, text: 1, sealed: 1, dueAt: 1, repeat: 1 } },
    )
    .sort({ dueAt: 1 })
    .limit(limit)
    .toArray();

  return rows.map((row) => ({
    id: row._id.toString(),
    text: revealText(row),
    dueAt: (row.dueAt as Date).toISOString(),
    ...(row.repeat
      ? { repeat: row.repeat as ReminderItem["repeat"] }
      : {}),
  }));
}

/**
 * Why a fact is no longer part of the live memory. Only the archive carries
 * this — everywhere else in the dashboard, a memory that isn't live isn't
 * shown at all.
 */
export type MemoryStatus = "live" | "superseded" | "forgotten" | "expired";

export interface ArchivedMemory extends MemoryItem {
  status: MemoryStatus;
  /** Set on "forgotten" rows: when the person asked for it to go. */
  forgottenAt?: string;
  /** Set on facts given a shelf life, whether or not it has passed. */
  expiresAt?: string;
}

/**
 * Every row the account owns, chronological, including the ones the bot no
 * longer recites. An export that quietly dropped corrections and deletions
 * would be a summary, not an export — and the point of the JSON format is
 * that nothing is left behind.
 */
export async function getArchive(userId: string): Promise<ArchivedMemory[]> {
  const rows = await db
    .collection("memories")
    .find(
      { userId },
      {
        projection: {
          userId: 1,
          sid: 1,
          text: 1,
          sealed: 1,
          group: 1,
          createdAt: 1,
          supersededBy: 1,
          deletedAt: 1,
          staleAfter: 1,
        },
      },
    )
    .sort({ createdAt: 1 })
    .toArray();

  const now = Date.now();

  return rows.map((row) => {
    const staleAfter = row.staleAfter as Date | undefined;
    const deletedAt = row.deletedAt as Date | undefined;

    // Order matters: an explicit "forget" is the truer answer than an
    // expiry that happened to pass first.
    const status: MemoryStatus = deletedAt
      ? "forgotten"
      : row.supersededBy
        ? "superseded"
        : staleAfter && staleAfter.getTime() <= now
          ? "expired"
          : "live";

    return {
      id: row._id.toString(),
      sid: String(row.sid),
      text: revealText(row),
      group: String(row.group ?? "General"),
      createdAt: (row.createdAt as Date).toISOString(),
      status,
      ...(deletedAt ? { forgottenAt: deletedAt.toISOString() } : {}),
      ...(staleAfter ? { expiresAt: staleAfter.toISOString() } : {}),
    };
  });
}

/** Memories younger than seven days — the momentum half of the counter line. */
export function countThisWeek(memories: MemoryItem[]): number {
  const weekAgo = Date.now() - 7 * 86_400_000;
  return memories.filter(
    (memory) => new Date(memory.createdAt).getTime() > weekAgo,
  ).length;
}

/**
 * One old fact a day, chosen by the calendar rather than Math.random so the
 * page is stable across refreshes. A memory product that only shows this
 * week's saves fails its own pitch.
 */
export function pickResurfaced(memories: MemoryItem[]): MemoryItem | null {
  const monthAgo = Date.now() - 30 * 86_400_000;
  const old = memories.filter(
    (memory) => new Date(memory.createdAt).getTime() < monthAgo,
  );
  if (old.length === 0) return null;

  const day = Math.floor(Date.now() / 86_400_000);
  return old[day % old.length];
}

export interface BotProfile {
  tz?: string;
  brief?: { enabled: boolean; hour: number; minute: number };
  memberSince?: string;
  /** Whether `@recalfy_bot …` answers in other chats. Absent in Mongo means on. */
  inline: boolean;
  /**
   * The two opt-*in* settings, where absent means off. They lean on parts of
   * Telegram older apps do not draw, so switching them on for everyone would
   * mean a chat that looks broken to whoever has not updated.
   */
  streaming: boolean;
  topics: boolean;
}

/** The bot's own record of this person — timezone and brief schedule. */
export async function getBotProfile(userId: string): Promise<BotProfile> {
  const row = await db
    .collection("users")
    .findOne(
      // The bot keys `users` by the account id as a plain string, not an
      // ObjectId — see the channels migration.
      { _id: userId as unknown as import("mongodb").ObjectId },
      {
        projection: {
          tz: 1,
          brief: 1,
          createdAt: 1,
          inline: 1,
          streaming: 1,
          topics: 1,
        },
      },
    );

  if (!row) return { inline: true, streaming: false, topics: false };

  return {
    // Opt-out, so anything other than an explicit false reads as on.
    inline: row.inline !== false,
    // Opt-in, so anything other than an explicit true reads as off.
    streaming: row.streaming === true,
    topics: row.topics === true,
    tz: row.tz as string | undefined,
    brief: row.brief as BotProfile["brief"],
    memberSince:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : undefined,
  };
}
