"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useCallback, useEffect, useState } from "react";

import { CHANNEL_COPY, type Channel, type ChannelCopy } from "@/lib/channels";

type Handshake = { url: string; qr: string; expiresAt: string };
type View = "choose" | "here" | "scan" | "manual";

const POLL_MS = 2500;

/**
 * Three routes to the same link, because the browser and the chat account are
 * usually not on the same device — and sometimes the two convenient routes are
 * both unavailable at once. The chooser states that plainly rather than
 * stacking every affordance on top of each other and hoping one lands.
 */
export function ConnectChat({
  channel,
  address,
}: {
  channel: Channel;
  address: string;
}) {
  const copy = CHANNEL_COPY[channel];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("choose");
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Minted only for the two routes that need a token; the manual code comes
  // from the bot instead, so picking it spends nothing.
  const ensureHandshake = useCallback(async (): Promise<Handshake | null> => {
    if (handshake) return handshake;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/link/${channel}`, { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        setError(
          body.error === "already-linked"
            ? "This account is already connected."
            : body.error === "channel-not-configured"
              ? "That chat isn't configured on the server."
              : "Couldn't start the handshake. Try again in a moment.",
        );
        return null;
      }

      setHandshake(body);
      return body as Handshake;
    } catch {
      setError("Network error. Try again.");
      return null;
    } finally {
      setPending(false);
    }
  }, [handshake]);

  const choose = async (next: View) => {
    if (next === "manual") {
      setView("manual");
      return;
    }
    if (await ensureHandshake()) setView(next);
  };

  // Poll while the dialog is open, whichever route is on screen — the link may
  // land from a phone the browser knows nothing about.
  useEffect(() => {
    if (!open) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/link/${channel}`);
        if (!res.ok) return;
        const { linked } = await res.json();
        if (linked) {
          setOpen(false);
          router.refresh();
        }
      } catch {
        // A dropped poll isn't worth surfacing; the next tick retries.
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [open, router]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setView("choose");
          setError(null);
        }
      }}
    >
      <Dialog.Trigger className="rounded-xl bg-fg px-5 py-3 text-[0.9375rem] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]">
        Connect {copy.name}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-s1 p-7 shadow-2xl sm:p-8">
          <Dialog.Title className="display-sm text-[1.375rem]">
            {view === "choose" ? `Connect ${copy.name}` : null}
            {view === "here" ? "Open it here" : null}
            {view === "scan" ? "Scan with your phone" : null}
            {view === "manual" ? "Type a code" : null}
          </Dialog.Title>

          <Dialog.Description className="mt-2 text-[0.9375rem] leading-relaxed text-fg-subtle">
            {view === "choose"
              ? `Sending the message from ${copy.name} is what proves the account is yours. Pick whichever way suits the device you have.`
              : "This page updates on its own once the chat is connected."}
          </Dialog.Description>

          <div className="mt-7">
            {view === "choose" ? (
              <Chooser onPick={choose} pending={pending} copy={copy} />
            ) : null}
            {view === "here" && handshake ? (
              <OpenHere url={handshake.url} expiresAt={handshake.expiresAt} copy={copy} />
            ) : null}
            {view === "scan" && handshake ? (
              <ScanCode qr={handshake.qr} expiresAt={handshake.expiresAt} copy={copy} />
            ) : null}
            {view === "manual" ? <Manual channel={channel} copy={copy} address={address} /> : null}
          </div>

          {error ? (
            <p role="alert" className="mt-5 text-[0.8125rem] text-fg-subtle">
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
            {view === "choose" ? (
              <span />
            ) : (
              <button
                type="button"
                onClick={() => setView("choose")}
                className="font-mono text-[0.6875rem] text-fg-subtle underline-offset-4 transition-colors hover:text-fg hover:underline"
              >
                ← All options
              </button>
            )}

            <Dialog.Close className="font-mono text-[0.6875rem] text-fg-faint underline-offset-4 transition-colors hover:text-fg-subtle hover:underline">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const options = (name: string): { view: View; label: string; hint: string }[] => [
  {
    view: "here",
    label: `${name} is on this device`,
    hint: `Opens ${name} on this machine`,
  },
  {
    view: "scan",
    label: `${name} is on my phone`,
    hint: "Scan a QR code with the camera",
  },
  {
    view: "manual",
    label: "Neither — let me type a code",
    hint: "Works anywhere, nothing to click",
  },
];

function Chooser({
  onPick,
  pending,
  copy,
}: {
  onPick: (view: View) => void;
  pending: boolean;
  copy: ChannelCopy;
}) {
  return (
    <div className="grid gap-2.5">
      {options(copy.name).map((option) => (
        <button
          key={option.view}
          type="button"
          disabled={pending}
          onClick={() => onPick(option.view)}
          className="group flex items-center justify-between gap-4 rounded-lg border border-line px-5 py-4 text-left transition-colors hover:border-fg-faint hover:bg-s2 disabled:opacity-50"
        >
          <span className="min-w-0">
            <span className="block text-[0.9375rem]">{option.label}</span>
            <span className="mt-0.5 block text-[0.8125rem] text-fg-subtle">
              {option.hint}
            </span>
          </span>
          <span
            aria-hidden
            className="shrink-0 text-fg-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-fg-muted"
          >
            →
          </span>
        </button>
      ))}
    </div>
  );
}

function OpenHere({
  url,
  expiresAt,
  copy,
}: {
  url: string;
  expiresAt: string;
  copy: ChannelCopy;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <Waiting action={copy.action} />

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {/*
          A real anchor, not window.open: popup blockers and the in-app
          browsers inside Instagram and Facebook drop programmatic opens
          silently, which reads as a dead button.
        */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-fg px-5 py-2.5 text-[0.875rem] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
        >
          Open {copy.name}
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard is blocked in some embedded browsers; the link is
              // still selectable below.
            }
          }}
          className="rounded-xl border border-line px-4 py-2.5 text-[0.875rem] text-fg-muted transition-colors hover:border-fg-faint hover:text-fg"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <Expiry expiresAt={expiresAt} />
    </div>
  );
}

