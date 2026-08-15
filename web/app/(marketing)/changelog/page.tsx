import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import {
  CHANGELOG,
  CHANGE_KINDS,
  CHANGELOG_RANGE,
  formatChangeDate,
  type ChangeKind,
} from "@/lib/changelog-data";
import { SITE } from "@/lib/sections";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "What shipped, and when. Every change to Recalfy since the first thing it remembered.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "Recalfy changelog",
    description: "What shipped, and when.",
    url: `${SITE}/changelog`,
    type: "article",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    {
      "@type": "ListItem",
      position: 2,
      name: "Changelog",
      item: `${SITE}/changelog`,
    },
  ],
};

/** Muted by design: the label is a filing aid, not the point of the line. */
const KIND_STYLE: Record<ChangeKind, string> = {
  new: "border-accent/40 text-accent",
  improved: "border-line-strong text-fg-muted",
  fixed: "border-line text-fg-subtle",
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-28 sm:pt-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <header>
        <p className="eyebrow">Changelog</p>
        <h1 className="display display-fill mt-4 text-[clamp(2rem,5vw,3.25rem)]">
          What shipped, and when.
        </h1>
        <p className="mt-5 max-w-prose text-[1.0625rem] leading-relaxed text-fg-subtle">
          Small releases, most days. Nothing here is a roadmap — it is what is
          already running, from{" "}
          {formatChangeDate(CHANGELOG_RANGE.oldest)} to{" "}
          {formatChangeDate(CHANGELOG_RANGE.newest)}.
        </p>
      </header>

      {/*
        A list, not a timeline widget. The date is the heading of each entry
        and the rail is one border — a changelog is read top to bottom once
        and then never again, and anything cleverer gets in the way of that.
      */}
      <ol className="mt-14 border-l border-line">
        {CHANGELOG.map((entry, index) => (
          <Reveal
            key={`${entry.date}-${index}`}
            as="li"
            delay={Math.min(index, 3) * 0.05}
            className="relative block pb-14 pl-6 sm:pl-8"
          >
            <>
              <span
                aria-hidden
                className="absolute -left-[3.5px] top-[0.45rem] size-[7px] rounded-full bg-line-strong"
              />

              <time
                dateTime={entry.date}
                className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint"
              >
                {formatChangeDate(entry.date)}
              </time>

              <h2 className="mt-2 text-[1.25rem] font-medium tracking-[-0.01em]">
                {entry.title}
              </h2>

              {entry.body ? (
                <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-fg-subtle">
                  {entry.body}
                </p>
              ) : null}

              <ul className="mt-5 grid gap-3">
                {entry.changes.map((change) => (
                  <li key={change.text} className="flex items-start gap-3">
                    <span
                      className={`mt-[0.15rem] shrink-0 rounded-full border px-2 py-[0.1rem] font-mono text-[0.625rem] uppercase tracking-[0.08em] ${KIND_STYLE[change.kind]}`}
                    >
                      {CHANGE_KINDS[change.kind]}
                    </span>
                    <span className="text-[0.9375rem] leading-relaxed text-fg-muted">
                      {change.text}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
