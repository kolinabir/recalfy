import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { EXAMPLE_COUNT } from "@/lib/examples-data";
import { cn } from "@/lib/utils";

type Moment = {
  said: string;
  gap: string;
  payoff: string;
  wide?: boolean;
};

/**
 * Breadth, shown honestly: no invented testimonials, just the product doing its
 * job across unrelated corners of a life. The time gap between the two lines is
 * the whole demonstration — anything can remember for five minutes.
 */
const MOMENTS: Moment[] = [
  {
    said: "mum moved to flat 3, not 5 — she keeps having to correct people",
    gap: "eleven months later, addressing her card",
    payoff: "Flat 3. She moved from 5 last spring — post keeps going astray.",
    wide: true,
  },
  {
    said: "hotel safe code is 8812",
    gap: "on checkout morning",
    payoff: "8812",
  },
  {
    said: "boiler pressure should sit at 1.5",
    gap: "next winter, when it cuts out",
    payoff: "1.5 bar — top it up until the needle's there.",
  },
  {
    said: "raj's wife defends her PhD in june, he's nervous for her",
    gap: "when you next run into him",
    payoff: "Ask about Nadia's defence — it was June. He was nervous for her.",
    wide: true,
  },
  {
    said: "client only takes calls after 2pm her time",
    gap: "as you go to dial",
    payoff: "It's 1:15 in Denver — give it 45 minutes.",
  },
  {
    said: "tonight's rioja was great, muga something?",
    gap: "at the wine shop",
    payoff: "Muga Reserva. You loved it on 14 March.",
  },
];

export function Moments() {
  return (
    <section id="examples" className="scroll-mt-24 pb-24 lg:pb-32">
      <div className="shell">
        <Reveal
          as="header"
          className="grid gap-6 pb-12 lg:grid-cols-2 lg:items-end lg:gap-16"
        >
          <div>
            <p className="eyebrow">Across a life</p>
            <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
              Too small to file.{" "}
              <span className="block text-fg-muted">Too costly to forget.</span>
            </h2>
          </div>
          <div className="max-w-md lg:justify-self-end">
            <p className="leading-relaxed text-fg-subtle">
              None of these deserve an app or a folder. You say it once,
              mid-conversation, and it comes back exactly when it matters.
            </p>
            <Link
              href="/examples"
              className="group mt-4 inline-flex items-center gap-1.5 text-[0.875rem] text-fg-muted transition-colors hover:text-fg"
            >
              See all {EXAMPLE_COUNT} examples
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MOMENTS.map((moment, i) => (
            <Reveal
              key={moment.said}
              delay={(i % 4) * 0.05}
              className={cn(
                "group flex flex-col rounded-xl border border-line bg-s1 p-5 transition-colors duration-500 hover:border-line-strong",
                moment.wide && "lg:col-span-2",
              )}
            >
              <p className="self-end rounded-lg rounded-br-sm bg-s3 px-3 py-1.5 text-[0.8125rem] text-fg-muted">
                {moment.said}
              </p>

              <p className="my-4 flex items-center gap-3 font-mono text-[0.625rem] tracking-[0.1em] text-fg-faint uppercase">
                <span aria-hidden className="h-px flex-1 bg-line" />
                {moment.gap}
                <span aria-hidden className="h-px flex-1 bg-line" />
              </p>

              <p className="mt-auto flex items-start gap-2.5 text-[0.875rem] leading-relaxed">
                <span
                  aria-hidden
                  className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-accent"
                />
                <span>{moment.payoff}</span>
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
