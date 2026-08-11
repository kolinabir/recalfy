import { Reveal } from "@/components/motion/reveal";

export type LegalSection = {
  heading: string;
  body: React.ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <section className="relative isolate overflow-hidden pt-36 pb-24 sm:pt-44">
      <div className="shell mx-auto max-w-2xl">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display mt-5 text-[clamp(2.25rem,4.6vw,3.25rem)]">
            {title}
          </h1>
          <p className="mt-4 font-mono text-[0.75rem] tracking-wide text-fg-subtle">
            Last updated {updated}
          </p>
          <p className="mt-6 max-w-xl leading-relaxed text-fg-muted">
            {intro}
          </p>
        </Reveal>

        <div className="mt-14 space-y-10">
          {sections.map((section, i) => (
            <Reveal
              key={section.heading}
              delay={Math.min(i * 0.03, 0.3)}
              className="border-t border-line pt-8"
            >
              <h2 className="text-[1.0625rem] font-medium">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-fg-muted [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-0.5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {section.body}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
