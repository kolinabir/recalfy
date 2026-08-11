import { Reveal } from "@/components/motion/reveal";
import { PlanTable } from "@/components/plan-table";
import { Against } from "@/components/sections/against";
import { Channels } from "@/components/sections/channels";
import { Closing } from "@/components/sections/closing";
import { Faq } from "@/components/sections/faq";
import { QUESTIONS } from "@/lib/faq-data";
import { PLANS } from "@/lib/pricing";
import { SECTIONS, SECTION_TABS, SITE } from "@/lib/sections";
import { getViewer } from "@/lib/dashboard-data";
import { tiers } from "@/lib/paddle/config";
import { visitorCountry } from "@/lib/paddle/country";

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
    name: "Recalfy",
    url: SITE,
    logo: `${SITE}/icon.svg`,
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
import { How } from "@/components/sections/how";
import { Features } from "@/components/sections/features";
import { Manifesto } from "@/components/sections/manifesto";
import { Moments } from "@/components/sections/moments";
import { Tracking } from "@/components/sections/tracking";

export default async function HomePage() {
  // The home page carries the same live plan table as /pricing, so it needs
  // the same two server-side facts: where the visitor is, and who they are.
  const [country, viewer] = await Promise.all([visitorCountry(), getViewer()]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <SectionHash sections={SECTION_TABS} suffix="Recalfy" />
      <Hero />
      <How />
      <Moments />
      <Tracking />
      <Against />
      <Manifesto />
      <Features />
      <Channels />

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
            />
          </div>
        </div>
      </section>

      <Faq />
      <Closing />
    </>
  );
}
