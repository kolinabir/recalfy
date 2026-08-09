import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

function Chip({
  children,
  tone = "kept",
}: {
  children: React.ReactNode;
  tone?: "kept" | "dropped";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.8125rem]",
        tone === "kept"
          ? "border-line bg-s2 text-fg"
          : "border-line bg-transparent text-fg-subtle line-through",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "kept" ? "bg-accent" : "bg-fg-faint/50",
        )}
      />
      {children}
    </span>
  );
}

function SplitVisual() {
  return (
    <div className="space-y-3">
      <p className="max-w-sm rounded-lg rounded-br-sm bg-s2 px-3.5 py-2 text-[0.9375rem]">
        sara&apos;s birthday is nov 4 — she loved that ceramics studio
      </p>
      <div className="flex flex-wrap gap-2">
        <Chip>Sara&apos;s birthday — 4 Nov</Chip>
        <Chip>Sara loved the ceramics studio</Chip>
      </div>
    </div>
  );
}

function ReplaceVisual() {
  return (
    <div className="space-y-2.5">
      <Chip tone="dropped">Cleaning — Tue 9:00</Chip>
      <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-subtle uppercase">
        replaced by
      </p>
      <Chip>Cleaning — Fri 11:00</Chip>
    </div>
  );
}

function RemindVisual() {
  return (
    <div className="space-y-3">
      <p className="max-w-[17rem] rounded-lg rounded-br-sm bg-s2 px-3.5 py-2 text-[0.9375rem]">
        remind me sunday to book her a class there
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg rounded-bl-sm bg-accent px-3.5 py-2 text-[0.9375rem] font-medium text-accent-ink">
          Book Sara a ceramics class
        </span>
        <span className="font-mono text-[0.6875rem] tracking-wide text-fg-subtle">
          Sun 9:00 · unprompted
        </span>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "It breaks what you said into facts",
    body: "One message usually carries two or three separate things — a date, a preference, a place. Each becomes its own record, which is what makes a memory editable later instead of a paragraph you have to rewrite.",
    visual: <SplitVisual />,
  },
  {
    n: "02",
    title: "Corrections replace, they don't pile up",
    body: "Say “it moved to Friday” and Tuesday is retired, not buried underneath. Nothing in your memory contradicts anything else in it — so there's no stale answer waiting to ambush you in six months.",
    visual: <ReplaceVisual />,
  },
  {
    n: "03",
    title: "It speaks first when it should",
    body: "Times resolve in your timezone and get read back before anything is set, so a misheard time is caught while you can still fix it. Then the reminder simply arrives — as a message, in the same chat.",
    visual: <RemindVisual />,
  },
];

export function How() {
  return (
    <section id="how" className="rails scroll-mt-24 pt-10 pb-24 lg:pt-14 lg:pb-32">
      <div className="shell">
        <Reveal as="header" className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
            Nothing to learn.
            <span className="block text-fg-muted">
              You talk, and it keeps up.
            </span>
          </h2>
        </Reveal>

        <div className="mt-14 divide-y divide-line border-y border-line">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.n}
              as="article"
              delay={i * 0.06}
              className="group grid gap-8 py-10 transition-colors duration-500 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-14"
            >
              <div className="flex gap-6">
                <span className="font-mono text-[0.75rem] text-fg-subtle transition-colors duration-500 group-hover:text-accent">
                  {step.n}
                </span>
                <div>
                  <h3 className="display text-[clamp(1.375rem,2.2vw,1.75rem)]">
                    {step.title}
                  </h3>
                  <p className="mt-3.5 max-w-md leading-relaxed text-fg-muted">
                    {step.body}
                  </p>
                </div>
              </div>
              <div className="lg:pl-4">{step.visual}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
