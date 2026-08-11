import type { Metadata } from "next";
import Link from "next/link";

import { SectionHead } from "@/components/dashboard/section-head";
import { Usage } from "@/components/dashboard/usage";
import {
  countThisWeek,
  getMemories,
  getReminders,
  isConnected,
  requireViewer,
} from "@/lib/dashboard-data";
import { relativeDate } from "@/lib/format";
import { planForUser } from "@/lib/paddle/plan";

export const metadata: Metadata = {
  title: "Usage",
  description: "What you are storing, against what your plan allows.",
};

/**
 * Where someone stands against their plan.
 *
 * It renders the same whether or not anything has been stored — an empty
 * memory is a legitimate answer to "how much have I used", and a page that
 * disappears until you have data is a page nobody trusts is working.
 *
 * The counts come from the same query the bot's cap counts, so this page and
 * the write that gets refused can never disagree.
 */
export default async function UsagePage() {
  const viewer = await requireViewer();
  const linked = isConnected(viewer);

  const [memories, reminders, plan] = await Promise.all([
    getMemories(viewer.id),
    getReminders(viewer.id),
    planForUser(viewer.id),
  ]);

  const thisWeek = countThisWeek(memories);
  const oldest = memories[memories.length - 1];
  const groups = countByGroup(memories);

  return (
    <div>
      <header>
        <p className="eyebrow">Usage</p>
        <h1 className="display display-fill mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          {plan.memoryCap
            ? `${memories.length.toLocaleString()} of ${plan.memoryCap.toLocaleString()}.`
            : `${memories.length.toLocaleString()} kept.`}
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] tracking-[0.06em] text-fg-subtle uppercase">
          <span
            aria-hidden
            className={
              plan.active
                ? "size-1.5 rounded-full bg-accent"
                : "size-1.5 rounded-full bg-fg-faint/60"
            }
          />
          <Link
            href="/dashboard/billing"
            className="transition-colors hover:text-fg"
          >
            {plan.active ? plan.name : "No plan"}
          </Link>
          <span className="text-fg-faint">
            ·{" "}
            {plan.memoryCap
              ? `${plan.memoryCap.toLocaleString()} memories included`
              : "unlimited memories"}
          </span>
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <section aria-label="What is filling it">
          <SectionHead
            title="By group"
            action={{ href: "/dashboard/memories", label: "All memories" }}
          />

          {groups.length === 0 ? (
            <p className="rounded-xl border border-line px-5 py-6 text-[0.875rem] leading-relaxed text-fg-subtle">
              {linked
                ? "Nothing stored yet. Tell the bot something worth keeping and it lands here."
                : "Nothing stored yet — your chat isn’t connected. "}
              {linked ? null : (
                <Link
                  href="/dashboard/telegram"
                  className="text-fg-muted underline underline-offset-4 hover:text-fg"
                >
                  Connect Telegram
                </Link>
              )}
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {groups.map(([group, count]) => (
                <li
                  key={group}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-fg">
                    {group}
                  </span>
                  {/* Share of what is stored, not of the cap: this answers
                      "what is filling my memory", which is the question you
                      ask right before deciding what to forget. */}
                  <span
                    aria-hidden
                    className="hidden h-1 w-28 overflow-hidden rounded-full bg-s2 sm:block"
                  >
                    <span
                      className="block h-full rounded-full bg-fg-faint/70"
                      style={{
                        width: `${Math.max(2, Math.round((count / memories.length) * 100))}%`,
                      }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right font-mono text-[0.75rem] text-fg-subtle tabular-nums">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-[0.8125rem] leading-relaxed text-fg-subtle">
            Only what the bot still recites counts here — corrections and
            anything you asked it to forget are excluded, exactly as they are
            when it decides whether there is room for one more.
          </p>
        </section>

        <aside className="grid content-start gap-8">
          <Usage
            held={memories.length}
            cap={plan.memoryCap}
            thisWeek={thisWeek}
            reminders={reminders.length}
            lastAt={memories[0]?.createdAt}
          />

          <section aria-label="Since the beginning">
            <SectionHead title="History" />
            <div className="rounded-xl border border-line px-4 py-4">
              <dl className="grid gap-2 font-mono text-[0.6875rem]">
                <Row
                  label="Oldest"
                  value={oldest ? relativeDate(oldest.createdAt) : "—"}
                />
                <Row
                  label="Groups"
                  value={groups.length === 0 ? "—" : String(groups.length)}
                />
                <Row
                  label="Chat"
                  value={linked ? "connected" : "not connected"}
                />
              </dl>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="tracking-[0.06em] text-fg-faint uppercase">{label}</dt>
      <dd className="text-fg-subtle tabular-nums">{value}</dd>
    </div>
  );
}

/** Groups by size, largest first — the order you would want to prune in. */
function countByGroup(
  memories: { group: string }[],
): [string, number][] {
  const counts = new Map<string, number>();
  for (const memory of memories) {
    counts.set(memory.group, (counts.get(memory.group) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
