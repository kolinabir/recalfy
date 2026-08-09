import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { getBotProfile, requireViewer } from "@/lib/dashboard-data";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your Recalfy account.",
};

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const linked = typeof viewer.telegramUserId === "number";
  const profile = linked ? await getBotProfile(viewer.telegramUserId!) : {};

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

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line px-6 py-5">
          <p className="text-[0.875rem] text-fg-subtle">
            Done here?{" "}
            <Link
              href="/dashboard/telegram"
              className="text-fg-muted underline underline-offset-4 hover:text-fg"
            >
              Manage the Telegram link
            </Link>{" "}
            or sign out.
          </p>
          <SignOutButton />
        </section>
      </div>
    </div>
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
