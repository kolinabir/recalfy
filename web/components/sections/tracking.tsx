import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * The tracking capability, argued rather than listed.
 *
 * Every expense app can show a total; the claim worth making is that one word
 * decides between money spent and money planned — so the page shows that word
 * instead of describing it. The three cards underneath are the consequences,
 * not the pitch.
 */

function Said({ children }: { children: React.ReactNode }) {
  return (
    <p className="self-end rounded-lg rounded-br-sm bg-s3 px-3.5 py-2 text-[0.9375rem] text-fg-muted">
      {children}
    </p>
  );
}

function Replied({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <p
      className={cn(
        "self-start rounded-lg rounded-bl-sm px-3.5 py-2 text-[0.9375rem]",
        muted ? "bg-s2 text-fg" : "bg-accent font-medium text-accent-ink",
      )}
    >
      {children}
    </p>
  );
}

function Tell({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[0.625rem] tracking-[0.1em] text-fg-faint uppercase">
      <span aria-hidden className="h-px flex-1 bg-line" />
      {children}
      <span aria-hidden className="h-px flex-1 bg-line" />
    </p>
  );
}

const CONSEQUENCES = [
  {
    title: "A budget you set by saying it",
    body: "“keep me under 15000 a month.” That's the entire setup. Every total tells you where you stand while you can still do something about it — not on the 31st.",
  },
  {
    title: "The list closes its own loop",
    body: "Something bought off the shopping list becomes the expense it was always going to be — one record, at the price you actually paid. Nothing to reconcile later.",
  },
  {
    title: "Money isn't the only thing that counts",
    body: "“track my water, 3L a day.” Litres, gym visits, weigh-ins, pages — say what you want watched and it figures out how to count it.",
  },
];

export function Tracking() {
  return (
    <section id="tracking" className="scroll-mt-24 pb-24 lg:pb-32">
      <div className="shell">
        <Reveal
          as="header"
          className="grid gap-6 pb-12 lg:grid-cols-2 lg:items-end lg:gap-16"
        >
          <div>
            <p className="eyebrow">Money and habits</p>
            <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
              The expense tracker{" "}
              <span className="block text-fg-muted">you never open.</span>
            </h2>
          </div>
          <p className="max-w-md leading-relaxed text-fg-subtle lg:justify-self-end">
            No categories, no receipts, no Sunday spent reconciling. Say what
            you spent — two words and a number — and it keeps the running
            total.
          </p>
        </Reveal>

        <div className="grid gap-3 lg:grid-cols-2">
          <Reveal className="flex flex-col rounded-xl border border-line bg-s1 p-5">
            <Said>cucumber 250</Said>
            <Tell>past tense · the money is gone</Tell>
            <Replied>250, groceries.</Replied>
            <p className="mt-4 border-t border-line pt-4 font-mono text-[0.6875rem] tracking-wide text-fg-subtle">
              august · 4,250 of 15,000 · 28% used
            </p>
          </Reveal>

          <Reveal
            delay={0.06}
            className="flex flex-col rounded-xl border border-line bg-s1 p-5"
          >
            <Said>buy cucumber 250</Said>
            <Tell>an instruction · nothing spent yet</Tell>
            <Replied muted>Cucumber, about 250 — on your list.</Replied>
            <div className="mt-4 flex flex-col border-t border-line pt-4">
              <Said>got the cucumber, 260</Said>
              <Tell>the loop closes</Tell>
              <Replied>Marked bought — 260 on groceries.</Replied>
            </div>
          </Reveal>
        </div>

        <Reveal
          delay={0.1}
          className="mt-3 rounded-xl border border-line border-dashed p-5 text-[0.875rem] leading-relaxed text-fg-subtle"
        >
          One word apart, and the difference is the whole feature — a shopping
          list is not a ledger. When a message could go either way, it asks
          once, in one short line.
        </Reveal>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {CONSEQUENCES.map((item, i) => (
            <Reveal
              key={item.title}
              delay={0.14 + i * 0.05}
              className="rounded-xl border border-line bg-s1 p-5"
            >
              <h3 className="text-[0.9375rem] font-medium">{item.title}</h3>
              <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-fg-subtle">
                {item.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
