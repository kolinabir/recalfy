import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * The 404, for `notFound()` and for any URL that matches no route at all —
 * the root `not-found` catches both.
 *
 * It carries the header and footer itself rather than inheriting them: the
 * marketing chrome lives on the `(marketing)` route group, and this file sits
 * above it in the root layout. Without them a mistyped URL would be a dead end
 * with nothing to click, which is the one thing a 404 must never be.
 *
 * No `metadata` export — Next only reads one from `global-not-found`, and it
 * already injects `noindex` for anything answering 404. The layout's title
 * template covers the tab.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="blueprint relative isolate pt-36 pb-24 sm:pt-44">
          <div aria-hidden className="wash" />
          <div className="shell">
            <div className="mx-auto max-w-xl text-center">
              <Reveal>
                <p className="eyebrow">Error 404</p>
                <h1 className="display mt-6 text-[clamp(2.5rem,6vw,4rem)] text-balance">
                  <span className="block text-fg-subtle">This one</span>{" "}
                  <span className="display-fill block">it doesn&apos;t remember.</span>
                </h1>
                <p className="mx-auto mt-7 max-w-md text-[1.0625rem] leading-relaxed text-fg-muted">
                  The page isn&apos;t here — moved, mistyped, or never written.
                  Your memory is untouched; only this address is missing.
                </p>
              </Reveal>

              <Reveal delay={0.06}>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
                  <Link
                    href="/"
                    className="btn-primary inline-flex h-10 items-center gap-2 px-5 text-[0.875rem] font-medium"
                  >
                    Back to the start
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-10 items-center rounded-xl border border-line px-5 text-[0.875rem] font-medium text-fg-muted transition-colors hover:text-fg"
                  >
                    Your dashboard
                  </Link>
                </div>
              </Reveal>

              {/* The likely destinations, so a wrong URL costs one click. */}
              <Reveal delay={0.12}>
                <nav
                  aria-label="Popular pages"
                  className="mt-14 border-t border-line pt-8"
                >
                  <p className="eyebrow">Try one of these</p>
                  <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[0.875rem]">
                    {LINKS.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/examples", label: "Examples" },
  { href: "/pricing", label: "Pricing" },
  { href: "/dashboard/telegram", label: "Connect Telegram" },
];
