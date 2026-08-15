"use client";

import { useState, useTransition } from "react";

export type ToggleResult = { ok: true } | { ok: false; error: string };

/**
 * One switch, for any boolean the bot keeps on the user's record.
 *
 * Optimistic: the thumb moves on the click and rolls back if the write fails,
 * because a toggle that waits on a round trip before moving reads as broken
 * and gets clicked twice.
 */
export function SettingToggle({
  enabled,
  label,
  on,
  off,
  action,
}: {
  enabled: boolean;
  /** For screen readers — the page's heading is not attached to the switch. */
  label: string;
  /** What to say in each state. Written as the state, not as the promise. */
  on: string;
  off: string;
  action: (next: boolean) => Promise<ToggleResult>;
}) {
  const [checked, setChecked] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    setChecked(next);
    setError(null);

    startTransition(async () => {
      const result = await action(next);
      if (!result.ok) {
        setChecked(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={pending}
        onClick={toggle}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-60 ${
          checked ? "border-accent bg-accent" : "border-line bg-s2"
        }`}
      >
        <span
          className={`absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-[left] duration-200 ${
            checked ? "left-[1.375rem] bg-accent-ink" : "left-1 bg-fg-faint"
          }`}
        />
      </button>

      <p className="text-[0.8125rem] leading-relaxed text-fg-subtle">
        {checked ? on : off}
        {error ? (
          <span className="mt-1 block text-destructive">{error}</span>
        ) : null}
      </p>
    </div>
  );
}
