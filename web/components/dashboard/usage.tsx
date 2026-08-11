import Link from "next/link";

import { SectionHead } from "@/components/dashboard/section-head";
import { relativeDate } from "@/lib/format";

/**
 * What the account is using, against what it is allowed.
 *
 * A meter, not a dashboard: one bar and four numbers. The counts come from the
 * same query the bot's cap counts — live facts only, corrections and forgotten
 * rows excluded — so this figure and the one that refuses a write can never
 * disagree. Quoting a different number from the one enforced would be worse
 * than showing nothing.
 *
 * The bar is deliberately absent on an unlimited plan. A meter with no ceiling
 * is decoration, and drawing one at 0% would imply a limit that is not there.
 */
export function Usage({
  held,
  cap,
  thisWeek,
  reminders,
  lastAt,
}: {
  held: number;
  cap: number | null;
  thisWeek: number;
  reminders: number;
  lastAt?: string;
}) {
  const pct = cap ? Math.min(100, Math.round((held / cap) * 100)) : null;
  // Only speak up near the ceiling. A bar that is always amber teaches people
  // to ignore it, and at 12% there is nothing to do about it anyway.
  const tight = pct !== null && pct >= 80;

  return (
    <section aria-label="Usage">
      <SectionHead
        title="Usage"
        action={{ href: "/dashboard/billing", label: "Plan" }}
      />
      <div className="rounded-xl border border-line px-4 py-4">
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[1.125rem] text-fg tabular-nums">
            {held.toLocaleString()}
          </span>
          <span className="font-mono text-[0.6875rem] text-fg-subtle">
            {cap ? `of ${cap.toLocaleString()}` : "unlimited"}
          </span>
        </p>
        <p className="mt-1 text-[0.8125rem] text-fg-muted">
          {held === 1 ? "memory" : "memories"} kept
        </p>

        {pct !== null ? (
          <div
            role="meter"
            aria-valuenow={held}
            aria-valuemin={0}
            aria-valuemax={cap ?? undefined}
            aria-label="Memories used"
            className="mt-3.5 h-1 overflow-hidden rounded-full bg-s2"
          >
            <div
              className={
                tight
                  ? "h-full rounded-full bg-accent"
                  : "h-full rounded-full bg-fg-faint/70"
              }
              // Hairline minimum, so "a few facts" is visible rather than
              // reading as nothing stored at all.
              style={{ width: `${Math.max(pct, held > 0 ? 2 : 0)}%` }}
            />
          </div>
        ) : null}

        {tight ? (
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-fg-muted">
            Nearly full. Ask the bot to forget what you no longer need, or{" "}
            <Link
              href="/dashboard/billing"
              className="text-fg underline underline-offset-4"
            >
              move to Archive
            </Link>
            .
          </p>
        ) : null}

        <dl className="mt-4 grid gap-2 border-t border-line pt-3.5 font-mono text-[0.6875rem]">
          <Stat label="This week" value={thisWeek === 0 ? "—" : `+${thisWeek}`} />
          <Stat label="Reminders" value={reminders === 0 ? "—" : String(reminders)} />
          <Stat
            label="Last saved"
            value={lastAt ? relativeDate(lastAt) : "—"}
          />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="tracking-[0.06em] text-fg-faint uppercase">{label}</dt>
      <dd className="text-fg-subtle tabular-nums">{value}</dd>
    </div>
  );
}
