"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { AnimatePresence, motion, useInView } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Cycle, Tier } from "@/lib/paddle/config";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Minor units to a formatted price in the visitor's own currency.
 *
 * The exponent comes from Intl rather than a hardcoded 100 — JPY, KRW and CLP
 * have no minor unit, so dividing those by 100 would quote a price a hundred
 * times too small.
 */
function money(minor: number, currency: string) {
  const format = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(minor / 10 ** digits);
}

/**
 * Read at module scope because Next inlines these at build time — they cannot
 * change between renders, so this is a constant, not state.
 *
 * The environment is never defaulted. If the var is missing the table renders
 * its copy with no prices and no buttons, which is loud; quietly falling back
 * to sandbox is how test prices get shown to real customers.
 */
/**
 * Whether the plan they hold is the one this card is selling.
 *
 * An active subscription on an unrecognised price reports `id: null` — the
 * catalogue moved under them — and then no card is "theirs". Both read
 * "Manage plan" rather than one of them claiming to be their current plan.
 */
function onThisTier(
  current: { id: "keep" | "archive" | null },
  tier: Tier,
): boolean {
  return current.id !== null && current.id === tier.id;
}

const PADDLE_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV;
const CONFIGURED =
  Boolean(PADDLE_TOKEN) &&
  (PADDLE_ENV === "sandbox" || PADDLE_ENV === "production");

interface Props {
  tiers: Tier[];
  /** From the edge, or absent — in which case Paddle geolocates by IP. */
  country?: string;
  viewer?: { id: string; email: string };
  /**
   * The plan they already hold, when one is active. Its absence means "no
   * live subscription", which is the only state where opening a checkout is
   * the right thing to do.
   */
  current?: { id: "keep" | "archive" | null; name: string };
  /**
   * Hold Paddle back until the table is nearly in view. Set on the home page,
   * where this sits far below the fold; left off on /pricing, where prices are
   * the reason for the visit and must not wait on anything.
   */
  defer?: boolean;
}

