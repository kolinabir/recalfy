"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
import { QUESTIONS } from "@/lib/faq-data";


const EASE = [0.16, 1, 0.3, 1] as const;

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="rails scroll-mt-24 pb-24 lg:pb-32">
      <div className="shell grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <Reveal as="header">
          <p className="eyebrow">Before you ask</p>
          <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
            Reasonable
            <span className="block text-fg-muted">doubts.</span>
          </h2>
          <p className="mt-6 max-w-xs leading-relaxed text-fg-muted">
            You&apos;re about to hand something a running record of your life.
            These are the questions worth asking first.
          </p>
        </Reveal>

        <div className="divide-y divide-line border-y border-line">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span
                    className={cn(
                      "text-[1.0625rem] transition-colors duration-300",
                      isOpen ? "text-fg" : "text-fg-muted group-hover:text-fg",
                    )}
                  >
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg border transition-colors duration-300",
                      isOpen
                        ? "border-accent/40 text-accent"
                        : "border-line text-fg-subtle group-hover:border-line",
                    )}
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pr-10 pb-6 text-[0.9375rem] leading-relaxed text-fg-muted">
                        {item.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
