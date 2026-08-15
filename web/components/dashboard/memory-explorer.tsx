"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MemoryListShell, MemoryRow } from "@/components/dashboard/memory-row";
import type { MemoryItem } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

/**
 * The whole memory, searchable. No folders and nothing to file — groups are
 * the bot's own headings, offered as one-tap filters and nothing more.
 */
export function MemoryExplorer({ memories }: { memories: MemoryItem[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / ctrl-K focuses search — the only shortcut this page needs.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const memory of memories) {
      counts.set(memory.group, (counts.get(memory.group) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [memories]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return memories.filter(
      (memory) =>
        (!group || memory.group === group) &&
        (!needle || memory.text.toLowerCase().includes(needle)),
    );
  }, [memories, query, group]);

  return (
    <div>
      <label className="flex items-center gap-3 rounded-xl border border-line bg-s1 px-4 py-3 transition-colors focus-within:border-fg-faint">
        <Search aria-hidden className="size-4 shrink-0 text-fg-faint" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your memory…"
          aria-label="Search memories"
          className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-fg-faint"
        />
        <kbd className="hidden rounded border border-line bg-s2 px-1.5 py-0.5 font-mono text-[0.625rem] text-fg-faint sm:block">
          ⌘K
        </kbd>
      </label>

      {groups.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {groups.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setGroup(group === name ? null : name)}
              aria-pressed={group === name}
              className={cn(
                "rounded-lg border px-3 py-1.5 font-mono text-[0.6875rem] tracking-[0.06em] uppercase transition-colors",
                group === name
                  ? "border-fg-faint bg-s2 text-fg"
                  : "border-line text-fg-subtle hover:border-fg-faint hover:text-fg",
              )}
            >
              {name}
              <span className="ml-1.5 text-fg-faint">{count}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-line px-5 py-10 text-center text-[0.9375rem] text-fg-subtle">
            Nothing matches{query.trim() ? ` “${query.trim()}”` : ""}.
            {group ? " Try clearing the filter." : ""}
          </p>
        ) : (
          <MemoryListShell>
            {/* The page you came to on purpose — credentials mask, and the
                eye on each row shows one. Search still reads the stored text,
                masked or not: looking a password up by its value is exactly
                what this box is for. */}
            {visible.map((memory) => (
              <MemoryRow key={memory.id} memory={memory} revealable />
            ))}
          </MemoryListShell>
        )}
      </div>
    </div>
  );
}
