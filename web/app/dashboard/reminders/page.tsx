import type { Metadata } from "next";
import Link from "next/link";

import {
  getBotProfile,
  getReminders,
  requireViewer,
  type ReminderItem,
} from "@/lib/dashboard-data";
import { dueLabel, repeatLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reminders",
  description: "What Recalfy will speak up about, and when.",
};

export default async function RemindersPage() {
  const viewer = await requireViewer();
  const linked = typeof viewer.telegramUserId === "number";

  const [reminders, profile] = linked
    ? await Promise.all([
        getReminders(viewer.telegramUserId!),
        getBotProfile(viewer.telegramUserId!),
      ])
    : [[], {} as Awaited<ReturnType<typeof getBotProfile>>];

  return (
    <div>
      <header>
        <p className="eyebrow">Reminders</p>
        <h1 className="display display-fill mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          Spoken up, on time.
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-fg-muted">
          Set them in the chat in plain words — “remind me every second Friday”
          — and they fire there too. This page is the schedule
          {profile.tz ? (
            <>
              , shown in{" "}
              <span className="font-mono text-[0.8125rem] text-fg">
                {profile.tz}
              </span>
            </>
          ) : null}
          .
        </p>
      </header>

      <div className="mt-8">
        {!linked ? (
          <p className="rounded-xl border border-line px-6 py-10 text-center text-[0.9375rem] text-fg-subtle">
            <Link
              href="/dashboard"
              className="text-fg underline underline-offset-4"
            >
              Connect Telegram
            </Link>{" "}
            to start setting reminders.
          </p>
        ) : reminders.length === 0 ? (
          <p className="rounded-xl border border-line px-6 py-10 text-center text-[0.9375rem] text-fg-subtle">
            Nothing pending. Tell the bot{" "}
            <em className="not-italic text-fg-muted">
              “remind me to renew the visa on the 1st”
            </em>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {reminders.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                tz={profile.tz}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReminderRow({
  reminder,
  tz,
}: {
  reminder: ReminderItem;
  tz?: string;
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-s1">
      <p className="min-w-0 flex-1 basis-52 text-[0.9375rem] leading-relaxed text-fg">
        {reminder.text}
      </p>
      {reminder.repeat ? (
        <span className="shrink-0 rounded border border-line bg-s2 px-1.5 py-0.5 font-mono text-[0.625rem] text-fg-subtle">
          {repeatLabel(reminder.repeat)}
        </span>
      ) : null}
      <time
        dateTime={reminder.dueAt}
        className="shrink-0 font-mono text-[0.6875rem] text-fg-faint"
      >
        {dueLabel(reminder.dueAt, tz)}
      </time>
    </li>
  );
}
