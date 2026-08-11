import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms that govern using Recalfy.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="10 August 2026"
      intro="Recalfy is a personal memory assistant that runs inside chat apps you already use. These terms cover how the service works, what you can expect from it, and what we expect from you."
      sections={[
        {
          heading: "1. The service",
          body: (
            <p>
              Recalfy stores facts, reminders, and other information you send
              it, and uses that memory to answer questions and message you at
              the right time. It is available on Telegram and WhatsApp, with
              more chat apps launching over time; connecting more than one
              links them to a single account and a single memory. Recalfy is
              operated by an individual and is not a registered company.
            </p>
          ),
        },
        {
          heading: "2. Your account and the free trial",
          body: (
            <>
              <p>
                You sign in with Google to create an account. Every plan
                starts with a 7-day free trial. Card details are collected
                when you subscribe so the plan can continue without
                interruption, but nothing is charged until the trial ends —
                cancel before then and you pay nothing.
              </p>
              <p>
                You&apos;re responsible for keeping your account access
                secure and for everything that happens under it.
              </p>
            </>
          ),
        },
        {
          heading: "3. Subscriptions and billing",
          body: (
            <>
              <p>
                Paid plans are billed monthly or yearly, as described on the{" "}
                <a href="/pricing">pricing page</a>. Payments are processed
                by Paddle.com Market Ltd, our Merchant of Record — they
                handle checkout, card processing, and applicable sales tax,
                are the seller of record for your purchase, and appear as the
                merchant on your statement.
              </p>
              <p>
                You can cancel at any time by asking Recalfy to cancel in
                conversation, from{" "}
                <a href="/dashboard/billing">manage billing</a>, or by
                contacting us. Cancelling stops future billing and you keep
                access until the end of the period you already paid for.
                Refunds are covered in full by our{" "}
                <a href="/refunds">refund policy</a> — fourteen days, no
                questions asked.
              </p>
            </>
          ),
        },
        {
          heading: "4. What you send Recalfy",
          body: (
            <p>
              Everything you tell Recalfy — facts, reminders, corrections —
              is stored to power your own memory and is not shared with
              other users. You can export your entire memory as plain
              markdown at any time, and ask Recalfy to forget specific facts
              or delete your account entirely. See the{" "}
              <a href="/privacy">privacy policy</a> for how this data is
              handled.
            </p>
          ),
        },
        {
          heading: "5. Acceptable use",
          body: (
            <>
              <p>Don&apos;t use Recalfy to:</p>
              <ul>
                <li>Store or generate illegal content</li>
                <li>Attempt to disrupt, overload, or reverse-engineer the service</li>
                <li>Impersonate someone else or misuse another person&apos;s account</li>
                <li>Circumvent usage limits tied to your plan</li>
              </ul>
              <p>
                We may suspend or terminate access for accounts that violate
                this, generally with notice unless the activity is actively
                harmful.
              </p>
            </>
          ),
        },
        {
          heading: "6. No guarantees",
          body: (
            <p>
              Recalfy is provided as-is. Reminders and recall are handled by
              an AI model and, while accurate the large majority of the
              time, can occasionally misparse a time or fact — Recalfy reads
              scheduled reminders back to you so mistakes are caught early.
              Don&apos;t rely on Recalfy as the sole record for anything
              safety-critical, legal, or medical.
            </p>
          ),
        },
        {
          heading: "7. Changes to these terms",
          body: (
            <p>
              We may update these terms as the product changes. Meaningful
              changes will be reflected here with an updated date; continued
              use after a change means you accept the update.
            </p>
          ),
        },
        {
          heading: "8. Contact",
          body: (
            <p>
              Questions about these terms:{" "}
              <a href="mailto:hello@recalfy.com">hello@recalfy.com</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
