import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductFrame } from "@/components/product-frame";
import { RotatingWord } from "@/components/rotating-word";

/**
 * Centred statement, then the product at full width beneath it. The product
 * surface is the visual answer to the headline rather than decoration beside
 * it, so it gets the whole column.
 */
export function Hero() {
  return (
    <section className="rails blueprint relative isolate pt-32 pb-16 sm:pt-40">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <p className="resolve inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3.5 pl-1 text-[0.8125rem] text-fg-muted">
            <span className="rounded-full bg-s2 px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-accent">
              SOON
            </span>
            launching on Telegram · five more chat apps queued
          </p>

          <h1
            className="resolve display mt-7 text-[clamp(2.75rem,7vw,5rem)]"
            style={{ animationDelay: "80ms" }}
          >
            <span className="block text-fg-muted">You&apos;ll forget</span>
            <RotatingWord />
            <span className="display-fill block">Recalfy won&apos;t.</span>
          </h1>

          <p
            className="resolve mx-auto mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-fg-muted"
            style={{ animationDelay: "170ms" }}
          >
            Text it the way you&apos;d text a friend — dates, names, quotes,
            where you left things. Recalfy keeps every fact, answers from
            memory, and messages you first when the moment comes.
          </p>

          <div
            className="resolve mt-8 flex flex-wrap items-center justify-center gap-2.5"
            style={{ animationDelay: "250ms" }}
          >
            <Link
              href="/pricing"
              className="btn-primary group inline-flex h-10 items-center gap-2 px-5 text-[0.875rem] font-medium"
            >
              Start free for 14 days
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#how"
              className="btn-ghost inline-flex h-10 items-center px-5 text-[0.875rem]"
            >
              See how it remembers
            </Link>
          </div>

          <p
            className="resolve mt-5 font-mono text-[0.6875rem] tracking-wide text-fg-faint"
            style={{ animationDelay: "320ms" }}
          >
            no card · no install · no commands to learn
          </p>
        </div>

        <ProductFrame className="resolve mt-16" />
      </div>
    </section>
  );
}
