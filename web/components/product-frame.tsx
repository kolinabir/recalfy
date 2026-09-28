"use client";

import { ChevronLeft, Mic, Paperclip, Smile } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useEnter } from "@/components/motion/use-enter";
import { Mark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

/*
  The chat pane wears Telegram's own palette so it reads as a screenshot of the
  real app rather than a stylised illustration of one. The values live in CSS
  (the `.tg` scope in globals.css) so the mockup follows the site's light and
  dark themes the way the real client does.
*/
const TG = {
  bg: "var(--tg-bg)",
  bar: "var(--tg-bar)",
  in: "var(--tg-in)",
  out: "var(--tg-out)",
  text: "var(--tg-text)",
  dim: "var(--tg-dim)",
  link: "var(--tg-link)",
};

type Fact = { id: string; group: string; text: string };

type Step = {
  /** How long this beat holds before the next one begins, in ms. */
  hold: number;
  chip?: string;
  from?: "you" | "recalfy";
  text?: string;
  time?: string;
  unprompted?: boolean;
  typing?: boolean;
  /** Facts this beat commits to memory. */
  writes?: Fact[];
  /** A fact this beat supersedes — struck, not deleted. */
  retires?: string;
  /** A fact this beat removes outright, on request. */
  deletes?: string;
};

/** Already in memory before the demo starts — the pane is never empty. */
const EXISTING: Fact[] = [
  { id: "mem_a7", group: "People", text: "Priya's kid can't have shellfish." },
  { id: "mem_d2", group: "Health", text: "Cleaning — Tue 9:00." },
  { id: "mem_m1", group: "Money", text: "Budget — 15,000 a month." },
  { id: "mem_c8", group: "Recent", text: "Boiler service is due in March." },
  { id: "mem_c9", group: "Recent", text: "Landlord's number ends 4471." },
];

const GROUPS = [
  "People",
  "Health",
  "Money",
  "List",
  "Tracking",
  "Reminders",
  "Recent",
];

/*
  One loop of the conversation, covering the whole product in the order a real
  day would: things said in passing, a correction, money, a question asked back,
  and finally a reminder arriving on its own. Beats are paced like real
  messaging — a reply takes a moment to type, the next thing you say longer.
*/
const SCRIPT: Step[] = [
  { chip: "Today", hold: 500 },
  {
    from: "you",
    text: "sara's birthday is nov 4 — she loved that ceramics studio in old town",
    time: "09:14",
    hold: 1000,
  },
  { typing: true, hold: 1500 },
  {
    from: "recalfy",
    text: "Both kept — the birthday and the studio.",
    time: "09:14",
    hold: 2300,
    writes: [
      { id: "mem_a4", group: "People", text: "Sara's birthday is 4 Nov." },
      { id: "mem_a5", group: "People", text: "Sara loved the ceramics studio." },
    ],
  },
  {
    from: "you",
    text: "dentist moved my cleaning to friday 11am",
    time: "11:52",
    hold: 1000,
  },
  { typing: true, hold: 1300 },
  {
    from: "recalfy",
    text: "Moved — Tuesday's slot is gone.",
    time: "11:52",
    hold: 2300,
    writes: [{ id: "mem_d3", group: "Health", text: "Cleaning — Fri 11:00." }],
    retires: "mem_d2",
  },
  { from: "you", text: "lunch 340", time: "13:26", hold: 900 },
  { typing: true, hold: 1100 },
  {
    from: "recalfy",
    text: "340, food.",
    time: "13:26",
    hold: 2100,
    writes: [{ id: "mem_m2", group: "Money", text: "Lunch — 340, food." }],
  },
  {
    from: "you",
    text: "how much have I got left this month?",
    time: "13:27",
    hold: 1000,
  },
  { typing: true, hold: 1400 },
  {
    from: "recalfy",
    text: "10,410 left of 15,000 — 19 days to go, so about 550 a day.",
    time: "13:27",
    hold: 3000,
  },
  {
    from: "you",
    text: "remind me sunday morning to book her a class there",
    time: "16:02",
    hold: 1000,
  },
  { typing: true, hold: 1400 },
  {
    from: "recalfy",
    text: "Sunday, 9:00 AM your time — I'll nudge you.",
    time: "16:02",
    hold: 2500,
    writes: [
      {
        id: "mem_r1",
        group: "Reminders",
        text: "Book Sara a class — Sun 09:00.",
      },
    ],
  },
  { chip: "Sunday", hold: 900 },
  {
    from: "recalfy",
    text: "⏰ Book Sara a ceramics class — her birthday's Tuesday",
    time: "09:00",
    unprompted: true,
    hold: 3000,
  },
  { from: "you", text: "booked it, 2400", time: "09:31", hold: 1000 },
  { typing: true, hold: 1300 },
  {
    from: "recalfy",
    text: "Done — 2,400 on gifts. Reminder's closed.",
    time: "09:31",
    hold: 2400,
    writes: [
      { id: "mem_m3", group: "Money", text: "Ceramics class — 2,400, gifts." },
    ],
    retires: "mem_r1",
  },
  {
    from: "you",
    text: "anything I should know before priya comes over?",
    time: "18:40",
    hold: 1100,
  },
  { typing: true, hold: 1500 },
  {
    from: "recalfy",
    text: "Her kid can't have shellfish — you told me that in March. Nothing else on file.",
    time: "18:40",
    hold: 3200,
  },

  { chip: "Monday", hold: 900 },
  { from: "you", text: "add batteries to the list", time: "08:12", hold: 900 },
  { typing: true, hold: 1100 },
  {
    from: "recalfy",
    text: "On your list — nothing spent yet.",
    time: "08:12",
    hold: 2100,
    writes: [{ id: "mem_l1", group: "List", text: "Batteries — not bought." }],
  },
  {
    from: "you",
    text: "what else is waiting on there?",
    time: "08:13",
    hold: 1000,
  },
  { typing: true, hold: 1200 },
  {
    from: "recalfy",
    text: "Just the batteries. That's the whole list.",
    time: "08:13",
    hold: 2300,
  },
  { from: "you", text: "got them, 320", time: "19:04", hold: 900 },
  { typing: true, hold: 1200 },
  {
    from: "recalfy",
    text: "Marked bought — 320 on household. Same entry, no second record.",
    time: "19:04",
    hold: 2600,
    writes: [
      { id: "mem_m4", group: "Money", text: "Batteries — 320, household." },
    ],
    retires: "mem_l1",
  },
  {
    from: "you",
    text: "forget the landlord's number, he changed it",
    time: "19:06",
    hold: 1100,
  },
  { typing: true, hold: 1300 },
  {
    from: "recalfy",
    text: "Gone — that one record, nothing else. Send the new one when you have it.",
    time: "19:06",
    hold: 2800,
    deletes: "mem_c9",
  },
  {
    from: "you",
    text: "when's my cleaning again?",
    time: "22:31",
    hold: 1000,
  },
  { typing: true, hold: 1200 },
  {
    from: "recalfy",
    text: "Friday, 11:00 — moved from Tuesday last week.",
    time: "22:31",
    hold: 3000,
  },

  { chip: "Tuesday", hold: 900 },
  {
    from: "you",
    text: "track my water, 3L a day",
    time: "07:40",
    hold: 1000,
  },
  { typing: true, hold: 1200 },
  {
    from: "recalfy",
    text: "Tracking water — 3L a day. Just tell me as you go.",
    time: "07:40",
    hold: 2200,
    writes: [
      { id: "mem_t1", group: "Tracking", text: "Water — target 3L a day." },
    ],
  },
  { from: "you", text: "500ml", time: "09:15", hold: 800 },
  { typing: true, hold: 900 },
  {
    from: "recalfy",
    text: "0.5 of 3L today.",
    time: "09:15",
    hold: 1800,
  },
  { from: "you", text: "another litre", time: "12:48", hold: 800 },
  { typing: true, hold: 900 },
  {
    from: "recalfy",
    text: "1.5 of 3L — halfway, and it's not yet one.",
    time: "12:48",
    hold: 2400,
  },
  {
    from: "you",
    text: "tom's gone vegetarian btw",
    time: "17:20",
    hold: 1000,
  },
  { typing: true, hold: 1200 },
  {
    from: "recalfy",
    text: "Noted — I'll bring it up when you're planning food.",
    time: "17:20",
    hold: 2300,
    writes: [
      { id: "mem_a8", group: "People", text: "Tom is vegetarian." },
    ],
  },
  {
    from: "you",
    text: "remind me to take the bins out every tuesday night",
    time: "17:22",
    hold: 1100,
  },
  { typing: true, hold: 1300 },
  {
    from: "recalfy",
    text: "Every Tuesday at 21:00 — starting tonight.",
    time: "17:22",
    hold: 2400,
    writes: [
      { id: "mem_r2", group: "Reminders", text: "Bins out — Tuesdays 21:00." },
    ],
  },
  {
    from: "recalfy",
    text: "⏰ Bins out.",
    time: "21:00",
    unprompted: true,
    hold: 2800,
  },
  {
    from: "you",
    text: "what's coming up this week?",
    time: "21:04",
    hold: 1100,
  },
  { typing: true, hold: 1600 },
  {
    from: "recalfy",
    text: "Cleaning Friday 11:00, and Sara's birthday Tuesday. Tom's coming Saturday — he's vegetarian now.",
    time: "21:04",
    hold: 4200,
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

/** Telegram's double tick. */
function Ticks() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 10"
      className="h-[0.6em] w-auto"
      fill="none"
      stroke="var(--tg-tick)"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 5.5 4 8.5 10 1.5" />
      <path d="M7.5 7 9 8.5 15 1.5" />
    </svg>
  );
}

/** Curved bubble tail, mirrored for outgoing. */
function Tail({ mine }: { mine: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 11 20"
      className={cn(
        "absolute bottom-0 h-[20px] w-[11px]",
        mine ? "-right-[6px]" : "-left-[6px] -scale-x-100",
      )}
      style={{ fill: mine ? TG.out : TG.in }}
    >
      <path d="M0 0v11c0 4 2.5 7 7.5 9-4-4-4.5-7-4.5-11V0Z" />
    </svg>
  );
}

/** The three-dot indicator Telegram shows while the other side writes. */
function Typing() {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="flex justify-start pl-1.5"
    >
      <div
        className="relative flex items-center gap-1 rounded-2xl rounded-bl-[5px] px-3.5 py-2.5"
        style={{ backgroundColor: TG.in }}
      >
        <Tail mine={false} />
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full"
            style={{ backgroundColor: TG.dim }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2.5, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.16,
            }}
          />
        ))}
      </div>
    </motion.li>
  );
}

