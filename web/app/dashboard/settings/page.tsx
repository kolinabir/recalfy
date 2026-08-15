import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { InlineToggle } from "@/components/dashboard/inline-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import type { BotProfile } from "@/lib/dashboard-data";
import { getBotProfile, isConnected, requireViewer } from "@/lib/dashboard-data";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your Recalfy account.",
};

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const linked = isConnected(viewer);
  const profile = linked
    ? await getBotProfile(viewer.id)
    : ({ inline: true } satisfies BotProfile);

  return (
    <div>
      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="display display-fill mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          Your account.
        </h1>
      </header>

      <div className="mt-8 grid gap-4">
        <section className="rounded-xl border border-line bg-s1 px-6 py-6">
          <h2 className="eyebrow">Account</h2>
          <dl className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            <Field label="Signed in as" value={viewer.email} />
            <Field label="Sign-in method" value="Google" />
            <Field label="Plan" value="Free" />
            {profile.memberSince ? (
              <Field
                label="Bot user since"
                value={new Date(profile.memberSince).toLocaleDateString(
                  "en-US",
                  { month: "long", year: "numeric" },
                )}
              />
            ) : null}
          </dl>
        </section>

        <section className="rounded-xl border border-line px-6 py-6">
          <h2 className="eyebrow">Chat preferences</h2>
          <p className="mt-3 max-w-prose text-[0.875rem] leading-relaxed text-fg-subtle">
            Timezone, daily brief time and the evening reflection are set in
            the chat itself — tell the bot{" "}
            <em className="not-italic text-fg-muted">
              “move my brief to 7am”
            </em>{" "}
            and it&apos;s done.
            {profile.tz ? (
              <>
                {" "}
                Right now it thinks you&apos;re in{" "}
                <span className="font-mono text-[0.8125rem] text-fg">
                  {profile.tz}
                </span>
                .
              </>
            ) : null}
          </p>
        </section>

        {linked ? (
          <section className="rounded-xl border border-line px-6 py-6">
            <h2 className="eyebrow">Inline results</h2>
            <p className="mt-3 max-w-prose text-[0.875rem] leading-relaxed text-fg-subtle">
              Type{" "}
              <span className="font-mono text-[0.8125rem] text-fg">
                @recalfy_bot wifi
              </span>{" "}
              in any conversation and pick a fact to send. The other person sees
              an ordinary message from you — the bot is never in their chat.
              Passwords are hidden in the list you pick from and sent in full.
            </p>

            <div className="mt-5">
              <InlineToggle enabled={profile.inline} />
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-line px-6 py-6">
          <h2 className="eyebrow">Your data</h2>
          <p className="mt-3 max-w-prose text-[0.875rem] leading-relaxed text-fg-subtle">
            Take the whole thing with you, today or the day you leave. Nothing
            here is a request queue — the file downloads when you press it.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ExportOption
              format="md"
              title="Markdown"
              body="The document the bot recites, grouped the way it groups it. Readable in any editor."
            />
            <ExportOption
              format="json"
              title="JSON"
              body="Every record, including corrections and the facts you asked it to forget."
            />
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line px-6 py-5">
          <p className="text-[0.875rem] text-fg-subtle">
            Done here? Manage the{" "}
            <Link
              href="/dashboard/telegram"
              className="text-fg-muted underline underline-offset-4 hover:text-fg"
            >
              Telegram
            </Link>{" "}
            or{" "}
            <Link
              href="/dashboard/whatsapp"
              className="text-fg-muted underline underline-offset-4 hover:text-fg"
            >
              WhatsApp
            </Link>{" "}
            link, or sign out.
          </p>
          <SignOutButton />
        </section>
      </div>
    </div>
  );
}

/**
 * A plain anchor, not a button with a fetch behind it: the route already
 * answers with Content-Disposition, so the browser's own download is both
 * less code and better behaved — it survives a slow connection and lands in
 * the downloads folder without this page holding the bytes in memory.
 */
function ExportOption({
  format,
  title,
  body,
}: {
  format: "md" | "json";
  title: string;
  body: string;
}) {
  return (
    <a
      href={`/api/export?format=${format}`}
      download
      className="group rounded-xl border border-line px-5 py-4 transition-colors duration-300 hover:border-fg-faint"
    >
      <span className="flex items-center gap-2.5">
        <Download className="size-3.5 text-fg-faint transition-colors duration-300 group-hover:text-fg-muted" />
        <span className="text-[0.9375rem] font-medium">{title}</span>
      </span>
      <span className="mt-2 block text-[0.8125rem] leading-relaxed text-fg-subtle">
        {body}
      </span>
    </a>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 truncate text-[0.9375rem]">{value}</dd>
    </div>
  );
}
