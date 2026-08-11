import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton } from "@/components/google-button";
import { PLANS, priceFor } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Recalfy with Google.",
  robots: { index: false, follow: true },
};

type Search = { plan?: string; cycle?: string };

const REASSURANCE = [
  "Nothing to install — it lives in the chat app you already have",
  "Your memory exports as plain markdown, any day",
  "Cancel by asking it to cancel",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { plan: planId, cycle } = await searchParams;
  const plan = PLANS.find((p) => p.id === planId);
  const billing = cycle === "yearly" ? "yearly" : "monthly";
  const price = plan ? priceFor(plan, billing) : null;

  return (
    <section className="relative isolate overflow-hidden px-5 pt-36 pb-24 sm:pt-40">

      <div className="mx-auto w-full max-w-md">
        <div className="resolve rounded-xl border border-line bg-s1 p-8  sm:p-10">
          <h1 className="display text-[2rem]">
            {plan ? (
              <>
                Two clicks, then{" "}
                <span className="block text-accent">say something.</span>
              </>
            ) : (
              <>
                Welcome{" "}
                <span className="block text-accent">back.</span>
              </>
            )}
          </h1>

          {plan && price ? (
            <div className="mt-7 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg border border-line px-4 py-3.5">
              <span className="text-[0.9375rem] font-medium">{plan.name}</span>
              <span className="display text-[1.5rem] leading-none">
                ${price.amount}
              </span>
              <span className="font-mono text-[0.6875rem] text-fg-subtle">
                / {price.per} · 7 days free
              </span>
            </div>
          ) : null}

          <div className="mt-7">
            <GoogleButton plan={plan?.id} />
          </div>

          <p className="mt-5 text-[0.8125rem] leading-relaxed text-fg-subtle">
            We ask Google for your name and email, and nothing else. By
            continuing you agree to the{" "}
            <Link href="/terms" className="text-fg-muted underline underline-offset-4">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-fg-muted underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>
        </div>

        <ul
          className="resolve mt-8 space-y-3"
          style={{ animationDelay: "140ms" }}
        >
          {REASSURANCE.map((point) => (
            <li
              key={point}
              className="flex gap-3 text-[0.875rem] leading-relaxed text-fg-muted"
            >
              <span
                aria-hidden
                className="mt-[0.68em] size-1.5 shrink-0 rounded-full bg-accent"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <p
          className="resolve mt-8 text-center text-[0.875rem] text-fg-subtle"
          style={{ animationDelay: "200ms" }}
        >
          Not ready?{" "}
          <Link
            href="/pricing"
            className="text-fg-muted underline underline-offset-4 hover:text-fg"
          >
            Look at the plans again
          </Link>
        </p>
      </div>
    </section>
  );
}
