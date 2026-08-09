"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    q: "Who can read my memories?",
    a: "You, and the model that answers you. Nothing is used for training, nothing is shared, and there's no team dashboard looking over your shoulder. Ask for an export and you get plain markdown — the same thing the model reads, with no proprietary format between you and your own facts.",
  },
  {
    q: "What happens if I stop paying?",
    a: "Your memory stays put for 90 days and you can export all of it at any point in that window. Nothing is deleted the moment a card fails, and nothing is held hostage to make you resubscribe.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. You add it inside the chat app you already have open, and that's the whole setup — no client, no notification settings to negotiate. Reminders arrive as messages, because that's what they are.",
  },
  {
    q: "How is this different from writing myself notes?",
    a: "A note is something you have to remember to go and read. Recalfy reads itself, reconciles things you said months apart, and speaks first when a time you mentioned once actually comes around.",
  },
  {
    q: "Can it get things wrong?",
    a: "It can. When it schedules something it reads the resolved time back before committing, so a misheard “at 5” is caught immediately. And because you can read your whole memory, a wrong answer is something you can see the cause of rather than guess at.",
  },
  {
    q: "Is there a free trial?",
    a: "Fourteen days on either plan, no card up front. If you'd rather not have an account at all, the codebase is yours to run — self-hosting is a real option here, not a footnote.",
  },
];

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
