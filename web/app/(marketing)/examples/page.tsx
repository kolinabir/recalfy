import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { SectionHash } from "@/components/section-hash";
import { Closing } from "@/components/sections/closing";
import { EXAMPLE_COUNT, EXAMPLE_GROUPS } from "@/lib/examples-data";

export const metadata: Metadata = {
  title: "Examples",
  description: `${EXAMPLE_COUNT} things you can text Recalfy — dates, people, codes, spending, lists, habits and reminders — and exactly what comes back later.`,
};

const IDS = EXAMPLE_GROUPS.map((group) => group.id);

export default function ExamplesPage() {
  return (
    <>
      <SectionHash ids={IDS} />

      <section className="relative isolate overflow-hidden pt-36 pb-12 sm:pt-44">
        <div className="shell mx-auto max-w-2xl text-center">
          <p className="resolve eyebrow">Examples</p>
          <h1
            className="resolve display mt-5 text-[clamp(2.5rem,5.4vw,3.75rem)]"
            style={{ animationDelay: "80ms" }}
          >
            {EXAMPLE_COUNT} things you can
            <span className="block text-fg-muted">say to it today.</span>
          </h1>
          <p
            className="resolve mx-auto mt-6 max-w-lg leading-relaxed text-fg-muted"
            style={{ animationDelay: "160ms" }}
          >
            None of these need a command, a format, or a category. On the left is
            what you&apos;d type in passing. On the right is what comes back —
            sometimes seconds later, sometimes next winter.
          </p>
        </div>
      </section>

      {/* Jump list — a table of contents for a page that is deliberately long. */}
      <section className="pb-16">
        <div className="shell">
          <Reveal className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_GROUPS.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="rounded-full border border-line px-3.5 py-1.5 text-[0.8125rem] text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                {group.title}
              </a>
            ))}
          </Reveal>
        </div>
      </section>

      {EXAMPLE_GROUPS.map((group) => (
        <section
          key={group.id}
          id={group.id}
          className="scroll-mt-24 pb-20 lg:pb-28"
        >
          <div className="shell">
            <Reveal
              as="header"
              className="grid gap-5 border-t border-line pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"
            >
              <h2 className="display display-fill text-[clamp(1.75rem,3.2vw,2.375rem)]">
                {group.title}
              </h2>
              <p className="max-w-xl leading-relaxed text-fg-subtle">
                {group.blurb}
              </p>
            </Reveal>

            <ul className="mt-10 grid gap-3 md:grid-cols-2">
              {group.examples.map((example, i) => (
                <Reveal
                  key={example.said}
                  as="li"
                  delay={(i % 2) * 0.05}
                  className="flex flex-col rounded-xl border border-line bg-s1 p-5 transition-colors duration-500 hover:border-line-strong"
                >
                  <p className="self-end rounded-lg rounded-br-sm bg-s3 px-3 py-1.5 text-[0.8125rem] text-fg-muted">
                    {example.said}
                  </p>

                  <p className="my-4 flex items-center gap-3 font-mono text-[0.625rem] tracking-[0.1em] text-fg-faint uppercase">
                    <span aria-hidden className="h-px flex-1 bg-line" />
                    {example.when}
                    <span aria-hidden className="h-px flex-1 bg-line" />
                  </p>

                  <p className="mt-auto flex items-start gap-2.5 text-[0.875rem] leading-relaxed">
                    <span
                      aria-hidden
                      className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>{example.back}</span>
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="pb-24 lg:pb-32">
        <div className="shell">
          <Reveal className="rounded-xl border border-line border-dashed p-8 text-center">
            <p className="mx-auto max-w-xl leading-relaxed text-fg-muted">
              None of this is a fixed list. There are no supported phrasings and
              no commands underneath — you say the thing however you&apos;d say
              it, and it works out what you meant.
            </p>
            <Link
              href="/pricing"
              className="btn-primary group mt-7 inline-flex h-10 items-center gap-2 px-5 text-[0.875rem] font-medium"
            >
              Start free for 7 days
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      <Closing />
    </>
  );
}
