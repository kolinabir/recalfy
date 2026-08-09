import type { MemoryItem } from "@/lib/dashboard-data";
import { relativeDate } from "@/lib/format";

/**
 * One fact, one row — the same two-mark motif the marketing site hangs beside
 * every stored fact. List rows, not cards: memories are read as a ledger.
 */
export function MemoryRow({ memory }: { memory: MemoryItem }) {
  return (
    <li className="group flex items-baseline gap-4 px-5 py-3.5 transition-colors hover:bg-s1">
      <span aria-hidden className="relative top-[-1px] grid size-3 shrink-0 place-items-center self-center">
        <span className="absolute size-1 -translate-x-0.5 rounded-full bg-fg-faint/40" />
        <span className="absolute size-1.5 translate-x-0.5 rounded-full bg-fg-faint/70 transition-colors group-hover:bg-accent" />
      </span>
      <p className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed text-fg">
        {memory.text}
      </p>
      <span className="hidden shrink-0 font-mono text-[0.625rem] tracking-[0.08em] text-fg-faint uppercase sm:block">
        {memory.group}
      </span>
      <time
        dateTime={memory.createdAt}
        className="shrink-0 font-mono text-[0.625rem] text-fg-faint"
      >
        {relativeDate(memory.createdAt)}
      </time>
    </li>
  );
}

export function MemoryListShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {children}
    </ul>
  );
}
