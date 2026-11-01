import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader, BlogFooter } from "@/app/blog/BlogChrome";
import { PayPalMark, WiseMark, BankMark } from "@/app/components/PayoutLogos";
import { getPublicTiers } from "@/config/subscriptions";
import { REFERRAL_RATE_PCT, REFERRAL_TERMS, exampleEarnings } from "@/lib/referral-terms";
import { EarningsEstimator } from "./EarningsEstimator";

const minPayout = `$${REFERRAL_TERMS.minPayout.USD / 100}`;

export const metadata: Metadata = {
  title: `Earn ${REFERRAL_RATE_PCT}% for every creator you refer · Kitevo`,
  description: `Share Kitevo and earn ${REFERRAL_RATE_PCT}% of what every creator you invite pays, for ${REFERRAL_TERMS.months} months. Paid by PayPal, Wise or bank transfer.`,
  alternates: { canonical: "/referral-program" },
};

const STEPS = [
  {
    n: "01",
    title: "Get your link",
    body: "Sign up free. Your invite link is in your dashboard, and your media kit's “Create yours” link already uses it.",
  },
  {
    n: "02",
    title: "Share it",
    body: "Post it in your bio, your stories, your creator group chats. Anyone who signs up within 60 days of clicking is yours.",
  },
  {
    n: "03",
    title: "Get paid monthly",
    body: `Earn ${REFERRAL_RATE_PCT}% of every payment they make for ${REFERRAL_TERMS.months} months. Paid each month once you pass ${minPayout}.`,
  },
];

const FAQ = [
  {
    q: "Who can join?",
    a: "Anyone with a Kitevo account, creator or brand, including the free plan. There's nothing to apply for.",
  },
  {
    q: "What counts as a referral?",
    a: "Someone who signs up after clicking your link (within 60 days) and then pays for any Kitevo plan. Free signups count toward your invite total but only paid plans earn commission.",
  },
  {
    q: "How much do I earn?",
    a: `${REFERRAL_RATE_PCT}% of the pre-tax amount each referred account pays, on every payment in their first ${REFERRAL_TERMS.months} months. Upgrades and annual plans count too.`,
  },
  {
    q: "When and how do I get paid?",
    a: `Each commission is held ${REFERRAL_TERMS.holdDays} days in case of a refund, then paid out monthly once your balance passes ${minPayout}, by PayPal, Wise or international bank transfer.`,
  },
  {
    q: "What isn't allowed?",
    a: "Referring yourself or your own extra accounts doesn't count, and commissions from refunded payments are reversed. Please don't spam your link.",
  },
];

export default function ReferralProgramPage() {
  const plans = getPublicTiers("creator")
    .filter((t) => t.priceMonthly > 0)
    .map((t) => ({ id: t.id, name: t.name, monthlyPrice: t.priceMonthly }));
  const ex = exampleEarnings("pro");

  return (
    <div className="min-h-screen bg-canvas">
      <BlogHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-5 pt-16 pb-12 sm:px-8 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                Kitevo referral program
              </p>
              <h1 className="mt-6 text-[clamp(36px,6vw,64px)] font-medium leading-[1.04] tracking-tight text-foreground text-balance">
                Earn {REFERRAL_RATE_PCT}% for every creator you bring.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
                You already tell other creators what you use. Share your Kitevo link and get {REFERRAL_RATE_PCT}% of what they pay for{" "}
                {REFERRAL_TERMS.months} months, paid to you every month.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-85"
                >
                  Sign up free &amp; get your link
                </Link>
                <Link
                  href="/referrals"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-border px-7 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  I have an account
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex -space-x-1.5">
                  <PayPalMark size={28} className="ring-2 ring-background" />
                  <WiseMark size={28} className="ring-2 ring-background" />
                  <BankMark size={28} className="ring-2 ring-background" />
                </span>
                Paid by PayPal, Wise or international bank transfer
              </div>
            </div>

            <EarningsEstimator plans={plans} />
          </div>
        </section>

        {/* Numbers strip */}
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-5 py-10 sm:grid-cols-4 sm:px-8">
            {[
              { k: `${REFERRAL_RATE_PCT}%`, v: "of every payment" },
              { k: `${REFERRAL_TERMS.months} months`, v: "per referral" },
              { k: `$${ex.perReferral.toFixed(0)}`, v: `per creator on ${ex.tierName}` },
              { k: "Monthly", v: `payouts over ${minPayout}` },
            ].map((s) => (
              <div key={s.v}>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{s.k}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
          <h2 className="text-3xl font-medium tracking-tight text-foreground">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border p-6">
                <p className="font-mono text-xs text-muted-foreground">{s.n}</p>
                <p className="mt-4 text-lg font-medium text-foreground">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
          <h2 className="text-3xl font-medium tracking-tight text-foreground">Questions</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-foreground">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          <div className="flex flex-col items-center rounded-[32px] bg-foreground px-6 py-16 text-center text-background">
            <h2 className="max-w-xl text-[clamp(28px,4vw,44px)] font-medium leading-tight tracking-tight">
              Your next payout starts with one link.
            </h2>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center rounded-full bg-background px-7 text-sm font-medium text-foreground transition-opacity hover:opacity-85"
            >
              Get your invite link, free
            </Link>
          </div>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
