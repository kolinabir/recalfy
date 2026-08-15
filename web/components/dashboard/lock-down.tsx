"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { lockDown } from "@/app/dashboard/channel-actions";

/**
 * For a phone that is gone.
 *
 * Written as a situation rather than a feature, because nobody in that
 * situation is scanning for the right verb. It is deliberately honest about
 * the limit: this closes the door, it does not un-read what was read.
 *
 * The redirect is not decoration. Every session ends, this one included, so
 * the page under the button is already dead by the time the action returns.
 */
export function LockDown() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const result = await lockDown();
      if (result.ok) router.replace("/login?locked=1");
      else setError(result.error);
    });
  }

  return (
    <section className="mt-4 rounded-xl border border-destructive/30 px-6 py-6">
      <h2 className="eyebrow text-destructive">Lost this device?</h2>
      <p className="mt-3 max-w-prose text-[0.875rem] leading-relaxed text-fg-subtle">
        Disconnects every chat at once, stops the bot answering from your
        memory inside other people&apos;s chats, ends every signed-in session
        including this one, and holds off any reconnection for fifteen minutes.
        Your memory is not deleted.
      </p>
      <p className="mt-3 max-w-prose text-[0.875rem] leading-relaxed text-fg-subtle">
        It cannot un-read what was already read. Whoever had the chat has seen
        what is in it — change your Google password too, and treat any password
        you stored here as known.
      </p>

      {confirming ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="inline-flex h-10 items-center rounded-xl bg-destructive px-4 text-[0.875rem] font-medium text-bg transition-opacity disabled:opacity-60"
          >
            {pending ? "Locking down…" : "Yes, lock it all down"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="text-[0.875rem] text-fg-subtle transition-colors hover:text-fg"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-5 inline-flex h-10 items-center rounded-xl border border-destructive/40 px-4 text-[0.875rem] text-destructive transition-colors hover:bg-destructive/10"
        >
          Disconnect everything and sign out
        </button>
      )}

      {error ? (
        <p className="mt-3 text-[0.8125rem] text-destructive">{error}</p>
      ) : null}
    </section>
  );
}
