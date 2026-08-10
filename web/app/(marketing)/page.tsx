import { Reveal } from "@/components/motion/reveal";
import { PlanTable } from "@/components/plan-table";
import { Against } from "@/components/sections/against";
import { Channels } from "@/components/sections/channels";
import { Closing } from "@/components/sections/closing";
import { Faq } from "@/components/sections/faq";
import { QUESTIONS } from "@/lib/faq-data";
import { PLANS } from "@/lib/pricing";

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
    url: "https://recalfy.com",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Any",
    description:
      "A personal memory that lives in your chat app. Text it facts, ask it anything, and it messages you first when the moment comes.",
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
    url: "https://recalfy.com",
    logo: "https://recalfy.com/icon.svg",
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
import { Hero } from "@/components/sections/hero";
import { Proof } from "@/components/sections/proof";
import { How } from "@/components/sections/how";
import { Features } from "@/components/sections/features";
import { Manifesto } from "@/components/sections/manifesto";
import { Moments } from "@/components/sections/moments";

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Hero />
      <Proof />
      <How />
      <Moments />
      <Against />
      <Manifesto />
      <Features />
      <Channels />

      <section id="pricing" className="rails scroll-mt-24 pb-24 lg:pb-32">
        <div className="shell">
          <Reveal as="header" className="mx-auto max-w-xl text-center">
            <p className="eyebrow">Pricing</p>
            <h2 className="display mt-5 text-[clamp(2rem,4.2vw,3rem)]">
              Cheaper than the thing
              <span className="block text-fg-muted">you forgot.</span>
            </h2>
          </Reveal>
          <div className="mt-12">
            <PlanTable />
          </div>
        </div>
      </section>

      <Faq />
      <Closing />
    </>
  );
}
