import { Reveal } from "@/components/motion/reveal";

/*
  The product in four verbs, each shown as the exchange it actually is. This
  is the answer to "what does it do?" — the internals (facts, corrections,
  timezones) live under the hood on /features, for whoever wants them.
*/
const VERBS = [
  {
    verb: "Remembers",
    line: "Tell it anything once, the way you'd text a friend. Correct it later and the old version is replaced, not piled up.",
    said: "wifi at mum's is sunflower42",
    reply: "Saved.",
  },
  {
    verb: "Answers",
    line: "Ask in your own words, months later. It answers from everything you've told it — not from the web.",
    said: "what's the wifi at mum's?",
    reply: "sunflower42",
  },
  {
    verb: "Reminds",
    line: "Mention a time once and it messages you first when it comes, in your timezone, in the same chat.",
    said: "remind me sunday 9am to book Sara's gift",
    reply: "⏰ Book Sara's gift — her birthday's Tuesday",
  },
  {
    verb: "Tracks",
    line: "Say what you spent in two words and a number. It keeps the running total against your budget.",
    said: "lunch 340",
    reply: "340 on food — 10,410 left this month.",
  },
];

export function WhatItDoes() {
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
            <p className="eyebrow">What it does</p>
            <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
              Tell it once.{" "}
              <span className="block text-fg-muted">It takes it from there.</span>
            </h2>
          </div>
          <p className="max-w-md leading-relaxed text-fg-subtle lg:justify-self-end">
            Recalfy is a contact in Telegram. You message it like anyone else —
            no commands, no app, nothing to organise. Four things happen.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VERBS.map((item, i) => (
            <Reveal
              key={item.verb}
              delay={i * 0.05}
              className="flex flex-col rounded-xl border border-line bg-s1 p-6 transition-colors duration-500 hover:border-line-strong"
            >
              <h3 className="font-mono text-[0.6875rem] tracking-[0.16em] text-accent uppercase">
                {item.verb}
              </h3>
              <p className="mt-3 leading-relaxed text-fg-muted">{item.line}</p>

              <div className="mt-auto space-y-2 pt-6">
                <p className="ml-auto w-fit max-w-[90%] rounded-lg rounded-br-sm bg-s3 px-3 py-1.5 text-[0.8125rem] text-fg-muted">
                  {item.said}
                </p>
                <p className="w-fit max-w-[90%] rounded-lg rounded-bl-sm border border-line px-3 py-1.5 text-[0.8125rem]">
                  {item.reply}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
