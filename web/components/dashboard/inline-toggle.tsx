"use client";

import { useState, useTransition } from "react";

import { setInlineResults } from "@/app/dashboard/settings/actions";

/**
 * The switch for inline results. Optimistic: the thumb moves on the click and
 * rolls back if the write fails, because a toggle that waits on a round trip
 * before moving reads as broken and gets clicked twice.
 */
export function InlineToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);

    startTransition(async () => {
      const result = await setInlineResults(next);
      if (!result.ok) {
        setOn(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Answer inline queries in other chats"
        disabled={pending}
        onClick={toggle}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-60 ${
          on ? "border-accent bg-accent" : "border-line bg-s2"
        }`}
      >
        <span
          className={`absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-[left] duration-200 ${
            on ? "left-[1.375rem] bg-accent-ink" : "left-1 bg-fg-faint"
          }`}
        />
      </button>

      <p className="text-[0.8125rem] leading-relaxed text-fg-subtle">
        {on
          ? "On — typing @recalfy_bot in any chat searches your memory."
          : "Off — @recalfy_bot returns nothing in other chats."}
        {error ? (
          <span className="mt-1 block text-destructive">{error}</span>
        ) : null}
      </p>
    </div>
  );
}
