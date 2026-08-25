import Link from "next/link";

import { Wordmark } from "@/components/wordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/examples", label: "Examples" },
      { href: "/#tracking", label: "Money and habits" },
      { href: "/features", label: "Features" },
      { href: "/#channels", label: "Channels" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#approach", label: "Why no search" },
      { href: "/#why", label: "Why this exists" },
      { href: "/#faq", label: "FAQ" },
      { href: "/changelog", label: "Changelog" },
      { href: "/login", label: "Sign in" },
      { href: "mailto:hello@recalfy.com", label: "hello@recalfy.com" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refunds", label: "Refunds" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="shell grid gap-12 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-4 text-[0.875rem] leading-relaxed text-fg-muted">
            A memory that lives where you already talk — for people who&apos;d
            rather not hold it all in their head.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-subtle uppercase">
              {column.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[0.875rem] text-fg-muted transition-colors hover:text-fg"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shell flex flex-col gap-2 border-t border-line py-6 font-mono text-[0.6875rem] tracking-wide text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Recalfy</p>
        <p>Your memories are yours. Export or delete them any day.</p>
      </div>
    </footer>
  );
}
