import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { CommandBlock } from "@/components/command-block";
import { Reveal } from "@/components/motion/reveal";
import { SITE } from "@/lib/sections";
import { PLANS } from "@/lib/pricing";
import {
  COMMANDS,
  COSTS,
  DEFINITION,
  DESIGN_URL,
  GITHUB_URL,
  GUIDE_URL,
  HOSTED,
  INSTALL_COMMAND,
  MODELS,
  NEEDS,
  NPM_URL,
  QUESTIONS,
  SELF_HOSTED,
  SERVER_INSTALL_COMMAND,
  STEPS,
  TROUBLE,
  UPDATED,
  VERSION,
} from "@/lib/self-host-data";

export const metadata: Metadata = {
  // Absolute: the words people search for, not the site's title template.
  title: {
    absolute: "Self-Host Recalfy: Open-Source AI Memory for Telegram",
  },
  description:
    "Run your own Recalfy for free. One command — npx recalfy — sets up an open-source AI memory assistant in Telegram with Docker, any OpenAI-compatible model or Ollama. No domain or HTTPS needed.",
  alternates: {
    canonical: "/self-host",
    // The same guide as plain Markdown, for AI agents that would rather not
    // parse a page. Advertised here so they can find it from the HTML.
    types: { "text/markdown": "/self-host.md" },
  },
  openGraph: {
    title: "Self-host Recalfy — one command, two keys",
    description:
      "Open source under the AGPL. Your own AI memory in Telegram, on your own machine. No domain or HTTPS needed.",
    url: `${SITE}/self-host`,
    type: "article",
    modifiedTime: `${UPDATED}T12:00:00Z`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Self-host Recalfy — one command, two keys",
    description:
      "Open source under the AGPL. Your own AI memory in Telegram, on your own machine.",
  },
};

/*
  The setup described as the steps the page actually shows. Every step and
  requirement here is visible below — schema that outruns the page is how rich
  results get taken away.
*/
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      {
        "@type": "ListItem",
        position: 2,
        name: "Self-host",
        item: `${SITE}/self-host`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE}/self-host#webpage`,
    url: `${SITE}/self-host`,
    name: "Self-Host Recalfy: Open-Source AI Memory for Telegram",
    description: DEFINITION,
    dateModified: UPDATED,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE}/#website` },
    about: { "@id": `${SITE}/self-host#software` },
    publisher: { "@id": `${SITE}/#organization` },
  },
  /*
    The software itself, free when self-hosted. No aggregateRating: Google
    wants real ratings for a rich result, and there are none to show yet —
    invented ones would cost more than the snippet is worth. This is here so
    engines know what the thing is, where its code lives, and its licence.
  */
  {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "SoftwareSourceCode"],
    "@id": `${SITE}/self-host#software`,
    name: "Recalfy",
    description: DEFINITION,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Linux, macOS, Windows (Docker)",
    softwareVersion: VERSION,
    license: "https://www.gnu.org/licenses/agpl-3.0.html",
    isAccessibleForFree: true,
    codeRepository: GITHUB_URL,
    programmingLanguage: "TypeScript",
    runtimePlatform: "Node.js",
    downloadUrl: NPM_URL,
    installUrl: `${SITE}/self-host`,
    url: `${SITE}/self-host`,
    sameAs: [GITHUB_URL, NPM_URL],
    offers: [
      { "@type": "Offer", name: "Self-hosted", price: 0, priceCurrency: "USD" },
      ...PLANS.map((plan) => ({
        "@type": "Offer",
        name: `Hosted — ${plan.name}`,
        price: plan.monthly,
        priceCurrency: "USD",
        url: `${SITE}/pricing`,
      })),
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to self-host Recalfy",
    description: DEFINITION,
    totalTime: "PT3M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: 0 },
    tool: NEEDS.map((need) => ({ "@type": "HowToTool", name: need.title })),
    step: STEPS.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
      url: `${SITE}/self-host#setup`,
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
];

