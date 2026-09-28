import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductFrame } from "@/components/product-frame";

/**
 * Centred statement, then the product at full width beneath it. The product
 * surface is the visual answer to the headline rather than decoration beside
 * it, so it gets the whole column.
 */
export function Hero() {
  return (
    <section className="blueprint relative isolate pt-32 pb-16 sm:pt-40">
      <div aria-hidden className="wash" />
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <p className="resolve inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3.5 pl-1 text-[0.8125rem] text-fg-muted">
            <span className="rounded-full bg-s2 px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-accent">
              LIVE
            </span>
            now on Telegram
          </p>

          <h1
            className="resolve display mt-8 text-[clamp(3rem,7.5vw,5.5rem)] text-balance"
            style={{ animationDelay: "80ms" }}
          >
            {/* The space matters: without it the accessible name and the text
                Google reads run together as "The memorythat texts back." */}
            <span className="block text-fg-subtle">The memory</span>{" "}
            <span className="display-fill block">that texts back.</span>
          </h1>

          <p
            className="resolve mx-auto mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-fg-muted"
            style={{ animationDelay: "170ms" }}
          >
            {/* The headline is the hook; this sentence has to say what the
                thing is, in words a first-time visitor already has. */}
            Recalfy is an AI assistant in Telegram. Text it what you&apos;d
            otherwise forget — birthdays, codes, where you parked — ask for it
            whenever you need it, and it messages you first when it matters.
          </p>

          <div
            className="resolve mt-8 flex flex-wrap items-center justify-center gap-2.5"
            style={{ animationDelay: "250ms" }}
          >
            <Link
              href="/pricing"
              className="btn-primary group inline-flex h-10 items-center gap-2 px-5 text-[0.875rem] font-medium"
            >
              Start free for 7 days
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#get-started"
              className="btn-ghost inline-flex h-10 items-center px-5 text-[0.875rem]"
            >
              How to start
            </Link>
          </div>

          <p
            className="resolve mt-5 font-mono text-[0.6875rem] tracking-wide text-fg-faint"
            style={{ animationDelay: "320ms" }}
          >
            7 days free · lives in telegram · nothing to install
          </p>
        </div>

        <ProductFrame className="resolve mt-16" />
      </div>
    </section>
  );
}
