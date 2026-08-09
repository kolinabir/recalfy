"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { PLANS, SELF_HOST, priceFor } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Cycle = "monthly" | "yearly";

const EASE = [0.16, 1, 0.3, 1] as const;

export function PlanTable() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Billing cycle"
          className="relative flex items-center gap-0.5 rounded-xl border border-line bg-s1 p-1"
        >
          {(
            [
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly · 2 months free" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCycle(option.value)}
              aria-pressed={cycle === option.value}
              className={cn(
                "relative rounded-lg px-4 py-2 text-[0.875rem] transition-colors duration-300",
                cycle === option.value
                  ? "text-fg"
                  : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              {cycle === option.value ? (
                <motion.span
                  layoutId="cycle-pill"
                  className="absolute inset-0 rounded-lg bg-s2"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid items-start gap-4 lg:grid-cols-2">
        {PLANS.map((plan) => {
          const price = priceFor(plan, cycle);
          return (
            <section
              key={plan.id}
              className={cn(
                "relative overflow-hidden rounded-xl border p-8 transition-colors duration-500 sm:p-10",
                plan.featured
                  ? "border-accent/30 bg-s1 "
                  : "border-line hover:border-line",
              )}
            >

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="display text-[1.5rem]">{plan.name}</h3>
                  <p className="mt-2 text-[0.9375rem] text-fg-muted">
                    {plan.tagline}
                  </p>
                </div>
                {plan.featured ? (
                  <span className="rounded-full bg-accent/15 px-3 py-1 font-mono text-[0.6875rem] tracking-wide text-accent">
                    Most kept
                  </span>
                ) : null}
              </div>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="display overflow-hidden text-[2.75rem] leading-none tabular-nums">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={price.amount}
                      initial={{ y: "0.6em", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "-0.6em", opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="inline-block"
                    >
                      ${price.amount}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="font-mono text-[0.75rem] text-fg-subtle">
                  / {price.per}
                </span>
              </div>

              <dl className="mt-8 grid grid-cols-3 gap-2">
                {plan.limits.map((limit) => (
                  <div
                    key={limit.label}
                    className="rounded-xl border border-line px-3.5 py-3"
                  >
                    <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-subtle uppercase">
                      {limit.label}
                    </dt>
                    <dd className="mt-1.5 text-[0.875rem] font-medium">
                      {limit.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-8 space-y-3.5">
                {plan.includes.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3.5 text-[0.9375rem] leading-relaxed text-fg-muted"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-[0.68em] size-1.5 shrink-0 rounded-full",
                        plan.featured ? "bg-accent" : "bg-fg-faint/40",
                      )}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/login?plan=${plan.id}&cycle=${cycle}`}
                className={cn(
                  "mt-9 inline-flex h-11 w-full items-center justify-center rounded-xl text-[0.9375rem] font-medium transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]",
                  plan.featured
                    ? "bg-accent text-accent-ink"
                    : "border border-line text-fg hover:border-fg-faint",
                )}
              >
                {plan.cta}
              </Link>
            </section>
          );
        })}
      </div>

      <section className="mt-4 flex flex-col gap-6 rounded-xl border border-line p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xs">
          <h3 className="display text-[1.25rem]">{SELF_HOST.name}</h3>
          <p className="mt-2 text-[0.9375rem] text-fg-muted">
            {SELF_HOST.tagline}
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-3 lg:max-w-2xl lg:flex-1">
          {SELF_HOST.points.map((point) => (
            <li
              key={point}
              className="rounded-lg border border-line px-4 py-3.5 text-[0.8125rem] leading-relaxed text-fg-muted"
            >
              {point}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
