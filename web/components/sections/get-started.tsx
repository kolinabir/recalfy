import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";

/*
  The path from this page to a first message, stated honestly. The hero says
  "start free"; this is what that button actually leads through — including
  the card, which is better said here than discovered at checkout.
*/
const STEPS = [
  {
    title: "Sign in with Google",
    body: "One click. We ask Google for your name and email, and nothing else.",
  },
  {
    title: "Start your free week",
    body: "Pick a plan. Checkout takes a card, but nothing is charged for 7 days — cancel before then and you pay nothing.",
  },
  {
    title: "Connect Telegram",
    body: "Tap Connect Telegram on your dashboard. It opens the chat with Recalfy; press Start and say anything.",
  },
];

export function GetStarted() {
  return (
    <section id="get-started" className="scroll-mt-24 pb-24 lg:pb-32">
      <div className="shell">
        <Reveal
          as="header"
          className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-16"
        >
          <div>
            <p className="eyebrow">Getting started</p>
            <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
              Three steps.{" "}
              <span className="block text-fg-muted">About a minute.</span>
            </h2>
          </div>
          <p className="max-w-md leading-relaxed text-fg-subtle lg:justify-self-end">
            Nothing to install. Recalfy lives in Telegram, so once it&apos;s
            connected you just open the chat and talk.
          </p>
        </Reveal>

        <ol className="mt-14 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal
              as="li"
              key={step.title}
              delay={i * 0.06}
              className="rounded-xl border border-line p-6 sm:p-7"
            >
              <span className="font-mono text-[0.75rem] tracking-[0.16em] text-accent">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-[1.0625rem] font-medium">{step.title}</h3>
              <p className="mt-2.5 leading-relaxed text-fg-muted">{step.body}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/pricing"
            className="btn-primary group inline-flex h-10 items-center gap-2 px-5 text-[0.875rem] font-medium"
          >
            Start free for 7 days
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/self-host"
            className="text-[0.875rem] text-fg-muted transition-colors hover:text-fg"
          >
            Or run your own copy, free →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
