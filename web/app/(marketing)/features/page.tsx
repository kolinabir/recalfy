import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { Closing } from "@/components/sections/closing";
import { FeatureGrid } from "@/components/sections/features";
import { FEATURES, FEATURE_COUNT } from "@/lib/features-data";
import { SITE } from "@/lib/sections";

export const metadata: Metadata = {
  // Built from the data, so the number can never drift from the page.
  title: `Everything Recalfy does`,
  description: `${FEATURE_COUNT} capabilities — atomic facts, supersession, unprompted reminders, spending by sentence, export and forget-on-request. A small product with very few loose ends.`,
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Everything Recalfy does",
    description: `${FEATURE_COUNT} capabilities, from atomic facts and supersession to spending by sentence.`,
    url: `${SITE}/features`,
    type: "article",
  },
};

/*
  The list described as a list. Every claim here is visible on the page —
  schema that outruns the content is how rich results get taken away.
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
        name: "Features",
        item: `${SITE}/features`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE}/features#webpage`,
    url: `${SITE}/features`,
    name: "Everything Recalfy does",
    description: `${FEATURE_COUNT} capabilities of Recalfy, the memory that lives in your chat app.`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: FEATURE_COUNT,
      itemListElement: FEATURES.map((feature, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: feature.title,
        description: feature.body,
      })),
    },
  },
];

export default function FeaturesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="relative isolate overflow-hidden pt-36 pb-12 sm:pt-44">
        <div className="shell mx-auto max-w-2xl text-center">
          <Reveal as="header">
            <p className="eyebrow">Everything in it</p>
            <h1 className="display display-fill mt-5 text-[clamp(2.25rem,4.6vw,3.25rem)] text-balance">
              Small product.{" "}
              <span className="block text-fg-muted">Very few loose ends.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-fg-muted">
              {FEATURE_COUNT} things it does, and nothing it does halfway. None
              of them need setting up.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 lg:pb-32">
        <div className="shell">
          <FeatureGrid />
        </div>
      </section>

      <Closing />
    </>
  );
}
