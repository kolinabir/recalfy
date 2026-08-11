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
        lisbon flight lands 6am on the 14th, spare sim&apos;s in my desk drawer
      </p>
      <div className="flex flex-wrap gap-2">
        <Chip>Lisbon flight lands — 14th, 06:00</Chip>
        <Chip>Spare SIM is in the desk drawer</Chip>
      </div>
    </div>
  );
}

function ReplaceVisual() {
  return (
    <div className="space-y-2.5">
      <Chip tone="dropped">Lisbon flight lands — 14th, 06:00</Chip>
      <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-subtle uppercase">
        replaced by
      </p>
      <Chip>Lisbon flight lands — 15th, 06:00</Chip>
    </div>
  );
}

function RemindVisual() {
  return (
    <div className="space-y-3">
      <p className="max-w-[17rem] rounded-lg rounded-br-sm bg-s2 px-3.5 py-2 text-[0.9375rem]">
        remind me the night before to print the boarding pass
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg rounded-bl-sm bg-accent px-3.5 py-2 text-[0.9375rem] font-medium text-accent-ink">
          Print the boarding pass
        </span>
        <span className="font-mono text-[0.6875rem] tracking-wide text-fg-subtle">
          14th, 20:00 · unprompted
        </span>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "It breaks what you said into facts",
    body: "One message usually carries two or three things — a date, a preference, a place. Each becomes its own record, so it can be corrected later without rewriting a paragraph.",
    visual: <SplitVisual />,
  },
  {
    n: "02",
    title: "Corrections replace, they don't pile up",
    body: "Say “the flight got pushed a day” and the 14th is retired, not buried. Nothing in your memory contradicts anything else — no stale answer waiting to ambush you at the airport.",
    visual: <ReplaceVisual />,
  },
  {
    n: "03",
    title: "It speaks first when it should",
    body: "Times resolve in your timezone and get read back before anything is set. Then the reminder simply arrives — as a message, in the same chat.",
    visual: <RemindVisual />,
  },
];

export function How() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 pt-10 pb-24 lg:pt-14 lg:pb-32"
    >
      <div className="shell">
        <Reveal
          as="header"
          className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-16"
        >
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
              Nothing to learn.{" "}
              <span className="block text-fg-muted">
                You talk, and it keeps up.
              </span>
            </h2>
          </div>
          <p className="max-w-md leading-relaxed text-fg-subtle lg:justify-self-end">
            No commands, no syntax, no setup. Three things happen behind every
            message you send — here they are.
          </p>
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
