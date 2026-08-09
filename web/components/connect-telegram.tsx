"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Handshake = { url: string; qr: string; expiresAt: string };

const POLL_MS = 2500;

/**
 * The device you're reading this on is often not the device Telegram is on, so
 * the handshake offers three routes to the same token rather than assuming:
 * open it here, scan it with a phone, or carry the link somewhere else.
 *
 * The "open" control is a real anchor, not window.open — popup blockers and
 * the in-app browsers inside Instagram and Facebook silently drop programmatic
 * opens, and a link they can't intercept is the difference between the flow
 * working and appearing to do nothing.
 */
export function ConnectTelegram() {
  const router = useRouter();
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const openRef = useRef<HTMLAnchorElement>(null);

  const start = useCallback(async () => {
    setPending(true);
    setMessage(null);

    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        setMessage(
          body.error === "already-linked"
            ? "This account is already connected."
            : body.error === "bot-not-configured"
              ? "The bot username isn't configured on the server."
              : "Couldn't start the handshake. Try again in a moment.",
        );
        return;
      }

      setHandshake(body);
      // Focus the open control so keyboard users land on the next action
      // rather than having to hunt for what appeared.
      requestAnimationFrame(() => openRef.current?.focus());
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }, []);

  // Poll for the other half of the handshake landing, wherever it happens.
  useEffect(() => {
    if (!handshake) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/telegram/link");
        if (!res.ok) return;
        const { linked } = await res.json();
        if (linked) router.refresh();
      } catch {
        // A dropped poll isn't worth surfacing; the next tick retries.
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [handshake, router]);

  // Countdown, so an expired QR explains itself instead of just failing.
  useEffect(() => {
    if (!handshake) return;

    const tick = () => {
      const left = new Date(handshake.expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        setHandshake(null);
        setMessage("That link expired. Press Connect for a fresh one.");
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [handshake]);

  if (!handshake) {
    return (
      <div>
        <button
          type="button"
          onClick={start}
          disabled={pending}
          className="rounded-xl bg-fg px-5 py-3 text-[0.9375rem] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] disabled:scale-100 disabled:opacity-50"
        >
          {pending ? "Preparing…" : "Connect Telegram"}
        </button>
        {message ? (
          <p role="status" className="mt-3 text-[0.8125rem] text-fg-subtle">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <HandshakePanel
      url={handshake.url}
      qr={handshake.qr}
      remaining={remaining}
      message={message}
      copied={copied}
      openRef={openRef}
      onCopy={async () => {
        try {
          await navigator.clipboard.writeText(handshake.url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setMessage("Couldn't copy — select the link manually.");
        }
      }}
    />
  );
}

/** Presentational, so the layout can be rendered from a fixture. */
export function HandshakePanel({
  url,
  qr,
  remaining,
  message,
  copied,
  onCopy,
  openRef,
}: {
  url: string;
  qr: string;
  remaining: number;
  message?: string | null;
  copied?: boolean;
  onCopy?: () => void;
  openRef?: React.Ref<HTMLAnchorElement>;
}) {
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="rounded-lg border border-line bg-s2/40 p-6 sm:p-7">
      <div className="flex flex-col gap-7 sm:flex-row sm:items-start">
        {/*
          Hidden on small screens: you can't scan the screen you're holding,
          and at this size the code would push the one control that does work
          on a phone — the deep link — below the fold.
        */}
        <div className="hidden shrink-0 sm:block">
          <div
            aria-hidden
            className="w-[9.5rem] rounded-lg bg-white p-3 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="eyebrow mt-3 text-center">Scan with your phone</p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2.5 text-[0.9375rem]">
            <span
              aria-hidden
              className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent"
            />
            Waiting for you to press Start
          </p>

          <p className="mt-2.5 max-w-prose text-[0.875rem] leading-relaxed text-fg-subtle">
            <span className="hidden sm:inline">
              Telegram opens on whichever device scans or clicks.{" "}
            </span>
            Press <strong className="font-medium text-fg-muted">Start</strong>{" "}
            in the chat and this page updates on its own.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <a
              ref={openRef}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-fg px-5 py-2.5 text-[0.875rem] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
            >
              Open Telegram here
            </a>

            <button
              type="button"
              onClick={onCopy}
              className="rounded-xl border border-line px-4 py-2.5 text-[0.875rem] text-fg-muted transition-colors hover:border-fg-faint hover:text-fg"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>

          <p className="eyebrow mt-5">
            {remaining > 0
              ? `Expires in ${mins}:${String(secs).padStart(2, "0")}`
              : "Expired"}
          </p>

          {message ? (
            <p role="status" className="mt-3 text-[0.8125rem] text-fg-subtle">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
