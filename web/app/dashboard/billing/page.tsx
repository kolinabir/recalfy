import type { Metadata } from "next";
import Link from "next/link";

import { requireViewer } from "@/lib/dashboard-data";
import { relativeDate } from "@/lib/format";
import { planForUser } from "@/lib/paddle/plan";
import { invoicesForUser } from "@/lib/paddle/transactions";

export const metadata: Metadata = {
  title: "Billing",
  description: "Your plan and your receipts.",
};

/** What each state means to the person reading it, not to Paddle. */
const STATE_COPY: Record<string, { label: string; detail: string }> = {
  none: {
    label: "No plan",
    detail: "Nothing is connected until you pick one.",
  },
  trialing: {
    label: "Trial",
    detail: "Your trial is running. The card is only charged when it ends.",
  },
  active: { label: "Active", detail: "Everything is on." },
  dunning: {
    label: "Payment failed",
    detail:
      "We could not charge your card. Nothing is switched off yet — update it and the retry will go through.",
  },
  "cancel-scheduled": {
    label: "Cancelling",
    detail: "You keep everything until the date below.",
  },
  "pause-scheduled": {
    label: "Pausing",
    detail: "You keep everything until the date below.",
  },
  paused: { label: "Paused", detail: "Billing and service are both stopped." },
  canceled: {
    label: "Cancelled",
    detail: "Your memory is still here, and export still works.",
  },
};

export default async function BillingPage() {
  const viewer = await requireViewer();
  const [plan, invoices] = await Promise.all([
    planForUser(viewer.id),
    invoicesForUser(viewer.id),
  ]);

  const copy = STATE_COPY[plan.state] ?? STATE_COPY.none;

  return (
    <div>
      <header>
        <p className="eyebrow">Billing</p>
        <h1 className="display display-fill mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          {plan.active ? plan.name : "No plan yet."}
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-fg-muted">
          {copy.detail}
        </p>
      </header>

      <section className="mt-8 rounded-xl border border-line bg-s1 p-7 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={
                plan.active
                  ? "size-1.5 rounded-full bg-accent"
                  : "size-1.5 rounded-full bg-fg-faint/50"
              }
            />
            <span className="eyebrow">{copy.label}</span>
          </div>

          {plan.active ? (
            <Link
              href="/api/paddle/portal"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-line px-4 text-[0.875rem] font-medium transition-colors hover:border-fg-faint"
            >
              Manage billing
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-[0.875rem] font-medium text-accent-ink"
            >
              Choose a plan
            </Link>
          )}
        </div>

        <dl className="mt-7 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-line px-3.5 py-3">
            <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-subtle uppercase">
              Plan
            </dt>
            <dd className="mt-1.5 text-[0.875rem] font-medium">{plan.name}</dd>
          </div>
          <div className="rounded-xl border border-line px-3.5 py-3">
            <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-subtle uppercase">
              Billing
            </dt>
            <dd className="mt-1.5 text-[0.875rem] font-medium">
              {plan.cycle === "month"
                ? "Monthly"
                : plan.cycle === "year"
                  ? "Yearly"
                  : "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-line px-3.5 py-3">
            <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-subtle uppercase">
              {plan.endsAt ? "Ends" : "Status"}
            </dt>
            <dd className="mt-1.5 text-[0.875rem] font-medium">
              {plan.endsAt ? relativeDate(plan.endsAt.toISOString()) : copy.label}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-line p-7 sm:p-8">
        <h2 className="text-[1rem] font-medium">Invoices</h2>

        {invoices.items.length === 0 ? (
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-muted">
            Nothing billed yet. Receipts appear here after your first payment,
            and every one is downloadable from{" "}
            <Link href="/api/paddle/portal" className="underline">
              manage billing
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {invoices.items.map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between gap-4 py-3.5"
              >
                <div>
                  <p className="text-[0.9375rem] font-medium tabular-nums">
                    {invoice.total}
                  </p>
                  <p className="mt-0.5 font-mono text-[0.6875rem] tracking-wide text-fg-subtle">
                    {invoice.billedAt
                      ? relativeDate(invoice.billedAt)
                      : "Not billed"}
                  </p>
                </div>
                <span className="font-mono text-[0.6875rem] tracking-wide text-fg-subtle uppercase">
                  {invoice.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {invoices.hasMore ? (
          <p className="mt-5 text-[0.875rem] text-fg-muted">
            Older receipts are in{" "}
            <Link href="/api/paddle/portal" className="underline">
              manage billing
            </Link>
            .
          </p>
        ) : null}
      </section>
    </div>
  );
}
