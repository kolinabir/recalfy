import { Reveal } from "@/components/motion/reveal";

/**
 * A point-of-view section. Every product in this category has one, and it's the
 * part that can't be copied — the argument for why the thing exists.
 */
export function Manifesto() {
  return (
    <section id="why" className="scroll-mt-24 pb-24 lg:pb-32">
      <div className="shell">
        <div className="border-y border-line py-20 lg:py-28">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Why this exists</p>
            <p className="display mt-8 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.15]">
              You are not bad at remembering.{" "}
              <span className="block text-fg-muted">
                You&apos;re holding hundreds of small things that were never
                meant to live in a head.
              </span>
            </p>
            <p className="mx-auto mt-10 max-w-xl leading-relaxed text-fg-subtle">
              Every other tool asks you to file things first — open the app,
              pick the folder, tag the note. That work is why the note never
              gets written. Here, you just say the thing where you&apos;re
              already talking.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
