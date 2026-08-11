import { Check, Minus } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { COMPARISON, type Cell } from "@/lib/plan-comparison";
import { cn } from "@/lib/utils";

/**
 * The full line-by-line comparison.
 *
 * A real <table> rather than a grid of divs: this is tabular data, and the
 * header association is what lets a screen reader say "Recurring reminders,
 * Archive, included" instead of reading a wall of loose ticks.
 *
 * The header sticks while you scan, because a comparison table is useless the
 * moment you can't remember which column you're in.
 */
function Value({ value, featured }: { value: Cell; featured?: boolean }) {
  if (value === true) {
    return (
      <>
        <Check
          aria-hidden
          className={cn(
            "mx-auto size-4",
            featured ? "text-accent" : "text-fg-muted",
          )}
          strokeWidth={2.5}
        />
        <span className="sr-only">Included</span>
      </>
    );
  }

  if (value === false) {
    return (
      <>
        <Minus aria-hidden className="mx-auto size-4 text-fg-faint/50" />
        <span className="sr-only">Not included</span>
      </>
    );
  }

  return (
    <span
      className={cn(
        "text-[0.875rem]",
        featured ? "font-medium text-fg" : "text-fg-muted",
      )}
    >
      {value}
    </span>
  );
}

export function PlanComparison() {
  return (
    <section id="compare" className="scroll-mt-24 pb-24 lg:pb-32">
      <div className="shell">
        <Reveal as="header" className="mx-auto max-w-xl pb-10 text-center">
          <p className="eyebrow">Compare</p>
          <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
            Line by line.
          </h2>
          <p className="mt-6 leading-relaxed text-fg-subtle">
            Keep is the whole product with a ceiling on it — not a hobbled
            version. Most of this table is deliberately identical.
          </p>
        </Reveal>

        {/*
          The horizontal scroll is only needed where the table doesn't fit. It
          has to be dropped above that width, because an overflow container is
          also a containing block for sticky — leave it on and the header below
          silently stops sticking.
        */}
        <Reveal className="overflow-x-auto lg:overflow-x-visible">
          {/* Fixed layout, or the plan columns size themselves to their longest
              sentence and Keep ends up a third the width of Archive. */}
          <table className="w-full min-w-[34rem] table-fixed border-collapse text-left">
            <caption className="sr-only">
              Feature comparison between the Keep and Archive plans
            </caption>

            {/* Clears the floating site header (56px tall, 16px from the top)
                rather than sliding under it. */}
            <thead className="sticky top-[4.75rem] z-10 bg-bg">
              <tr>
                <th scope="col" className="w-[46%] py-4 pr-4">
                  <span className="sr-only">Feature</span>
                </th>
                <th
                  scope="col"
                  className="w-[27%] border-b border-line px-4 py-4 text-center"
                >
                  <span className="display text-[1.125rem]">Keep</span>
                  {" "}
                  <span className="mt-0.5 block font-mono text-[0.6875rem] tracking-wide text-fg-subtle">
                    from $6/mo
                  </span>
                </th>
                <th
                  scope="col"
                  className="w-[27%] rounded-t-xl border-b border-accent/30 bg-s1 px-4 py-4 text-center"
                >
                  <span className="display text-[1.125rem]">Archive</span>
                  {" "}
                  <span className="mt-0.5 block font-mono text-[0.6875rem] tracking-wide text-accent">
                    from $14/mo
                  </span>
                </th>
              </tr>
            </thead>

            {COMPARISON.map((group) => (
              <tbody key={group.title}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={2}
                    className="pt-9 pb-3 font-mono text-[0.6875rem] tracking-[0.16em] text-fg-faint uppercase"
                  >
                    {group.title}
                  </th>
                  {/* Keeps the featured column's tint unbroken between groups. */}
                  <td aria-hidden className="bg-s1" />
                </tr>

                {group.rows.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th
                      scope="row"
                      className="py-4 pr-4 text-[0.9375rem] font-normal"
                    >
                      {row.label}{" "}
                      {row.note ? (
                        <span className="mt-1 block text-[0.8125rem] leading-snug text-fg-subtle">
                          {row.note}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-4 py-4 text-center align-middle">
                      <Value value={row.keep} />
                    </td>
                    <td className="bg-s1 px-4 py-4 text-center align-middle">
                      <Value value={row.archive} featured />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}

            <tfoot>
              <tr className="border-t border-line">
                <td />
                <td />
                <td aria-hidden className="h-4 rounded-b-xl bg-s1" />
              </tr>
            </tfoot>
          </table>
        </Reveal>
      </div>
    </section>
  );
}
