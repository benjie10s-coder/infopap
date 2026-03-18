import Link from "next/link";
import type { Metadata } from "next";
import { PLANS, PAY_AS_YOU_GO } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing — InvoSafi",
  description:
    "Simple, transparent pricing. Pay KSh 10 per document or save with a subscription plan starting at KSh 500.",
};

const CheckIcon = () => (
  <svg className="h-4 w-4 text-lagoon shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-mist/20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-mist bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-display font-bold text-lagoon">
            InvoSafi
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink/70 hover:bg-mist/50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-lagoon px-4 py-2 text-sm font-medium text-white hover:bg-lagoon/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-12 text-center px-4">
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-ink">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-ink/60 max-w-xl mx-auto">
          Pay per document or save with a prepaid plan. All plans include every
          document type, email sharing, and clean downloads with no watermarks.
        </p>
      </section>

      {/* Plans grid */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pay As You Go */}
          <div className="rounded-2xl border border-mist bg-white p-6 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-ink/40 mb-2">
                Current Default
              </p>
              <h3 className="text-xl font-display font-bold text-ink">
                {PAY_AS_YOU_GO.name}
              </h3>
              <div className="mt-3">
                <span className="text-3xl font-bold text-ink">KSh {PAY_AS_YOU_GO.price}</span>
                <span className="text-sm text-ink/50 ml-1">/ document</span>
              </div>
              <p className="text-sm text-ink/50 mt-1">No commitment required</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PAY_AS_YOU_GO.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink/70">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="block w-full rounded-lg border border-mist px-4 py-3 text-center text-sm font-medium text-ink/70 hover:bg-mist/30 transition-colors"
            >
              Start Creating
            </Link>
          </div>

          {/* Subscription Plans */}
          {PLANS.map((plan, i) => {
            const isPopular = i === 1; // Growth
            return (
              <div
                key={plan.type}
                className={`rounded-2xl border p-6 flex flex-col relative ${
                  isPopular
                    ? "border-lagoon bg-lagoon/[0.02] shadow-soft ring-1 ring-lagoon/20"
                    : "border-mist bg-white"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lagoon px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                    Popular
                  </span>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-display font-bold text-ink">
                    {plan.name}
                  </h3>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-ink">
                      KSh {plan.price.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-ink/50 mt-1">
                    {plan.documentsLimit} documents · {plan.perDocPrice}/doc
                  </p>
                  <p className="text-xs text-ink/40 mt-0.5">
                    Valid for 1 year or until exhausted
                  </p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink/70">
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/auth/signup?redirect=${encodeURIComponent("/dashboard/subscription")}`}
                  className={`block w-full rounded-lg px-4 py-3 text-center text-sm font-medium transition-colors ${
                    isPopular
                      ? "bg-lagoon text-white hover:bg-lagoon/90"
                      : "bg-ink/5 text-ink hover:bg-ink/10"
                  }`}
                >
                  Get {plan.name}
                </Link>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-ink text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-ink">How does the subscription work?</h3>
              <p className="text-sm text-ink/60 mt-1">
                When you purchase a plan, you get a quota of document downloads
                (100, 300, or 700). Each time you download a document, it
                counts against your quota. No payment modal — downloads are
                instant. Your plan is valid for 1 year or until the quota is
                used up, whichever comes first.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">What happens when my quota runs out?</h3>
              <p className="text-sm text-ink/60 mt-1">
                You can renew your plan at any time, or continue using Pay As
                You Go at KSh 10 per document. Your existing documents are
                always accessible for re-download.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Can I upgrade my plan?</h3>
              <p className="text-sm text-ink/60 mt-1">
                Yes! You can purchase a higher plan at any time. Your new plan
                replaces the current one with a fresh quota and expiry date.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Which document types are included?</h3>
              <p className="text-sm text-ink/60 mt-1">
                All plans include every document type: invoices, receipts,
                quotations, cash sales, delivery notes, and purchase orders.
                The quota covers all types combined.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">How do I pay?</h3>
              <p className="text-sm text-ink/60 mt-1">
                All payments are made via M-Pesa. You&apos;ll receive an STK push
                prompt on your phone to complete the payment.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
