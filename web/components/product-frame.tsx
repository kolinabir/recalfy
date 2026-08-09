"use client";

import { motion } from "motion/react";

import { useEnter } from "@/components/motion/use-enter";
import { cn } from "@/lib/utils";

type Kept = { id: string; text: string; replaces?: string };

type Message = {
  from: "you" | "recalfy";
  text: string;
  time: string;
  kept?: Kept[];
  unprompted?: boolean;
};

const THREAD: Message[] = [
  {
    from: "you",
    text: "sara's birthday is nov 4 — she loved that ceramics studio in old town",
    time: "09:14",
    kept: [
      { id: "mem_a4", text: "Sara's birthday — 4 Nov" },
      { id: "mem_a5", text: "Sara loved the ceramics studio" },
    ],
  },
  { from: "recalfy", text: "Both kept.", time: "09:14" },
  {
    from: "you",
    text: "dentist moved my cleaning to friday 11am",
    time: "11:52",
    kept: [{ id: "mem_d3", text: "Cleaning — Fri 11:00", replaces: "mem_d2" }],
  },
  { from: "recalfy", text: "Moved — Tuesday's slot is gone.", time: "11:52" },
  {
    from: "you",
    text: "remind me sunday morning to book her a class there",
    time: "16:02",
  },
  {
    from: "recalfy",
    text: "Sunday, 9:00 AM your time — I'll nudge you.",
    time: "16:02",
  },
  {
    from: "recalfy",
    text: "Book Sara a ceramics class — her birthday's Tuesday",
    time: "Sun 9:00",
    unprompted: true,
  },
];

/** The right pane is the memory document the model is handed on every message. */
const DOCUMENT = [
  { heading: "People" },
  { id: "mem_a4", text: "Sara's birthday is 4 Nov." },
  { id: "mem_a5", text: "Sara loved the ceramics studio." },
  { id: "mem_a7", text: "Dad's been eyeing an Opinel No. 8." },
  { heading: "Health" },
  { id: "mem_d2", text: "Cleaning — Tue 9:00.", dead: true },
  { id: "mem_d3", text: "Cleaning — Fri 11:00." },
  { heading: "Recent" },
  { id: "mem_c8", text: "Parked P3, row F, by the lift." },
  { id: "mem_c9", text: "Plumber's quote was 40k." },
];

const EASE = [0.16, 1, 0.3, 1] as const;
const BEAT = 0.34;

export function ProductFrame({ className }: { className?: string }) {
  const { ref, entered } = useEnter(400);

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-s1",
        className,
      )}
    >
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span aria-hidden className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-s3" />
          ))}
        </span>
        <span className="ml-1 font-mono text-[0.6875rem] text-fg-faint">
          telegram · @recalfy_bot
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[0.6875rem] text-fg-subtle">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          connected
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        {/* chat pane */}
        <div className="border-line lg:border-r">
          <ol className="space-y-2.5 p-4">
            {THREAD.map((message, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 28,
                  delay: 0.15 + i * BEAT,
                }}
                className={cn(
                  "flex",
                  message.from === "you" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-lg px-3 py-1.5",
                    message.from === "you"
                      ? "rounded-br-sm bg-s3"
                      : "rounded-bl-sm bg-s2",
                    message.unprompted && "bg-accent text-accent-ink",
                  )}
                >
                  <p className="text-[0.8125rem] leading-relaxed">
                    {message.text}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-right font-mono text-[0.625rem]",
                      message.unprompted
                        ? "text-accent-ink/60"
                        : "text-fg-faint",
                    )}
                  >
                    {message.time}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* memory pane — the artefact the model actually reads */}
        <div className="border-t border-line lg:border-t-0">
          <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
            <span className="font-mono text-[0.6875rem] text-fg-subtle">
              memory.md
            </span>
            <span className="font-mono text-[0.625rem] text-fg-faint">
              47 facts · 7.1K tokens
            </span>
          </div>

          <ul className="space-y-1.5 p-4">
            {DOCUMENT.map((row, i) =>
              row.heading ? (
                <motion.li
                  key={row.heading}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: entered ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.3 + i * 0.05 }}
                  className={cn(
                    "font-mono text-[0.625rem] tracking-[0.14em] text-fg-faint uppercase",
                    i !== 0 && "pt-3",
                  )}
                >
                  {row.heading}
                </motion.li>
              ) : (
                <motion.li
                  key={row.id}
                  initial={{ opacity: 0, x: 6 }}
                  animate={
                    entered ? { opacity: 1, x: 0 } : { opacity: 0, x: 6 }
                  }
                  transition={{
                    duration: 0.45,
                    ease: EASE,
                    delay: 0.3 + i * 0.05,
                  }}
                  className="flex items-baseline gap-2"
                >
                  <span
                    className={cn(
                      "text-[0.8125rem] leading-relaxed",
                      row.dead
                        ? "text-fg-faint line-through decoration-fg-faint/50"
                        : "text-fg-muted",
                    )}
                  >
                    {row.text}
                  </span>
                  <code className="ml-auto shrink-0 font-mono text-[0.625rem] text-fg-faint">
                    {row.id}
                  </code>
                </motion.li>
              ),
            )}
          </ul>
        </div>
      </div>

      {/* status strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line px-4 py-2.5 font-mono text-[0.625rem] text-fg-faint">
        <span>no embeddings</span>
        <span>no vector index</span>
        <span>whole memory in context</span>
        <span className="ml-auto">1 reminder scheduled</span>
      </div>
    </div>
  );
}
