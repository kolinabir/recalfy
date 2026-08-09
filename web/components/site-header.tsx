"use client";

import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#channels", label: "Channels" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [lifted, setLifted] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setLifted(y > 12));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <motion.div
        initial={false}
        animate={{
          backgroundColor: lifted
            ? "color-mix(in oklab, var(--bg) 78%, transparent)"
            : "color-mix(in oklab, var(--bg) 0%, transparent)",
          borderColor: lifted ? "var(--line)" : "transparent",
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "mx-auto flex h-14 max-w-[72rem] items-center justify-between gap-6 rounded-lg border px-3 sm:px-4",
          lifted && "",
        )}
      >
        <Wordmark className="ml-1" />

        <nav
          className="hidden items-center md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHovered(item.href)}
              className="relative px-3.5 py-2 text-[0.875rem] text-fg-muted transition-colors hover:text-fg"
            >
              {hovered === item.href ? (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-lg bg-s2"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <span className="relative">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-[0.875rem] text-fg-muted transition-colors hover:text-fg sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="group relative overflow-hidden rounded-xl bg-fg px-4 py-2 text-[0.875rem] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
          >
            Start free
          </Link>
        </div>
      </motion.div>
    </header>
  );
}
