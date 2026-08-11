import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { SectionHash } from "@/components/section-hash";
import { Closing } from "@/components/sections/closing";
import { EXAMPLE_COUNT, EXAMPLE_GROUPS } from "@/lib/examples-data";
import { SITE } from "@/lib/sections";

export const metadata: Metadata = {
  // Built from the data so the number can never drift from the page.
  title: `${EXAMPLE_COUNT} things you can text Recalfy`,
  description: `${EXAMPLE_COUNT} worked examples — and anything else you'd say out loud. What you text Recalfy in passing, and what comes back months later.`,
  alternates: { canonical: "/examples" },
  openGraph: {
    title: `${EXAMPLE_COUNT} things you can text Recalfy`,
    description: `What you say in passing, and what comes back months later — across ${EXAMPLE_GROUPS.length} kinds of everyday memory.`,
    url: `${SITE}/examples`,
    type: "article",
  },
};

const TABS = EXAMPLE_GROUPS.map(({ id, title }) => ({ id, name: title }));

/*
  The catalogue described as a list of named parts, each with its own anchor.
  Every claim here is visible on the page — schema that outruns the content is
  how rich results get taken away.
*/
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      {
        "@type": "ListItem",
        position: 2,
        name: "Examples",
        item: `${SITE}/examples`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE}/examples#webpage`,
    url: `${SITE}/examples`,
    name: `${EXAMPLE_COUNT} things you can text Recalfy`,
    description: `${EXAMPLE_COUNT} worked examples of what you can text Recalfy and what comes back later.`,
    hasPart: EXAMPLE_GROUPS.map((group) => ({
      "@type": "WebPageElement",
      "@id": `${SITE}/examples#${group.id}`,
      url: `${SITE}/examples#${group.id}`,
      name: group.title,
      description: group.blurb,
    })),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: EXAMPLE_GROUPS.length,
      itemListElement: EXAMPLE_GROUPS.map((group, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: group.title,
        url: `${SITE}/examples#${group.id}`,
      })),
    },
  },
];

export default function ExamplesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <SectionHash sections={TABS} suffix="Examples · Recalfy" />

      <section className="relative isolate overflow-hidden pt-36 pb-12 sm:pt-44">
        <div className="shell mx-auto max-w-3xl text-center">
          <p className="resolve eyebrow">Examples</p>
          <h1
            className="resolve display mt-5 text-[clamp(2.25rem,4.6vw,3.25rem)] text-balance"
            style={{ animationDelay: "80ms" }}
          >
            {EXAMPLE_COUNT} things you can say to it.{" "}
            <span className="block text-fg-muted">
              And anything else that comes to mind.
            </span>
          </h1>
          <p
            className="resolve mx-auto mt-6 max-w-xl leading-relaxed text-fg-muted"
            style={{ animationDelay: "160ms" }}
          >
            On the left is what you&apos;d type in passing. On the right is what
            comes back — sometimes seconds later, sometimes next winter. These{" "}
            {EXAMPLE_COUNT} aren&apos;t supported phrasings, because there is no
            such thing here. They&apos;re just the ones we wrote down.
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
              Your life doesn&apos;t look like this list — nobody&apos;s does.
              It works from whatever you actually say, in the words you&apos;d
              have used anyway, about the things only you are carrying.
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