function SectionHeading({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  /** Phrased the way people ask, since headings are what answers get matched to. */
  title: string;
  aside?: string;
}) {
  return (
    <Reveal
      as="header"
      // Two columns only when there is a side note to fill the second.
      className={`grid gap-4 lg:items-end lg:gap-16 ${aside ? "lg:grid-cols-2" : ""}`}
    >
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display mt-4 text-[clamp(1.625rem,3vw,2.25rem)]">
          {title}
        </h2>
      </div>
      {aside && (
        <p className="max-w-md leading-relaxed text-fg-subtle lg:justify-self-end">
          {aside}
        </p>
      )}
    </Reveal>
  );
}

export default function SelfHostPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="relative isolate overflow-hidden pt-36 pb-16 sm:pt-44">
        <div className="shell mx-auto max-w-2xl text-center">
          <Reveal as="header">
            <p className="eyebrow">Open source · AGPL-3.0</p>
            <h1 className="display display-fill mt-5 text-[clamp(2.25rem,4.6vw,3.25rem)] text-balance">
              Self-host Recalfy.{" "}
              <span className="block text-fg-muted">One command, two keys.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-fg-muted">
              {DEFINITION}
            </p>
            <p className="mt-5 font-mono text-[0.75rem] tracking-wide text-fg-subtle">
              v{VERSION} · Updated{" "}
              <time dateTime={UPDATED}>
                {new Date(`${UPDATED}T12:00:00Z`).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mx-auto mt-9 max-w-md">
            <CommandBlock command={INSTALL_COMMAND} />
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.875rem]">
              <a
                href={GITHUB_URL}
                className="inline-flex items-center gap-1 text-fg-muted transition-colors hover:text-fg"
              >
                Source on GitHub
                <ArrowUpRight className="size-3.5" />
              </a>
              <a
                href={GUIDE_URL}
                className="inline-flex items-center gap-1 text-fg-muted transition-colors hover:text-fg"
              >
                Full guide
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="requirements" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Before you start"
            title="What you need to self-host Recalfy"
            aside="Nothing to sign up for here. Your keys stay on your machine, in a file only you can read."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {NEEDS.map((need, i) => (
              <Reveal
                key={need.title}
                delay={i * 0.05}
                className="rounded-xl border border-line p-6 sm:p-7"
              >
                <h3 className="font-medium">{need.title}</h3>
                <p className="mt-2.5 leading-relaxed text-fg-muted">
                  {need.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="setup" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Setup · about three minutes"
            title="How to self-host Recalfy, in four steps"
          />
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal
                as="li"
                key={step.title}
                delay={i * 0.05}
                className="rounded-xl border border-line bg-s1 p-6 sm:p-7"
              >
                <span className="font-mono text-[0.75rem] tracking-[0.16em] text-accent">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-medium">{step.title}</h3>
                <p className="mt-2.5 leading-relaxed text-fg-muted">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </ol>

          <Reveal className="mt-10 max-w-2xl">
            <p className="leading-relaxed text-fg-muted">
              On a fresh Linux server, this installs Docker and Node first, then
              runs the same setup:
            </p>
            <CommandBlock command={SERVER_INSTALL_COMMAND} className="mt-4" />
          </Reveal>
        </div>
      </section>

      <section id="models" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="shell">
          <SectionHeading
            eyebrow="The model"
            title="Which AI model should you use?"
            aside="Recalfy saves facts and sets reminders by calling tools. A model that answers in prose instead says “got it” and saves nothing — so pick one that's good at it."
          />
          <Reveal className="mt-10 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[34rem] text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-line font-mono text-[0.6875rem] tracking-[0.16em] text-fg-subtle uppercase">
                  <th className="px-6 py-4 font-normal">Provider</th>
                  <th className="px-6 py-4 font-normal">Start with</th>
                  <th className="px-6 py-4 font-normal">Why</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((row) => (
                  <tr key={row.provider} className="border-b border-line last:border-0">
                    <td className="px-6 py-4 font-medium">{row.provider}</td>
                    <td className="px-6 py-4 font-mono text-[0.8125rem] text-fg-muted">
                      {row.model}
                    </td>
                    <td className="px-6 py-4 text-fg-muted">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section id="cost" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Running costs"
            title="What does it cost to run?"
            aside="A fact is about 15 tokens, and the whole memory goes into every prompt, where it is cached. So the model bill grows with how much you've told it, and stays small."
          />
          <Reveal className="mt-10 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[30rem] text-left text-[0.9375rem]">
              <tbody>
                {COSTS.map((row) => (
                  <tr key={row.item} className="border-b border-line last:border-0">
                    <th scope="row" className="w-2/5 px-6 py-4 font-medium">
                      {row.item}
                    </th>
                    <td className="px-6 py-4 text-fg-muted">{row.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <Reveal className="mt-4 text-[0.8125rem] text-fg-subtle">
            Model figures are from the measurements in{" "}
            <a href={DESIGN_URL} className="underline underline-offset-4 hover:text-fg">
              Recalfy&apos;s design notes
            </a>
            ; other providers price differently.
          </Reveal>
        </div>
      </section>

      <section id="commands" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Day to day"
            title="Six commands you might ever need"
          />
          <Reveal className="mt-10 grid gap-x-10 gap-y-1 rounded-xl border border-line p-6 sm:p-8 md:grid-cols-2">
            {COMMANDS.map((row) => (
              <div
                key={row.command}
                className="flex flex-col gap-1 border-b border-line py-3.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 md:[&:nth-last-child(2)]:border-0"
              >
                <code className="font-mono text-[0.8125rem] text-fg">
                  {row.command}
                </code>
                <span className="text-[0.9375rem] text-fg-muted">{row.does}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="hosted-vs-self-hosted" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Which one?"
            title="Hosted or self-hosted?"
            aside="Same bot, same memory model, same reminders. The difference is who keeps it running."
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <Reveal className="rounded-xl border border-line p-8 sm:p-10">
              <h3 className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-subtle uppercase">
                Hosted on recalfy.com
              </h3>
              <ul className="mt-7 space-y-4">
                {HOSTED.map((item) => (
                  <li key={item} className="flex gap-3.5 leading-relaxed text-fg-muted">
                    <span
                      aria-hidden
                      className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-fg-faint/40"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="group mt-8 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium"
              >
                See plans
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Reveal>

            <Reveal
              delay={0.08}
              className="rounded-xl border border-line bg-s1 p-8 sm:p-10"
            >
              <h3 className="font-mono text-[0.6875rem] tracking-[0.16em] text-accent uppercase">
                Self-hosted
              </h3>
              <ul className="mt-7 space-y-4">
                {SELF_HOSTED.map((item) => (
                  <li key={item} className="flex gap-3.5 leading-relaxed">
                    <span
                      aria-hidden
                      className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href={GITHUB_URL}
                className="group mt-8 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium"
              >
                Get the code
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="shell">
          <SectionHeading eyebrow="Questions" title="Self-hosting Recalfy: common questions" />
          <div className="mt-10 grid gap-x-10 md:grid-cols-2">
            {QUESTIONS.map((item, i) => (
              <Reveal
                as="article"
                key={item.q}
                delay={Math.min(i * 0.03, 0.2)}
                className="border-t border-line py-6"
              >
                <h3 className="font-medium">{item.q}</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{item.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="troubleshooting" className="scroll-mt-24 pb-24 lg:pb-32">
        <div className="shell">
          <SectionHeading
            eyebrow="If something's off"
            title="Troubleshooting"
            aside="Anything not covered here: open an issue on GitHub with the logs, keys removed."
          />
          <div className="mt-10 grid gap-x-10 md:grid-cols-2">
            {TROUBLE.map((item, i) => (
              <Reveal
                key={item.q}
                delay={i * 0.04}
                className="border-t border-line py-6"
              >
                <h3 className="font-medium">{item.q}</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{item.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
