import { Reveal } from "@/components/motion/reveal";

/**
 * A trust band, but an honest one — this is a new product with no customer
 * logos to show, and inventing them would be a lie. Architectural facts are the
 * real proof at this stage, and they're the differentiator anyway.
 */
const FACTS = [
  { value: "0", label: "embeddings stored" },
  { value: "100%", label: "of your memory read, every message" },
  { value: "1", label: "process, one database" },
  { value: "∞", label: "exports, as plain markdown" },
];

export function Proof() {
  return (
    <section className="rails">
      <div className="shell">
        <Reveal className="grid grid-cols-2 border-y border-line lg:grid-cols-4">
          {FACTS.map((fact, i) => (
            <div
              key={fact.label}
              className={[
                "px-5 py-7",
                i % 2 === 1 ? "border-l border-line" : "",
                i < 2 ? "border-b border-line lg:border-b-0" : "",
                i === 2 ? "lg:border-l lg:border-line" : "",
              ].join(" ")}
            >
              <p className="display-sm text-[1.75rem] tabular-nums">
                {fact.value}
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-snug text-fg-subtle">
                {fact.label}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
