"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import type { MemoryItem } from "@/lib/dashboard-data";
import { relativeDate } from "@/lib/format";
import { maskSecret } from "@/lib/mask-secret";

/**
 * One fact, one row — the same two-mark motif the marketing site hangs beside
 * every stored fact. List rows, not cards: memories are read as a ledger.
 *
 * A row carrying a credential is masked. `revealable` decides whether it can
 * be un-masked here: the memories page, where you went looking for it, says
 * yes; the overview, which you land on rather than choose, does not — a
 * password has no business being on the first screen after sign-in. The eye
 * links there instead, so the row is never a dead end.
 */
export function MemoryRow({
  memory,
  revealable = false,
}: {
  memory: MemoryItem;
  revealable?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  const masked = maskSecret(memory.text);
  const secret = masked !== memory.text;
  const shown = secret && !revealed ? masked : memory.text;

  return (
    <li className="group flex items-baseline gap-4 px-5 py-3.5 transition-colors hover:bg-s1">
      <span aria-hidden className="relative top-[-1px] grid size-3 shrink-0 place-items-center self-center">
        <span className="absolute size-1 -translate-x-0.5 rounded-full bg-fg-faint/40" />
        <span className="absolute size-1.5 translate-x-0.5 rounded-full bg-fg-faint/70 transition-colors group-hover:bg-accent" />
      </span>
      <p className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed text-fg">
        {shown}
      </p>

      {secret ? (
        <RevealToggle
          revealable={revealable}
          revealed={revealed}
          onToggle={() => setRevealed((was) => !was)}
        />
      ) : null}

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

/**
 * Always drawn on a masked row, never on hover alone: a control that appears
 * only under the pointer is a control nobody finds on a phone, and the dots
 * on their own read as a rendering fault rather than a decision.
 */
function RevealToggle({
  revealable,
  revealed,
  onToggle,
}: {
  revealable: boolean;
  revealed: boolean;
  onToggle: () => void;
}) {
  const className =
    "shrink-0 self-center rounded-md p-1 text-fg-faint transition-colors hover:bg-s2 hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-faint";

  if (!revealable) {
    return (
      <a
        href="/dashboard/memories"
        aria-label="Hidden here — show it on the memories page"
        title="Hidden here — show it on the memories page"
        className={className}
      >
        <EyeOff aria-hidden className="size-3.5" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={revealed}
      aria-label={revealed ? "Hide this again" : "Show what is hidden"}
      title={revealed ? "Hide this again" : "Show what is hidden"}
      className={className}
    >
      {revealed ? (
        <Eye aria-hidden className="size-3.5" />
      ) : (
        <EyeOff aria-hidden className="size-3.5" />
      )}
    </button>
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
