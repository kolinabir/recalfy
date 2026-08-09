import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A filled trace with a faint one behind it: the fact that was kept, and the one
 * it replaced. The same two-mark motif appears beside every stored fact on the
 * site.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Recalfy — home"
    >
      <span aria-hidden className="relative grid size-5 place-items-center">
        <span className="absolute size-1.5 -translate-x-1.5 rounded-full bg-fg-faint/50 transition-transform duration-500 group-hover:-translate-x-2.5" />
        <span className="absolute size-2 translate-x-0.5 rounded-full bg-accent transition-transform duration-500 group-hover:translate-x-1" />
      </span>
      <span className="display text-[1.0625rem] font-semibold tracking-[-0.02em]">
        Recalfy
      </span>
    </Link>
  );
}