function ScanCode({
  qr,
  expiresAt,
  copy,
}: {
  qr: string;
  expiresAt: string;
  copy: ChannelCopy;
}) {
  return (
    <div>
      <div className="flex justify-center">
        <div
          aria-hidden
          className="w-[11rem] rounded-lg bg-white p-3.5 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </div>

      <ol className="mt-6 space-y-2.5">
        <Step n={1}>Open the camera on your phone and point it at the code.</Step>
        <Step n={2}>
          {copy.name} opens on the bot —{" "}
          <strong className="font-medium text-fg-muted">{copy.action}</strong>.
        </Step>
      </ol>

      <div className="mt-6">
        <Waiting action={copy.action} />
      </div>
      <Expiry expiresAt={expiresAt} />
    </div>
  );
}

/**
 * The fallback for a locked-down machine with no desktop app and no phone
 * free to scan. The code runs bot → person → this form, never the other way:
 * a code heading towards an authenticated form is one an attacker must
 * persuade someone to reveal, rather than one they can persuade them to paste.
 */
function Manual({
  channel,
  copy,
  address,
}: {
  channel: Channel;
  copy: ChannelCopy;
  address: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/link/${channel}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json();

      if (res.ok) {
        router.refresh();
        return;
      }

      setError(
        body.error === "already-linked"
          ? "This account is already connected."
          : body.error === "chat-taken"
            ? `That ${copy.name} account belongs to a different account.`
            : "That code isn't valid. Send /code again for a fresh one.",
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <ol className="space-y-3">
        <Step n={1}>Open {copy.name} on any device.</Step>
        <Step n={2}>
          Search for{" "}
          {/* Chip and hint travel together, so a narrow screen wraps the pair
              rather than orphaning "tap to copy" on its own line. */}
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(address);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // Selectable either way.
                }
              }}
              className="rounded border border-line bg-s2 px-1.5 py-0.5 font-mono text-[0.8125rem] text-fg transition-colors hover:border-fg-faint"
            >
              {address}
            </button>
            <span
              className={`font-mono text-[0.6875rem] ${copied ? "text-accent" : "text-fg-faint"}`}
            >
              {copied ? "copied" : "tap to copy"}
            </span>
          </span>
        </Step>
        <Step n={3}>
          Open the chat and{" "}
          <strong className="font-medium text-fg-muted">{copy.action}</strong>.
        </Step>
        <Step n={4}>
          Send{" "}
          <code className="rounded border border-line bg-s2 px-1.5 py-0.5 font-mono text-[0.8125rem] text-fg">
            {copy.codeCommand}
          </code>{" "}
          and it replies with eight characters.
        </Step>
        <Step n={5}>Type them here.</Step>
      </ol>

      <form onSubmit={submit} className="mt-6 flex flex-wrap items-center gap-2.5">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="K7M2-QX9F"
          // Crockford base32; nothing here should be autocorrected on the way in.
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={12}
          aria-label="Pairing code"
          className="w-[10.5rem] rounded-xl border border-line bg-s1 px-4 py-2.5 font-mono text-[0.9375rem] tracking-[0.08em] uppercase outline-none placeholder:text-fg-faint focus:border-fg-faint"
        />
        <button
          type="submit"
          disabled={pending || code.trim().length === 0}
          className="rounded-xl bg-fg px-5 py-2.5 text-[0.875rem] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] disabled:scale-100 disabled:opacity-50"
        >
          {pending ? "Checking…" : "Connect"}
        </button>
      </form>

      <p className="mt-4 text-[0.8125rem] leading-relaxed text-fg-faint">
        Recalfy will never ask you for this code anywhere else. If someone asks
        you for one, they are trying to read your memory.
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-fg-subtle">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5 text-[0.9375rem] leading-relaxed text-fg-muted">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-line font-mono text-[0.625rem] text-fg-subtle">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Waiting({ action }: { action: string }) {
  return (
    <p className="flex items-center gap-2.5 text-[0.9375rem]">
      <span
        aria-hidden
        className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent"
      />
      Waiting for you to {action}
    </p>
  );
}

/** A countdown so an expired link explains itself instead of just failing. */
function Expiry({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <p className="eyebrow mt-5">
      {remaining > 0
        ? `Expires in ${mins}:${String(secs).padStart(2, "0")}`
        : "Expired — close and try again"}
    </p>
  );
}
