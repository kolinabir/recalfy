import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import {
  CHANGELOG,
  CHANGE_KINDS,
  CHANGELOG_RANGE,
  entryId,
  formatChangeDate,
  type ChangeKind,
} from "@/lib/changelog-data";
import { SITE } from "@/lib/sections";

export const metadata: Metadata = {
  // The template appends "· Recalfy", so the brand is not repeated here.
  title: "Changelog — every update, newest first",
  description: `What shipped in Recalfy and when — ${CHANGELOG.length} releases from ${formatChangeDate(CHANGELOG_RANGE.oldest)} to ${formatChangeDate(CHANGELOG_RANGE.newest)}. New features, improvements and fixes to the memory that lives in your chats.`,
  alternates: {
    canonical: "/changelog",
    // Discoverable as a feed without a link in the body of the page.
    types: { "application/rss+xml": `${SITE}/changelog/rss.xml` },
  },
  openGraph: {
    title: "Recalfy changelog — every update, newest first",
    description: `What shipped in Recalfy and when. ${CHANGELOG.length} releases, newest first.`,
    url: `${SITE}/changelog`,
    type: "article",
  },
  // Without these the card falls back to the site-wide pair, which says
  // nothing about the page someone was actually sent.
  twitter: {
    title: "Recalfy changelog — every update, newest first",
    description: `What shipped in Recalfy and when. ${CHANGELOG.length} releases, newest first.`,
  },
};

/*
  Two objects, both describing what is actually on the page.

  The list is the page — a reader sees every entry, its date and its
  description — so it is safe to declare. Nothing here claims a rating, an
  author or an image the page does not show: schema that outruns the content
  is how rich results get taken away.
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
        name: "Changelog",
        item: `${SITE}/changelog`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE}/changelog#webpage`,
    url: `${SITE}/changelog`,
    name: "Recalfy changelog",
    description: "What shipped in Recalfy, and when.",
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", "@id": `${SITE}#website`, url: SITE },
    about: {
      "@type": "SoftwareApplication",
      name: "Recalfy",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Telegram, WhatsApp, Web",
      url: SITE,
    },
    dateModified: CHANGELOG_RANGE.newest,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: CHANGELOG.length,
      itemListElement: CHANGELOG.map((entry, position) => ({
        "@type": "ListItem",
        position: position + 1,
        item: {
          "@type": "CreativeWork",
          name: entry.title,
          datePublished: entry.date,
          url: `${SITE}/changelog#${entryId(entry)}`,
          description:
            entry.body ?? entry.changes.map((change) => change.text).join(" "),
        },
      })),
    },
  },
];

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
            className="relative block scroll-mt-28 pb-14 pl-6 sm:pl-8"
          >
            <span id={entryId(entry)} className="sr-only" />
            <>
              <span
                aria-hidden
                className="absolute -left-[3.5px] top-[0.45rem] size-[7px] rounded-full bg-line-strong"
              />

              <a
                href={`#${entryId(entry)}`}
                className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint transition-colors hover:text-fg-muted"
              >
                <time dateTime={entry.date}>{formatChangeDate(entry.date)}</time>
              </a>

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

      {/*
        A changelog is the end of a road otherwise: people arrive from a
        search, read one entry and leave. These are the three pages that
        answer "so what is it, then".
      */}
      <Reveal className="rounded-xl border border-line px-6 py-6">
        <h2 className="text-[1.0625rem] font-medium">Newer here?</h2>
        <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-fg-subtle">
          Recalfy is a memory that lives in your chat app — you text it the
          things you would otherwise forget, and it answers months later. See{" "}
          <Link href="/examples" className="text-fg-muted underline underline-offset-4 hover:text-fg">
            what people text it
          </Link>
          , what it{" "}
          <Link href="/pricing" className="text-fg-muted underline underline-offset-4 hover:text-fg">
            costs
          </Link>
          , or follow this page as a{" "}
          <a
            href="/changelog/rss.xml"
            className="text-fg-muted underline underline-offset-4 hover:text-fg"
          >
            feed
          </a>
          .
        </p>
      </Reveal>
    </div>
  );
}
