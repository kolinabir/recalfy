import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Recalfy collects, why, and how to remove it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="9 August 2026"
      intro="Recalfy's whole job is remembering what you tell it, so it necessarily stores personal information. This page explains what's collected, what it's used for, and how you stay in control of it."
      sections={[
        {
          heading: "1. What we collect",
          body: (
            <ul>
              <li>
                <strong>Account info</strong> — your name and email address
                from Google when you sign in.
              </li>
              <li>
                <strong>Chat identity</strong> — your Telegram user ID and,
                where relevant, the equivalent identifier on any other chat
                app Recalfy supports.
              </li>
              <li>
                <strong>The facts you tell it</strong> — the dates, names,
                reminders, and other information you send in conversation,
                which is stored as your personal memory.
              </li>
              <li>
                <strong>Basic usage data</strong> — timestamps and error
                logs used to keep the service running, not the content of
                conversations.
              </li>
            </ul>
          ),
        },
        {
          heading: "2. How it's used",
          body: (
            <ul>
              <li>To answer your questions and remind you of things, from your own stored memory only</li>
              <li>To process payments and manage your subscription</li>
              <li>To respond to support requests</li>
              <li>To diagnose and fix bugs</li>
            </ul>
          ),
        },
        {
          heading: "3. AI processing",
          body: (
            <p>
              Your messages are sent to a third-party AI model provider to
              generate Recalfy&apos;s replies. That provider processes the
              message and your existing memory to produce a response, and
              doesn&apos;t use your data to train its own models under our
              agreement with them.
            </p>
          ),
        },
        {
          heading: "4. Who we share it with",
          body: (
            <ul>
              <li>
                <strong>Lemon Squeezy</strong>, our Merchant of Record, for
                billing and subscription management
              </li>
              <li>
                <strong>Google</strong>, for sign-in authentication
              </li>
              <li>
                <strong>Telegram</strong> (and future chat platforms), as
                the messaging layer your conversation travels through
              </li>
              <li>
                <strong>Our AI model provider</strong>, to generate replies,
                as described above
              </li>
            </ul>
          ),
        },
        {
          heading: "5. Where it's stored",
          body: (
            <p>
              Your memory is stored in a managed MongoDB database with
              encrypted backups. We don&apos;t sell your data, and we
              don&apos;t use it for advertising.
            </p>
          ),
        },
        {
          heading: "6. Your control over it",
          body: (
            <p>
              Ask Recalfy to forget a specific fact and it&apos;s
              soft-deleted immediately. Export your entire memory as plain
              markdown at any time. Ask us to delete your account and all
              associated data, and we&apos;ll remove it — including from
              backups within their normal rotation window.
            </p>
          ),
        },
        {
          heading: "7. Children",
          body: (
            <p>
              Recalfy isn&apos;t directed at children under 16, and we
              don&apos;t knowingly collect information from them.
            </p>
          ),
        },
        {
          heading: "8. Changes to this policy",
          body: (
            <p>
              If how we handle data changes meaningfully, we&apos;ll update
              this page with a new date above.
            </p>
          ),
        },
        {
          heading: "9. Contact",
          body: (
            <p>
              Questions or requests about your data:{" "}
              <a href="mailto:hello@recalfy.com">hello@recalfy.com</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
