import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false },
};

/**
 * Where Paddle sends the browser after a successful checkout.
 *
 * Deliberately says nothing about provisioning. The webhook is what grants
 * access, and it may land a moment before or after this page renders — so
 * this page promises the subscription, never the state.
 */
export default function WelcomePage() {
  return (
    <section className="relative isolate overflow-hidden px-5 pt-36 pb-24 sm:pt-40">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="resolve rounded-xl border border-line bg-s1 p-8 sm:p-10">
          <h1 className="display text-[2rem]">
            You&rsquo;re in.{" "}
            <span className="block text-accent">Go say something.</span>
          </h1>
          <p className="mt-5 leading-relaxed text-fg-muted">
            Your subscription is active and the receipt is on its way by email.
            Nothing else to set up — start telling it things.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent text-[0.9375rem] font-medium text-accent-ink transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]"
          >
            Open the dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
