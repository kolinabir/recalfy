import { Reveal } from "@/components/motion/reveal";

/**
 * A point-of-view section. Every product in this category has one, and it's the
 * part that can't be copied — the argument for why the thing exists.
 */
export function Manifesto() {
  return (
    <section className="rails pb-24 lg:pb-32">
      <div className="shell">
        <div className="border-y border-line py-20 lg:py-28">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Why this exists</p>
            <p className="display mt-8 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.15]">
              You are not bad at remembering.
              <span className="block text-fg-muted">
                You are holding several hundred small obligations that were never
                meant to be held at once — and the moment one of them slips, it
                costs you a late fee, an apology, or a friendship you meant to
                keep warm.
              </span>
            </p>
            <p className="mx-auto mt-10 max-w-xl leading-relaxed text-fg-subtle">
              Every tool built for this so far asked you to file things first:
              open the app, pick the folder, write the note, tag it. That work is
              the reason the note never got written. So the only version of this
              worth building is one where you say the thing, in the place
              you&apos;re already talking, and never do anything else.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
