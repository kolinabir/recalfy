import { Reveal } from "@/components/motion/reveal";
import { PlanTable } from "@/components/plan-table";
import { Against } from "@/components/sections/against";
import { Channels } from "@/components/sections/channels";
import { Closing } from "@/components/sections/closing";
import { Faq } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { Proof } from "@/components/sections/proof";
import { How } from "@/components/sections/how";
import { Features } from "@/components/sections/features";
import { Manifesto } from "@/components/sections/manifesto";
import { Moments } from "@/components/sections/moments";

export default function HomePage() {
  return (
    <>
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
