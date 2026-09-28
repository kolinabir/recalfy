import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { PlanTable } from "@/components/plan-table";
import { Closing } from "@/components/sections/closing";
import { Faq } from "@/components/sections/faq";
import { QUESTIONS } from "@/lib/faq-data";
import { PLANS } from "@/lib/pricing";
import { SECTIONS, SECTION_TABS, SITE } from "@/lib/sections";
import { GITHUB_URL, NPM_URL } from "@/lib/self-host-data";
import { getViewer } from "@/lib/dashboard-data";
import { tiers } from "@/lib/paddle/config";
import { visitorCountry } from "@/lib/paddle/country";
import { planForUser } from "@/lib/paddle/plan";

/**
 * Structured data for the one page Google should care about. Everything here
 * mirrors visible page content — schema that says more than the page shows is
 * how rich results get revoked.
 */
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Recalfy",
    url: SITE,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Any",
    description:
      "A personal memory that lives in your chat app. Text it facts, track what you spend, ask it anything, and it messages you first when the moment comes.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...PLANS.map((p) => p.monthly)),
      highPrice: Math.max(...PLANS.map((p) => p.monthly)),
      offerCount: PLANS.length,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: "Recalfy",
    url: SITE,
    logo: `${SITE}/icon.svg`,
    email: "knkolin9@gmail.com",
    // The same entity elsewhere: the open-source code and the installer.
    sameAs: [GITHUB_URL, NPM_URL],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    name: "Recalfy",
    url: SITE,
    publisher: { "@id": `${SITE}/#organization` },
  },
  /*
    Each section declared as a part of this page, with its own anchor URL. A
    fragment can't carry meta tags, but it can be named and described here —
    which is what makes it linkable, understood as a distinct part, and
    eligible to appear as a jump-to link under the main result.
  */
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE}/#webpage`,
    url: SITE,
    name: "Recalfy — the memory that lives in your chats",
    description:
      "Tell it once. Recalfy keeps every fact you give it, answers from memory, and speaks up at the right time — inside the chat app you already use.",
    primaryImageOfPage: `${SITE}/opengraph-image`,
    hasPart: SECTIONS.map((section) => ({
      "@type": "WebPageElement",
      "@id": `${SITE}/#${section.id}`,
      url: `${SITE}/#${section.id}`,
      name: section.name,
      description: section.description,
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
];
import { SectionHash } from "@/components/section-hash";
import { Hero } from "@/components/sections/hero";
import { GetStarted } from "@/components/sections/get-started";
import { Moments } from "@/components/sections/moments";
import { WhatItDoes } from "@/components/sections/what-it-does";

export default async function HomePage() {
  // The home page carries the same live plan table as /pricing, so it needs
  // the same two server-side facts: where the visitor is, and who they are.
  const [country, viewer] = await Promise.all([visitorCountry(), getViewer()]);
  // What they already hold, so the table can offer to manage it rather than
  // sell it again. Undefined for signed-out or unsubscribed visitors, which is
  // the only state where a checkout is the right thing to open.
  const plan = viewer ? await planForUser(viewer.id) : null;
  const current = plan?.active ? { id: plan.id, name: plan.name } : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <SectionHash sections={SECTION_TABS} suffix="Recalfy" />
      <Hero />
      {/* What it is → what it does → proof → how to start → price. The
          arguments (why no search, why it exists) and the engine live on
          /features, for the visitor who wants them. */}
      <WhatItDoes />
      <Moments />
      <GetStarted />

      <section id="pricing" className="scroll-mt-24 pb-24 lg:pb-32">
        <div className="shell">
          <Reveal as="header" className="mx-auto max-w-xl text-center">
            <p className="eyebrow">Pricing</p>
            <h2 className="display mt-5 text-[clamp(2rem,4.2vw,3rem)]">
              Cheaper than the thing{" "}
              <span className="block text-fg-muted">you forgot.</span>
            </h2>
          </Reveal>
          <div className="mt-12">
            <PlanTable
              tiers={tiers()}
              country={country}
              viewer={
                viewer ? { id: viewer.id, email: viewer.email } : undefined
              }
              current={current}
              // Bottom of a long page — Paddle can wait until it's approached.
              defer
            />
          </div>
          {/* One line, not a section: the page was cut to nine on purpose. */}
          <Reveal className="mt-8 text-center text-[0.9375rem] text-fg-muted">
            Rather run it yourself? Recalfy is open source —{" "}
            <Link
              href="/self-host"
              className="group inline-flex items-center gap-1 font-medium text-fg"
            >
              one command sets up your own copy, free
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      <Faq />
      <Closing />
    </>
  );
}
