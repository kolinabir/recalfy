import { Reveal } from "@/components/motion/reveal";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Presentational half of the dashboard. Kept free of session lookup so the
 * layout can be rendered from fixtures — the page owns auth, this owns pixels.
 */
export function DashboardView({
  email,
  name,
  linked,
}: {
  email: string;
  name?: string | null;
  linked: boolean;
}) {
  const firstName = name?.trim().split(" ")[0];

  return (
    <section className="rails relative isolate overflow-hidden pt-36 pb-28 sm:pt-40">
      <div className="shell">
        <Reveal as="header" className="max-w-2xl">
          <p className="eyebrow">Your account</p>
          <h1 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
            {firstName ? `Hello, ${firstName}.` : "Hello."}
            <span className="block text-fg-muted">
              {linked ? "Everything's wired." : "One link left."}
            </span>
          </h1>
          <p className="mt-6 text-[1.0625rem] leading-relaxed text-fg-muted">
            Recalfy doesn&apos;t live here — it lives in your Telegram chat.
            This page exists to connect the two and then get out of your way.
          </p>
        </Reveal>

        {/* The wiring diagram is the page. Two nodes, one incomplete run. */}
        <Reveal delay={0.08} className="mt-14">
          <div className="rounded-xl border border-line bg-s1 p-8 sm:p-10">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-stretch">
              <Node label="Signed in" title={email} detail="Google" state="done" />

              <Run linked={linked} />

              <Node
                label="Delivers to"
                title={linked ? "Telegram" : "Not connected"}
                detail={linked ? "Telegram" : "Waiting"}
                state={linked ? "done" : "pending"}
              />
            </div>

            <div className="mt-10 border-t border-line pt-8">
              <h2 className="display-sm text-[1.25rem]">Connect Telegram</h2>
              <p className="mt-2.5 max-w-prose leading-relaxed text-fg-subtle">
                You&apos;ll open a chat with the bot and press Start. That
                proves the account is yours — which is why we don&apos;t just
                ask you to type a username, and why nobody else can claim your
                memory by taking one.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-fg px-5 py-3 text-[0.9375rem] font-medium text-[var(--primary-foreground)] opacity-40"
                >
                  Connect Telegram
                </button>
                <span className="eyebrow">Shipping next</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.16} className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line px-6 py-5">
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Field label="Account" value={email} />
              <Field label="Plan" value="Free" />
            </div>
            <SignOutButton />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Node({
  label,
  title,
  detail,
  state,
}: {
  label: string;
  title: string;
  detail: string;
  state: "done" | "pending";
}) {
  const done = state === "done";

  return (
    <div className="min-w-0 flex-1 rounded-lg border border-line px-6 py-6">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={
            done
              ? "size-1.5 shrink-0 rounded-full bg-accent"
              : "size-1.5 shrink-0 animate-pulse rounded-full bg-fg-faint/50"
          }
        />
        <span className="eyebrow">{label}</span>
      </div>
      <p className={`mt-4 truncate text-[1.0625rem] ${done ? "" : "text-fg-subtle"}`}>
        {title}
      </p>
      <p className="mt-1 font-mono text-[0.6875rem] text-fg-faint">{detail}</p>
    </div>
  );
}

/** The run between the two nodes — dashed while the second end is unplugged. */
function Run({ linked }: { linked: boolean }) {
  return (
    <div aria-hidden className="flex shrink-0 items-center justify-center sm:w-16">
      <span
        className={`h-px w-full sm:h-full sm:w-px ${
          linked
            ? "bg-accent"
            : "bg-[repeating-linear-gradient(90deg,var(--line-strong)_0_4px,transparent_4px_9px)] sm:bg-[repeating-linear-gradient(180deg,var(--line-strong)_0_4px,transparent_4px_9px)]"
        }`}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 truncate text-[0.9375rem]">{value}</p>
    </div>
  );
}
