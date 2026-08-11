import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Refunds",
  description:
    "Fourteen days, no questions asked. How refunds and cancellations work on Recalfy.",
};

const SUPPORT = "knkolin9@gmail.com";

export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund Policy"
      updated="11 August 2026"
      intro="Recalfy costs a few dollars a month, and no amount of that is worth an argument. If it isn't for you, say so and you get your money back."
      sections={[
        {
          heading: "1. Fourteen days, no questions",
          body: (
            <>
              <p>
                If you ask within 14 days of a payment, we refund it in full.
                You don&apos;t have to explain why, and we won&apos;t ask you
                to sit through a survey to get it.
              </p>
              <p>
                This applies to your first payment on any plan, monthly or
                yearly. Refunds go back to the card you paid with, usually
                within a few working days once approved.
              </p>
            </>
          ),
        },
        {
          heading: "2. Try it before you pay at all",
          body: (
            <p>
              Every plan starts with a 7-day free trial. Card details are
              collected when you subscribe so the plan can continue without
              interruption, but nothing is charged until the trial ends —
              cancel before then and you pay nothing. The trial is the honest
              version of a refund: you find out whether Recalfy is worth
              keeping before any money moves.
            </p>
          ),
        },
        {
          heading: "3. Cancelling, and what happens to renewals",
          body: (
            <>
              <p>
                You can cancel at any time — tell Recalfy to cancel in
                conversation, use{" "}
                <a href="/dashboard/billing">manage billing</a> in your
                dashboard, or email us. Cancelling stops the next payment. You
                keep everything you&apos;ve paid for until the end of the
                period you already bought.
              </p>
              <p>
                Renewals aren&apos;t refunded automatically, because
                cancelling is always available before one happens. That said:
                if a renewal caught you off guard — you meant to cancel, you
                forgot it was coming, you hadn&apos;t opened it in months —
                email us and we&apos;ll refund it. We would rather return the
                money than keep a payment you didn&apos;t mean to make.
              </p>
            </>
          ),
        },
        {
          heading: "4. Your memory leaves with you",
          body: (
            <p>
              A refund is not a reason to lose anything. You can export
              everything Recalfy has stored — as plain markdown or as JSON —
              at any time, including after you&apos;ve cancelled or been
              refunded. Nothing is held hostage to keep you subscribed.
            </p>
          ),
        },
        {
          heading: "5. Your legal rights",
          body: (
            <>
              <p>
                Nothing here reduces rights you have by law. If you&apos;re a
                consumer in the UK, the EU, or anywhere with stronger
                statutory protection, those rights apply on top of this policy
                and win wherever they&apos;re more generous — including the
                statutory right to withdraw from a distance contract.
              </p>
              <p>
                Payments are processed by Paddle.com Market Ltd, our Merchant
                of Record. Paddle is the seller of record for your purchase,
                appears on your statement, and operates its own{" "}
                <a
                  href="https://www.paddle.com/legal/refund-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  refund policy
                </a>{" "}
                and{" "}
                <a
                  href="https://www.paddle.com/legal/checkout-buyer-terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  buyer terms
                </a>
                . You can raise a refund with Paddle directly as well as with
                us.
              </p>
            </>
          ),
        },
        {
          heading: "6. How to ask",
          body: (
            <p>
              Email <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a> from the
              address on your account, or just tell Recalfy in the chat that
              you want a refund. One line is enough — there is no form.
            </p>
          ),
        },
      ]}
    />
  );
}
