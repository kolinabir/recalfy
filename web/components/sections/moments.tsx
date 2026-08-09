import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

type Moment = {
  said: string;
  gap: string;
  payoff: string;
  wide?: boolean;
};

/**
 * Breadth, shown honestly: no invented testimonials, just the product doing its
 * job across unrelated corners of a life. The time gap between the two lines is
 * the whole demonstration — anything can remember for five minutes.
 */
const MOMENTS: Moment[] = [
  {
    said: "sara's allergic to walnuts btw",
    gap: "five months later, at the restaurant",
    payoff: "Skip the pesto — it's usually made with walnuts, and Sara's allergic.",
    wide: true,
  },
  {
    said: "parked P3, row F",
    gap: "after the flight home",
    payoff: "P3, row F — by the lift.",
  },
  {
    said: "cabin wifi is bluepine2024",
    gap: "next summer",
    payoff: "bluepine2024",
  },
  {
    said: "dad kept eyeing that Opinel knife at the market",
    gap: "december, when you ask for gift ideas",
    payoff: "Dad: the Opinel No. 8 he kept picking up in Lisbon.",
    wide: true,
  },
  {
    said: "client only takes calls after 2pm her time",
    gap: "as you go to dial",
    payoff: "It's 1:15 in Denver — give it 45 minutes.",
  },
  {
    said: "tonight's rioja was great, muga something?",
    gap: "at the wine shop",
    payoff: "Muga Reserva. You loved it on 14 March.",
  },
];

export function Moments() {
  return (
    <section className="rails pb-24 lg:pb-32">
      <div className="shell">
        <Reveal as="header" className="max-w-2xl pb-12">
          <p className="eyebrow">Across a life</p>
          <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
            Too small to file.
            <span className="block text-fg-muted">Too costly to forget.</span>
          </h2>
          <p className="mt-6 max-w-lg leading-relaxed text-fg-subtle">
            None of these deserve an app, a folder, or a note you&apos;ll never
            reopen. That&apos;s the point — you say it once, mid-conversation,
            and it comes back exactly when it matters.
          </p>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MOMENTS.map((moment, i) => (
            <Reveal
              key={moment.said}
              delay={(i % 4) * 0.05}
              className={cn(
                "group flex flex-col rounded-xl border border-line bg-s1 p-5 transition-colors duration-500 hover:border-line-strong",
                moment.wide && "lg:col-span-2",
              )}
            >
              <p className="self-end rounded-lg rounded-br-sm bg-s3 px-3 py-1.5 text-[0.8125rem] text-fg-muted">
                {moment.said}
              </p>

              <p className="my-4 flex items-center gap-3 font-mono text-[0.625rem] tracking-[0.1em] text-fg-faint uppercase">
                <span aria-hidden className="h-px flex-1 bg-line" />
                {moment.gap}
                <span aria-hidden className="h-px flex-1 bg-line" />
              </p>

              <p className="mt-auto flex items-start gap-2.5 text-[0.875rem] leading-relaxed">
                <span
                  aria-hidden
                  className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-accent"
                />
                <span>{moment.payoff}</span>
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