export function PlanTable({ tiers, country, viewer, current, defer }: Props) {
  const router = useRouter();
  /*
    Paddle is three third-party requests — its script, its stylesheet, and a
    price-preview call. On the home page this table sits far below the fold, so
    loading it eagerly puts a vendor CDN on the critical path of a page most
    visitors never scroll to the bottom of. `margin` starts the work a screen
    early, so prices have resolved by the time the table is reached.
  */
  const shell = useRef<HTMLDivElement>(null);
  const near = useInView(shell as React.RefObject<Element>, {
    once: true,
    margin: "100% 0px",
  });
  /*
    A table with no prices is worse than a slow one, so the wait is never
    open-ended: if IntersectionObserver is unavailable or never reports, this
    releases it anyway. Deferring is an optimisation, not a precondition.
  */
  const [waited, setWaited] = useState(!defer);
  useEffect(() => {
    if (!defer) return;
    const id = setTimeout(() => setWaited(true), 8000);
    return () => clearTimeout(id);
  }, [defer]);
  const ready = !defer || near || waited;
  /*
    Yearly by default. It is the cheaper number per month, the one worth
    anchoring on, and the commitment that suits a memory people expect to keep
    — someone shopping for a place to put the next five years of small facts is
    not looking for a rolling month. Monthly is one tap away for anyone who
    wants it.
  */
  const [cycle, setCycle] = useState<Cycle>("year");
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  /** priceId -> the string Paddle says to show. Never computed here. */
  const [totals, setTotals] = useState<Record<string, string>>({});
  /** priceId -> the same amount in minor units, for deriving the list price. */
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [currency, setCurrency] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!CONFIGURED) {
      console.error("[paddle] NEXT_PUBLIC_PADDLE_ENV / _CLIENT_TOKEN missing");
      return;
    }

    let cancelled = false;

    initializePaddle({
      token: PADDLE_TOKEN as string,
      environment: PADDLE_ENV as "sandbox" | "production",
    })
      .then(async (instance) => {
        if (!instance || cancelled) return;
        setPaddle(instance);

        const preview = await instance.PricePreview({
          items: tiers.flatMap((tier) => [
            { priceId: tier.priceId.month, quantity: 1 },
            { priceId: tier.priceId.year, quantity: 1 },
          ]),
          // Omitted entirely when unknown; Paddle then uses the caller's IP.
          ...(country ? { address: { countryCode: country } } : {}),
        });

        if (cancelled) return;
        setTotals(
          Object.fromEntries(
            preview.data.details.lineItems.map((line) => [
              line.price.id,
              // `total`, not `subtotal`: subtotal is net of tax, so in a
              // 15%-VAT country a $6.00 price renders as $5.22 and every
              // visitor is quoted less than they will be charged.
              line.formattedTotals.total,
            ]),
          ),
        );
        // The same figure unformatted, so the struck-through list price can be
        // derived in the visitor's currency instead of assuming dollars.
        setAmounts(
          Object.fromEntries(
            preview.data.details.lineItems.map((line) => [
              line.price.id,
              Number(line.totals.total),
            ]),
          ),
        );
        setCurrency(preview.data.currencyCode);
      })
      .catch((error: unknown) => {
        console.error("[paddle] price preview failed", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, tiers, country]);

  function subscribe(tier: Tier) {
    // Checkout is for signed-in people only. Without an account there is
    // nothing to attach the subscription to — `customData.userId` is what the
    // webhook joins on, and a purchase without it fulfils to nobody.
    if (!viewer) {
      router.push(`/login?plan=${tier.id}&cycle=${cycle}`);
      return;
    }

    // Belt and braces: the button for a subscribed account is already a link
    // rather than this handler, but a second checkout would create a second
    // subscription and charge them twice — so the guard lives here too, at
    // the only place that can actually open one.
    if (current) {
      router.push("/dashboard/billing");
      return;
    }

    paddle?.Checkout.open({
      items: [{ priceId: tier.priceId[cycle], quantity: 1 }],
      ...(viewer ? { customer: { email: viewer.email } } : {}),
      // The join the webhook depends on. Everything else about a customer can
      // change; the account id cannot.
      ...(viewer ? { customData: { userId: viewer.id } } : {}),
      settings: {
        displayMode: "overlay",
        variant: "one-page",
        successUrl: `${window.location.origin}/welcome`,
      },
    });
  }

  return (
    <div ref={shell}>
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Billing cycle"
          className="relative flex items-center gap-0.5 rounded-xl border border-line bg-s1 p-1"
        >
          {(
            [
              { value: "month", label: "Monthly" },
              { value: "year", label: "Yearly" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCycle(option.value)}
              aria-pressed={cycle === option.value}
              className={cn(
                "relative rounded-lg px-4 py-2 text-[0.875rem] transition-colors duration-300",
                cycle === option.value
                  ? "text-fg"
                  : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              {cycle === option.value ? (
                <motion.span
                  layoutId="cycle-pill"
                  className="absolute inset-0 rounded-lg bg-s2"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-2">
        {tiers.map((tier) => {
          const priceId = tier.priceId[cycle];
          const total = totals[priceId];

          // The pre-launch price, in whatever currency Paddle just quoted.
          // Scaling Paddle's own figure keeps the comparison honest across
          // currencies and tax regimes — both numbers are the same kind.
          const bird = tier.earlyBird;
          const amount = amounts[priceId];
          const listPrice =
            bird && amount && currency
              ? money(
                  Math.round((amount * bird.list[cycle]) / bird.now[cycle]),
                  currency,
                )
              : undefined;

          return (
            <section
              key={tier.id}
              className={cn(
                // Flex column so the two cards share a height and their CTAs
                // line up, however many features each one lists.
                "relative flex flex-col overflow-hidden rounded-xl border p-8 transition-colors duration-500 sm:p-10",
                tier.featured
                  ? "border-accent/30 bg-s1 "
                  : "border-line hover:border-line",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="display text-[1.5rem]">{tier.name}</h3>
                  <p className="mt-2 text-[0.9375rem] text-fg-muted">
                    {tier.description}
                  </p>
                </div>
                {tier.featured ? (
                  <span className="rounded-full bg-accent/15 px-3 py-1 font-mono text-[0.6875rem] tracking-wide text-accent">
                    Most kept
                  </span>
                ) : null}
              </div>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="display overflow-hidden text-[2.75rem] leading-none tabular-nums">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={total ?? `pending-${priceId}`}
                      initial={{ y: "0.6em", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "-0.6em", opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="inline-block"
                    >
                      {/* Paddle's string, rendered as-is — localized, and
                          tax-inclusive where the country requires it. */}
                      {total ?? (
                        <span
                          aria-hidden
                          className="inline-block h-[0.8em] w-[2.6em] rounded bg-s2"
                        />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </span>
                {listPrice ? (
                  <span
                    className="text-[1.25rem] text-fg-faint line-through decoration-fg-faint/50"
                    aria-label={`Regular price ${listPrice}`}
                  >
                    {listPrice}
                  </span>
                ) : null}
                <span className="font-mono text-[0.75rem] text-fg-subtle">
                  / {cycle === "month" ? "month" : "year"}
                </span>
              </div>

              {listPrice ? (
                <p className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-accent/12 px-3 py-1 font-mono text-[0.6875rem] tracking-wide text-accent">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-accent"
                  />
                  Early bird — {listPrice} after launch
                </p>
              ) : null}

              <dl className="mt-8 grid grid-cols-3 gap-2">
                {tier.limits.map((limit) => (
                  <div
                    key={limit.label}
                    className="rounded-xl border border-line px-3.5 py-3"
                  >
                    <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-subtle uppercase">
                      {limit.label}
                    </dt>
                    <dd className="mt-1.5 text-[0.875rem] font-medium">
                      {limit.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-8 space-y-3.5 pb-4">
                {tier.features.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3.5 text-[0.9375rem] leading-relaxed text-fg-muted"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-[0.68em] size-1.5 shrink-0 rounded-full",
                        tier.featured ? "bg-accent" : "bg-fg-faint/40",
                      )}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/*
                Someone who already pays must never be handed a checkout. A
                second one creates a second subscription and charges them
                twice, and Paddle has no idea the first exists — so for them
                this is a link to billing, not a button that opens anything.
              */}
              {current ? (
                <Link
                  href="/dashboard/billing"
                  className={cn(
                    "mt-auto inline-flex h-11 w-full items-center justify-center rounded-xl text-[0.9375rem] font-medium transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]",
                    onThisTier(current, tier)
                      ? "border border-line text-fg-muted hover:border-fg-faint"
                      : tier.featured
                        ? "bg-accent text-accent-ink"
                        : "border border-line text-fg hover:border-fg-faint",
                  )}
                >
                  {onThisTier(current, tier)
                    ? "Your plan"
                    : current.id
                      ? `Switch to ${tier.name}`
                      : "Manage plan"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => subscribe(tier)}
                  disabled={
                    Boolean(viewer) && (!paddle || failed || !CONFIGURED)
                  }
                  className={cn(
                    "mt-auto inline-flex h-11 w-full items-center justify-center rounded-xl text-[0.9375rem] font-medium transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
                    tier.featured
                      ? "bg-accent text-accent-ink"
                      : "border border-line text-fg hover:border-fg-faint",
                  )}
                >
                  {viewer ? tier.cta : `Sign in to ${tier.cta.toLowerCase()}`}
                </button>
              )}

              {/* Paddle requires the buyer to have accepted the seller's terms
                  and refund policy before purchase, so the link sits on the
                  button rather than buried in the footer. Nobody is buying
                  anything here once they hold a plan, so it goes away. */}
              <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-fg-subtle">
                {current ? (
                  onThisTier(current, tier) ? (
                    "This is what you are on today."
                  ) : (
                    "Changing plan is handled in billing — no second charge."
                  )
                ) : (
                  <>
                    7 days free. By subscribing you agree to the{" "}
                    <a href="/terms" className="underline underline-offset-2">
                      terms
                    </a>{" "}
                    and{" "}
                    <a href="/refunds" className="underline underline-offset-2">
                      refund policy
                    </a>
                    .
                  </>
                )}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
