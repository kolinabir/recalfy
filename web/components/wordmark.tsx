import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The knot: an open ring with the gap tied off by a single amber knot — the
 * string around a finger, reduced to its essence. The ring is one continuous
 * stroke (nothing added, nothing lost); the knot is the one fact that's held.
 * On hover the knot cinches slightly tighter, as if pulled.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0 text-fg", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="41 9"
      />
      <circle
        cx="19.03"
        cy="8.94"
        r="2.3"
        className="fill-accent transition-transform duration-500 origin-[19.03px_8.94px] group-hover:scale-90"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Recalfy — home"
    >
      <Mark className="size-5" />
      <span className="display text-[1.0625rem] font-semibold tracking-[-0.02em]">
        Recalfy
      </span>
    </Link>
  );
}