function Bubble({ step }: { step: Step }) {
  const mine = step.from === "you";
  return (
    <motion.li
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={cn("flex", mine ? "justify-end pr-1.5" : "justify-start pl-1.5")}
    >
      <div
        className={cn(
          "relative max-w-[82%] rounded-2xl px-3 py-1.5",
          mine ? "rounded-br-[5px]" : "rounded-bl-[5px]",
        )}
        style={{ backgroundColor: mine ? TG.out : TG.in, color: TG.text }}
      >
        <Tail mine={mine} />
        <p className="text-[0.8125rem] leading-[1.45]">{step.text}</p>
        <span
          className="float-right mb-[-2px] ml-2 flex translate-y-[0.4em] items-center gap-1 text-[0.625rem]"
          style={{ color: mine ? "var(--tg-out-meta)" : TG.dim }}
        >
          {step.time}
          {mine && <Ticks />}
        </span>
      </div>
    </motion.li>
  );
}

function DateChip({ label }: { label: string }) {
  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex justify-center py-1"
    >
      <span
        className="rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium"
        style={{
          backgroundColor: "var(--tg-chip)",
          color: "var(--tg-chip-ink)",
        }}
      >
        {label}
      </span>
    </motion.li>
  );
}

/**
 * A line in the memory document. A freshly written one opens its own row and
 * flashes once — the visual receipt for "this was just committed" — then settles
 * into the same weight as everything around it.
 */
