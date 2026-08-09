"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "opening" | "waiting" | "error";

/** Stop polling well before a token expires; the page is still usable after. */
const POLL_MS = 2500;
const GIVE_UP_MS = 3 * 60 * 1000;

export function ConnectTelegram() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);

  const start = useCallback(async () => {
    setPhase("opening");
    setMessage(null);

    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        setPhase("error");
        setMessage(
          body.error === "already-linked"
            ? "This account is already connected."
            : "Couldn't start the handshake. Try again in a moment.",
        );
        return;
      }

      // A new tab keeps the dashboard alive to poll; on mobile this hands off
      // to the installed Telegram app.
      window.open(body.url, "_blank", "noopener,noreferrer");
      startedAt.current = Date.now();
      setPhase("waiting");
    } catch {
      setPhase("error");
      setMessage("Network error. Try again.");
    }
  }, []);

  useEffect(() => {
    if (phase !== "waiting") return;

    const id = setInterval(async () => {
      if (startedAt.current && Date.now() - startedAt.current > GIVE_UP_MS) {
        setPhase("idle");
        setMessage("That link expired. Press Connect for a fresh one.");
        return;
      }

      try {
        const res = await fetch("/api/telegram/link");
        if (!res.ok) return;
        const { linked } = await res.json();
        if (linked) router.refresh();
      } catch {
        // A dropped poll is not worth surfacing; the next tick retries.
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [phase, router]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={start}
          disabled={phase === "opening" || phase === "waiting"}
          className="rounded-xl bg-fg px-5 py-3 text-[0.9375rem] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] disabled:scale-100 disabled:opacity-50"
        >
          {phase === "opening" ? "Opening Telegram…" : "Connect Telegram"}
        </button>

        {phase === "waiting" ? (
          <span className="flex items-center gap-2.5 text-[0.875rem] text-fg-subtle">
            <span
              aria-hidden
              className="size-1.5 animate-pulse rounded-full bg-accent"
            />
            Waiting for you to press Start…
          </span>
        ) : null}
      </div>

      {message ? (
        <p role="status" className="mt-3 text-[0.8125rem] text-fg-subtle">
          {message}
        </p>
      ) : null}

      {phase === "waiting" ? (
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-3 font-mono text-[0.6875rem] text-fg-faint underline-offset-4 hover:underline"
        >
          Already pressed Start? Refresh
        </button>
      ) : null}
    </div>
  );
}
