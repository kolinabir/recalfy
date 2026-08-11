import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PlanComparison } from "@/components/plan-comparison";
import { PlanTable } from "@/components/plan-table";
import { Closing } from "@/components/sections/closing";
import { Faq } from "@/components/sections/faq";
import { getViewer } from "@/lib/dashboard-data";
import { tiers } from "@/lib/paddle/config";
import { visitorCountry } from "@/lib/paddle/country";
import { planForUser } from "@/lib/paddle/plan";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Two plans, from $6 a month. Seven days free, refunds within fourteen days, and your memory exports as plain markdown any day you like.",
};

const ASSURANCES = [
  {
    title: "Seven days free, then fourteen to change your mind",
    body: "Nothing is charged during the trial, and any payment is refundable for fourteen days. No survey, no retention call.",
  },
  {
    title: "Cancel in a sentence",
    body: "Tell it to cancel and it cancels. No retention flow, no three-step confirmation.",
  },
  {
    title: "Your memory leaves with you",
    body: "Export everything as plain markdown at any point — including after you stop paying.",
  },
];

export default async function PricingPage() {
  // Both are read here, on the server, and handed down: the country because
  // only the edge knows it, the viewer so checkout can prefill an email the
  // client is never asked to supply.
  const [country, viewer] = await Promise.all([visitorCountry(), getViewer()]);
  // What they already hold, so the table can offer to manage it rather than
  // sell it again. Undefined for signed-out or unsubscribed visitors, which is
  // the only state where a checkout is the right thing to open.
  const plan = viewer ? await planForUser(viewer.id) : null;
  const current = plan?.active ? { id: plan.id, name: plan.name } : undefined;

  return (
    <>
      <section className="relative isolate overflow-hidden pt-36 pb-14 sm:pt-44">
        <div className="shell mx-auto max-w-2xl text-center">
          <p className="resolve eyebrow">Pricing</p>
          <h1
            className="resolve display mt-5 text-[clamp(2.5rem,5.4vw,3.75rem)]"
            style={{ animationDelay: "80ms" }}
          >
            Pay for the memory,{" "}
            <span className="block text-fg-muted">not for the seat.</span>
          </h1>
          <p
            className="resolve mx-auto mt-6 max-w-lg leading-relaxed text-fg-muted"
            style={{ animationDelay: "160ms" }}
          >
            One person, one memory, one price. No usage meter to watch and no
            per-message billing that makes you hesitate before telling it
            something.
          </p>
        </div>
      </section>

      <section className="pb-24 lg:pb-28">
        <div className="shell">
          <PlanTable
            tiers={tiers()}
            country={country}
            viewer={viewer ? { id: viewer.id, email: viewer.email } : undefined}
            current={current}
          />
        </div>
      </section>

      <PlanComparison />

      <section className="pb-24 lg:pb-32">
        <div className="shell grid gap-4 md:grid-cols-3">
          {ASSURANCES.map((item, i) => (
            <Reveal
              key={item.title}
              delay={i * 0.06}
              className="rounded-xl border border-line p-8"
            >
              <h2 className="text-[1rem] font-medium">{item.title}</h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-muted">
                {item.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <Faq />
      <Closing />
    </>
  );
}
