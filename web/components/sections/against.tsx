import { Reveal } from "@/components/motion/reveal";

const USUAL = [
  "Fetches the handful of notes that look most like your question",
  "“I don't work Fridays” looks identical to “I work Fridays”",
  "A question spanning four unrelated facts comes back with three",
  "When it's wrong, you're debugging a search index",
];

const OURS = [
  "Hands the model your entire memory, on every single message",
  "Negations, corrections and contradictions get read, not matched",
  "“What's coming up for Sara?” joins the birthday, the studio, the allergy and the reminder",
  "When it's wrong, you can read exactly what it saw",
];

export function Against() {
  return (
    <section className="rails relative isolate overflow-hidden py-24 lg:py-32">

      <div className="shell">
        <Reveal as="header" className="max-w-2xl">
          <p className="eyebrow">The decision underneath</p>
          <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
            There&apos;s no search box —
            <span className="block text-fg-muted">and no search either.</span>
          </h2>
          <p className="mt-6 text-[1.0625rem] leading-relaxed text-fg-muted">
            Most memory tools retrieve the notes that resemble your question.
            Resemblance is the wrong instrument for a life: it can&apos;t hear a
            correction, and it can&apos;t tell &ldquo;don&apos;t&rdquo; from
            &ldquo;do&rdquo;.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <Reveal className="rounded-xl border border-line p-8 sm:p-10">
            <h3 className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-subtle uppercase">
              Retrieval, the usual way
            </h3>
            <ul className="mt-7 space-y-4">
              {USUAL.map((item) => (
                <li key={item} className="flex gap-3.5 leading-relaxed text-fg-subtle">
                  <span
                    aria-hidden
                    className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-fg-faint/40"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={0.08}
            className="rounded-xl border border-line bg-s1 p-8  sm:p-10"
          >
            <h3 className="font-mono text-[0.6875rem] tracking-[0.16em] text-accent uppercase">
              Recalfy
            </h3>
            <ul className="mt-7 space-y-4">
              {OURS.map((item) => (
                <li key={item} className="flex gap-3.5 leading-relaxed">
                  <span
                    aria-hidden
                    className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-accent"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
