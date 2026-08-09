import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/mongo";

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

export interface Viewer {
  email: string;
  name?: string | null;
  image?: string | null;
  telegramUserId?: number;
}

/** Session gate every dashboard page runs. The proxy only checked the cookie exists. */
export async function requireViewer(): Promise<Viewer> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Written by the bot when it redeems a link token — authoritative here,
  // the client never gets to assert it.
  const telegramUserId = (session.user as { telegramUserId?: number })
    .telegramUserId;

  return {
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    telegramUserId,
  };
}

/**
 * The rendered memory: what the bot itself would recite. Superseded, deleted
 * and expired facts stay in the collection for audit but are not memory.
 */
export async function getMemories(
  telegramUserId: number,
): Promise<MemoryItem[]> {
  const rows = await db
    .collection("memories")
    .find(
      {
        userId: telegramUserId,
        deletedAt: { $exists: false },
        supersededBy: { $exists: false },
        $or: [
          { staleAfter: { $exists: false } },
          { staleAfter: { $gt: new Date() } },
        ],
      },
      { projection: { sid: 1, text: 1, group: 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1 })
    .toArray();

  return rows.map((row) => ({
    id: row._id.toString(),
    sid: String(row.sid),
    text: String(row.text),
    group: String(row.group ?? "General"),
    createdAt: (row.createdAt as Date).toISOString(),
  }));
}

export async function getReminders(
  telegramUserId: number,
): Promise<ReminderItem[]> {
  const rows = await db
    .collection("reminders")
    .find(
      { userId: telegramUserId, status: "pending" },
      { projection: { text: 1, dueAt: 1, repeat: 1 } },
    )
    .sort({ dueAt: 1 })
    .limit(50)
    .toArray();

  return rows.map((row) => ({
    id: row._id.toString(),
    text: String(row.text),
    dueAt: (row.dueAt as Date).toISOString(),
    ...(row.repeat
      ? { repeat: row.repeat as ReminderItem["repeat"] }
      : {}),
  }));
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
}

/** The bot's own record of this person — timezone and brief schedule. */
export async function getBotProfile(
  telegramUserId: number,
): Promise<BotProfile> {
  const row = await db
    .collection("users")
    .findOne(
      // The bot keys `users` by the numeric Telegram id, not an ObjectId.
      { _id: telegramUserId as unknown as import("mongodb").ObjectId },
      { projection: { tz: 1, brief: 1, createdAt: 1 } },
    );

  if (!row) return {};

  return {
    tz: row.tz as string | undefined,
    brief: row.brief as BotProfile["brief"],
    memberSince:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : undefined,
  };
}
