"use client";

import { useState, useTransition } from "react";

import { disconnect } from "@/app/dashboard/channel-actions";
import type { Channel } from "@/lib/channel-config";

/**
 * Detaching one chat, with the click split in two.
 *
 * This sits on a page people open to read their connection status, so the
 * first press only asks. The second one is the one that does something, and
 * it says what will happen next to it rather than in a dialog nobody reads.
 */
export function DisconnectButton({
  channel,
  name,
}: {
  channel: Channel;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await disconnect(channel);
      if (result.ok) setConfirming(false);
      else setError(result.error);
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-10 items-center rounded-xl border border-line px-4 text-[0.875rem] transition-colors hover:border-fg-faint hover:text-fg"
      >
        Disconnect {name}
      </button>
    );
  }

  return (
    <div>
      <p className="max-w-prose text-[0.875rem] leading-relaxed text-fg-muted">
        {name} stops answering, and the chat is told why. Everything you have
        stored stays exactly where it is — you can connect again whenever you
        like.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-xl bg-destructive px-4 text-[0.875rem] font-medium text-bg transition-opacity disabled:opacity-60"
        >
          {pending ? "Disconnecting…" : `Yes, disconnect ${name}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="text-[0.875rem] text-fg-subtle transition-colors hover:text-fg"
        >
          Keep it
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-[0.8125rem] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
