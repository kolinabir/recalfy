import type { Metadata } from "next";
import Link from "next/link";

import { ConnectChat } from "@/components/connect-chat";
import { MemoryListShell, MemoryRow } from "@/components/dashboard/memory-row";
import { SectionHead } from "@/components/dashboard/section-head";
import { Usage } from "@/components/dashboard/usage";
import {
  countThisWeek,
  getBotProfile,
  getMemories,
  isConnected,
  getReminders,
  pickResurfaced,
  requireViewer,
  type MemoryItem,
  type ReminderItem,
} from "@/lib/dashboard-data";
import { channelConfig } from "@/lib/channel-config";
import { dueLabel, relativeDate, repeatLabel } from "@/lib/format";
import { type Plan, planForUser } from "@/lib/paddle/plan";

export const metadata: Metadata = {
  title: "Overview",
  description: "Your Recalfy memory at a glance.",
};

export default async function OverviewPage() {
  const viewer = await requireViewer();
  const firstName = viewer.name?.trim().split(" ")[0];

  if (!isConnected(viewer)) {
    // The connect widget is what a plan buys, so this branch has to know about
    // billing too — it is the first screen a new account lands on.
    return (
      <NotConnected firstName={firstName} plan={await planForUser(viewer.id)} />
    );
  }

  const [memories, reminders, profile, plan] = await Promise.all([
    getMemories(viewer.id),
    getReminders(viewer.id),
    getBotProfile(viewer.id),
    planForUser(viewer.id),
  ]);

  const thisWeek = countThisWeek(memories);

  return (
    <div>
      <header>
        <p className="eyebrow">Overview</p>
        <h1 className="display display-fill mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          {firstName ? `Hello, ${firstName}.` : "Hello."}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="flex items-center gap-2 text-[0.875rem] text-fg-muted">
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            Connected
            {memories[0] ? (
              <span className="text-fg-faint">
                · last memory {relativeDate(memories[0].createdAt)}
              </span>
            ) : null}
          </p>
          {/* The count used to live here too. Usage owns it now — the same
              number in two places is one of them going stale. */}
          <Link
            href="/dashboard/billing"
            className="font-mono text-[0.6875rem] tracking-[0.06em] text-fg-faint uppercase transition-colors hover:text-fg-muted"
          >
            {plan.active ? plan.name : "No plan"}
            {plan.endsAt ? " · ending" : ""}
          </Link>
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        {memories.length === 0 ? (
          <FirstForward />
        ) : (
          <section aria-label="Recent memories">
            <SectionHead
              title="Recent"
              action={{ href: "/dashboard/memories", label: "All memories" }}
            />
            <MemoryListShell>
              {memories.slice(0, 7).map((memory) => (
                <MemoryRow key={memory.id} memory={memory} />
              ))}
            </MemoryListShell>

            <Resurfaced memories={memories} />
          </section>
        )}

        <aside className="grid content-start gap-8">
          <Usage
            held={memories.length}
            cap={plan.memoryCap}
            thisWeek={thisWeek}
            reminders={reminders.length}
            lastAt={memories[0]?.createdAt}
          />

          <section aria-label="Upcoming reminders">
            <SectionHead
              title="Coming up"
              action={{ href: "/dashboard/reminders", label: "All" }}
            />
            {reminders.length === 0 ? (
              <p className="rounded-xl border border-line px-4 py-5 text-[0.8125rem] leading-relaxed text-fg-subtle">
                Nothing scheduled. Tell the bot{" "}
                <em className="not-italic text-fg-muted">
                  “remind me Friday at 9”
                </em>{" "}
                and it lands here.
              </p>
            ) : (
              <ul className="grid gap-2">
                {reminders.slice(0, 3).map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    tz={profile.tz}
                  />
                ))}
              </ul>
            )}
          </section>

          {profile.brief?.enabled ? (
            <section aria-label="Daily brief">
              <SectionHead title="Daily brief" />
              <p className="rounded-xl border border-line px-4 py-5 text-[0.8125rem] leading-relaxed text-fg-subtle">
                Arrives in your chat at{" "}
                <span className="font-mono text-fg-muted">
                  {String(profile.brief.hour).padStart(2, "0")}:
                  {String(profile.brief.minute).padStart(2, "0")}
                </span>
                {profile.tz ? (
                  <> · {profile.tz.split("/").pop()?.replace("_", " ")}</>
                ) : null}
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ReminderCard({
  reminder,
  tz,
}: {
  reminder: ReminderItem;
  tz?: string;
}) {
  return (
    <li className="rounded-xl border border-line px-4 py-3.5">
      <p className="text-[0.875rem] leading-snug text-fg">{reminder.text}</p>
      <p className="mt-1.5 font-mono text-[0.625rem] text-fg-faint">
        {dueLabel(reminder.dueAt, tz)}
        {reminder.repeat ? ` · ${repeatLabel(reminder.repeat)}` : ""}
      </p>
    </li>
  );
}

function Resurfaced({ memories }: { memories: MemoryItem[] }) {
  const pick = pickResurfaced(memories);
  if (!pick) return null;

  return (
    <section aria-label="From your memory" className="mt-8">
      <SectionHead title="From your memory" />
      <div className="rounded-xl border border-line bg-s1 px-5 py-5">
        <p className="text-[0.9375rem] leading-relaxed text-fg">{pick.text}</p>
        <p className="mt-2.5 font-mono text-[0.625rem] text-fg-faint">
          {pick.group} · saved {relativeDate(pick.createdAt)}
        </p>
      </div>
    </section>
  );
}

/** Connected, zero memories: the next step is one forward away. */
function FirstForward() {
  return (
    <div className="mt-10 rounded-xl border border-line bg-s1 p-8 sm:p-10">
      <h2 className="display-sm text-[1.25rem]">You&apos;re connected.</h2>
      <p className="mt-3 max-w-prose leading-relaxed text-fg-muted">
        Forward any message to the bot — or just tell it something worth keeping
        — and it appears here within seconds. Try{" "}
        <em className="not-italic text-fg">
          “the wifi password at the studio is duckpond42”
        </em>
        .
      </p>
      <SampleRows />
    </div>
  );
}

/** The pre-connection page: the empty dashboard is the onboarding. */
function NotConnected({ firstName, plan }: { firstName?: string; plan: Plan }) {
  const telegram = channelConfig("telegram");
  const paid = plan.active;

  return (
    <div>
      <p className="eyebrow">{paid ? "One link left" : "One step left"}</p>
      <h1 className="display display-fill mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">
        {firstName ? `Hello, ${firstName}.` : "Hello."}
      </h1>

      {/*
        Someone who has already paid should see it on the first screen they
        land on. Without this the pre-connection page looks identical whether
        the money went through or not, which is the moment people ask support
        whether they were charged.
      */}
      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] tracking-[0.06em] text-fg-subtle uppercase">
        <span
          aria-hidden
          className={
            paid
              ? "size-1.5 rounded-full bg-accent"
              : "size-1.5 rounded-full bg-fg-faint/60"
          }
        />
        <Link
          href="/dashboard/billing"
          className="transition-colors hover:text-fg"
        >
          {paid ? plan.name : "No plan"}
        </Link>
        {paid ? (
          <span className="text-fg-faint">
            {plan.state === "trialing" ? " · trial running" : ""} ·{" "}
            {plan.memoryCap
              ? `${plan.memoryCap.toLocaleString()} memories`
              : "unlimited memories"}
          </span>
        ) : null}
      </p>
      <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-fg-muted">
        {paid
          ? "Recalfy lives in your Telegram chat — this dashboard is where you look things up later. Connect the two and everything you tell the bot starts appearing here."
          : "Recalfy lives in your Telegram chat — this dashboard is where you look things up later. Pick a plan and you can connect the two straight after."}
      </p>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          paid
            ? ([
                "Connect",
                "Press Start in the chat — that proves the account is yours.",
              ] as const)
            : ([
                "Choose a plan",
                "Monthly or yearly, cancel by saying so. Seven days free.",
              ] as const),
          [
            "Forward anything",
            "Messages, notes, addresses, codes. One fact, one row.",
          ],
          ["Find it here", "Search the whole memory, or just ask the bot."],
        ].map(([title, body], index) => (
          <li key={title} className="rounded-xl border border-line px-5 py-5">
            <p className="font-mono text-[0.625rem] text-fg-faint">
              0{index + 1}
            </p>
            <p className="mt-2 text-[0.9375rem] font-medium">{title}</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-subtle">
              {body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {paid ? (
          <ConnectChat channel="telegram" address={telegram.address} />
        ) : (
          <div className="max-w-xl rounded-xl border border-line bg-s1 p-6">
            <p className="text-[0.9375rem] font-medium">A plan comes first.</p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-fg-muted">
              Connecting a chat is what a subscription buys. Nothing is charged
              for seven days, and everything you have already told the bot stays
              exactly where it is.
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-[0.875rem] font-medium text-accent-ink"
            >
              See plans
            </Link>
          </div>
        )}
      </div>

      <div className="mt-12">
        <p className="eyebrow mb-3">What it will look like</p>
        <SampleRows />
      </div>
    </div>
  );
}

/** Greyed sample rows — the stream, before there is a stream. */
function SampleRows() {
  const samples = [
    ["Sara's birthday is March 14th", "People"],
    ["Parking spot at the airport: level 3, row F", "Errands"],
    ["Dentist moved to the Rosewood building, second floor", "Health"],
  ];

  return (
    <ul
      aria-hidden
      className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line opacity-55 select-none"
    >
      {samples.map(([text, group]) => (
        <li key={text} className="flex items-baseline gap-4 px-5 py-3.5">
          <span className="relative top-[-1px] grid size-3 shrink-0 place-items-center self-center">
            <span className="absolute size-1 -translate-x-0.5 rounded-full bg-fg-faint/40" />
            <span className="absolute size-1.5 translate-x-0.5 rounded-full bg-fg-faint/70" />
          </span>
          <p className="min-w-0 flex-1 text-[0.9375rem] text-fg-muted">
            {text}
          </p>
          <span className="shrink-0 font-mono text-[0.625rem] tracking-[0.08em] text-fg-faint uppercase">
            {group}
          </span>
        </li>
      ))}
    </ul>
  );
}
