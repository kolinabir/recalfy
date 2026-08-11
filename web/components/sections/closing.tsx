import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";

export function Closing() {
  return (
    <section className="rails relative isolate overflow-hidden pb-28 lg:pb-36">

      <div className="shell">
        <div className="hairline" />
        <Reveal className="pt-20 text-center lg:pt-28">
          <h2 className="display display-fill mx-auto max-w-3xl text-[clamp(2.25rem,5.2vw,3.75rem)]">
            Say it once.
            <span className="block text-fg-muted">
              Stop carrying it around.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-md leading-relaxed text-fg-muted">
            Seven days free, and fourteen more to change your mind. Bring one week of the things you keep meaning
            to write down, and see whether you still need to.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-[0.9375rem] font-medium text-accent-ink transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
            >
              Start free
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-xl px-5 text-[0.9375rem] text-fg-muted transition-colors duration-300 hover:text-fg"
            >
              I already have an account
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