function MemoryRow({
  fact,
  fresh,
  retired,
}: {
  fact: Fact;
  fresh: boolean;
  retired: boolean;
}) {
  return (
    <motion.li
      initial={fresh ? { opacity: 0, height: 0, x: 10 } : false}
      animate={{ opacity: 1, height: "auto", x: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative overflow-hidden"
    >
      {fresh && (
        <>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-[-0.5rem] inset-y-0 rounded bg-accent/20"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeOut", delay: 0.15 }}
          />
          <motion.span
            aria-hidden
            className="absolute top-0 bottom-0 -left-2 w-[2px] rounded-full bg-accent"
            initial={{ opacity: 1, scaleY: 0 }}
            animate={{ opacity: 0, scaleY: 1 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
          />
        </>
      )}

      <span className="flex items-baseline gap-2 py-[3px]">
        <span
          className={cn(
            "text-[0.8125rem] leading-relaxed transition-colors duration-700",
            retired
              ? "text-fg-faint line-through decoration-fg-faint/50"
              : "text-fg-muted",
          )}
        >
          {fact.text}
        </span>
      </span>
    </motion.li>
  );
}

export function ProductFrame({ className }: { className?: string }) {
  /*
    The conversation only begins once most of the frame is actually on screen —
    it's a ~90 second performance, and starting it while the hero is still
    filling the viewport means arriving mid-thread. The fallback is long
    because it is purely a safety net for a missing IntersectionObserver, not a
    timer anyone should reach.
  */
  const { ref, entered } = useEnter(10_000, 0.55);
  /*
    Live visibility, where `entered` is one-shot. The loop re-renders this whole
    component on every beat and never ends, so without this it keeps running
    while scrolled thousands of pixels away — animating for an audience that
    cannot see it. Pausing holds the conversation mid-thread and resumes it when
    you come back, which is also the friendlier behaviour.
  */
  const onScreen = useInView(ref as React.RefObject<Element>, { amount: 0.2 });
  const reduced = useReducedMotion();
  const [cursor, setCursor] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  // The loop: each beat schedules the next, and the last one wraps to the top.
  useEffect(() => {
    if (!entered || reduced || !onScreen) return;
    const id = setTimeout(
      () => setCursor((c) => (c + 1) % (SCRIPT.length + 1)),
      SCRIPT[cursor]?.hold ?? 700,
    );
    return () => clearTimeout(id);
  }, [entered, reduced, onScreen, cursor]);

  // Reduced motion gets the finished conversation, held still.
  const shown = reduced ? SCRIPT.length : cursor;
  const played = SCRIPT.slice(0, shown);
  const typing = SCRIPT[shown - 1]?.typing === true;

  // Memory is derived from the beats that have played — never stored twice.
  const written = played.flatMap((step) => step.writes ?? []);
  const retired = new Set(played.map((step) => step.retires).filter(Boolean));
  const deleted = new Set(played.map((step) => step.deletes).filter(Boolean));
  const facts = [...EXISTING, ...written].filter(
    (fact) => !deleted.has(fact.id),
  );
  // Anything written during the loop mounts fresh, so its arrival is animated;
  // the facts that were already there simply exist.
  const fresh = new Set(written.map((f) => f.id));
  const count = 42 + written.length - deleted.size;
  // Live counts for the status strip — the same numbers the memory shows, so
  // the strip is never telling a different story from the pane above it.
  const open = (group: string) =>
    facts.filter((f) => f.group === group && !retired.has(f.id)).length;
  const reminders = open("Reminders");
  const listItems = open("List");

  // Follow the thread the way a chat window does.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [shown]);

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-s1 shadow-[0_24px_64px_-32px_rgb(0_0_0/0.45)]",
        className,
      )}
    >
      {/*
        The row gets a definite height so neither pane can drive it. Memory
        grows all through the loop; without this the taller column stretches the
        shorter one and the chat's fixed scroller leaves a gap under the input.
      */}
      <div className="grid lg:h-[30rem] lg:grid-cols-[1.15fr_0.85fr]">
        {/* chat pane — Telegram, as it actually looks */}
        <div
          className="tg flex flex-col border-line lg:min-h-0 lg:border-r"
          style={{ backgroundColor: TG.bg }}
        >
          <div
            className="flex items-center gap-2 border-b border-black/5 px-3 py-2"
            style={{ backgroundColor: TG.bar }}
          >
            <ChevronLeft aria-hidden className="size-5" color={TG.link} />
            <div className="flex-1 leading-tight">
              <p
                className="text-[0.8125rem] font-semibold"
                style={{ color: TG.text }}
              >
                Recalfy
              </p>
              <p className="text-[0.6875rem]" style={{ color: TG.link }}>
                {typing ? "typing…" : "bot"}
              </p>
            </div>
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-full ring-1 ring-black/5"
              style={{
                backgroundColor: "var(--tg-avatar)",
                color: "var(--tg-mark)",
              }}
            >
              <Mark className="size-[18px] text-current" />
            </span>
          </div>

          <div
            ref={scroller}
            className="scroll-quiet h-[20rem] overflow-y-auto px-2.5 py-3 lg:h-auto lg:min-h-0 lg:flex-1"
          >
            <ol className="flex min-h-full flex-col justify-end space-y-1.5">
              <AnimatePresence initial={false}>
                {played.map((step, i) =>
                  step.chip ? (
                    <DateChip key={`chip-${i}`} label={step.chip} />
                  ) : step.typing ? null : (
                    <Bubble key={`msg-${i}`} step={step} />
                  ),
                )}
                {typing && <Typing key="typing" />}
              </AnimatePresence>
            </ol>
          </div>

          {/* input bar — inert, but it finishes the impression */}
          <div
            className="flex items-center gap-2.5 px-3 py-2"
            style={{ backgroundColor: TG.bar }}
          >
            <Paperclip aria-hidden className="size-[18px]" color={TG.dim} />
            <span
              className="flex flex-1 items-center justify-between rounded-full px-3 py-1.5 text-[0.8125rem]"
              style={{ backgroundColor: TG.bg, color: TG.dim }}
            >
              Message
              <Smile aria-hidden className="size-4" color={TG.dim} />
            </span>
            <Mic aria-hidden className="size-[18px]" color={TG.dim} />
          </div>
        </div>

        {/* memory pane — the artefact the model actually reads, written live */}
        <div className="flex flex-col border-t border-line lg:min-h-0 lg:border-t-0">
          <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
            <span className="text-[0.8125rem] font-medium">Memories</span>
            <motion.span
              key={count}
              initial={{ color: "var(--accent)" }}
              animate={{ color: "var(--fg-faint)" }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
              className="font-mono text-[0.625rem] tabular-nums"
            >
              {count} remembered
            </motion.span>
          </div>

          <ul className="scroll-quiet h-[20rem] space-y-1.5 overflow-y-auto p-4 lg:h-auto lg:min-h-0 lg:flex-1">
            {GROUPS.filter((group) =>
              facts.some((fact) => fact.group === group),
            ).map((group, gi) => (
              <li key={group}>
                <p
                  className={cn(
                    "font-mono text-[0.625rem] tracking-[0.14em] text-fg-faint uppercase",
                    gi !== 0 && "pt-3",
                  )}
                >
                  {group}
                </p>
                <ul className="mt-1.5">
                  <AnimatePresence initial={false}>
                    {facts
                      .filter((fact) => fact.group === group)
                      .map((fact) => (
                        <MemoryRow
                          key={fact.id}
                          fact={fact}
                          fresh={fresh.has(fact.id)}
                          retired={retired.has(fact.id)}
                        />
                      ))}
                  </AnimatePresence>
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* status strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line px-4 py-2.5 font-mono text-[0.625rem] text-fg-faint">
        
        <span className="ml-auto flex gap-5 tabular-nums">
          {listItems > 0 && (
            <span>
              {listItems} on the list
            </span>
          )}
          <span>
            {reminders === 1 ? "1 reminder" : `${reminders} reminders`} scheduled
          </span>
        </span>
      </div>
    </div>
  );
}
