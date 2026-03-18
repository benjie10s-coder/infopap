// app/dashboard/subscription/SubscriptionClient.tsx — Client component for subscription management
"use client";

import { useState } from "react";
import Link from "next/link";
import { UserNav } from "@/components/UserNav";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { SubscriptionPaymentModal } from "@/components/SubscriptionPaymentModal";
import { PLANS, PAY_AS_YOU_GO, type PlanConfig } from "@/lib/plans";
import type { Subscription } from "@/lib/db/types";

interface SubscriptionClientProps {
  user: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
  activeSubscription: Subscription | null;
  subscriptionHistory: Subscription[];
}

const CheckIcon = () => (
  <svg className="h-4 w-4 text-lagoon shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

function planLabel(plan: string): string {
  switch (plan) {
    case "BASIC": return "Basic";
    case "GROWTH": return "Growth";
    case "SCALE": return "Scale";
    default: return plan;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>;
    case "EXHAUSTED":
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Exhausted</span>;
    case "EXPIRED":
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Expired</span>;
    default:
      return <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-ink/50">{status}</span>;
  }
}

export function SubscriptionClient({
  user,
  activeSubscription,
  subscriptionHistory,
}: SubscriptionClientProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);

  const hasActive = !!activeSubscription;
  const usagePercent = hasActive
    ? Math.round((activeSubscription.documentsUsed / activeSubscription.documentsLimit) * 100)
    : 0;
  const remaining = hasActive
    ? activeSubscription.documentsLimit - activeSubscription.documentsUsed
    : 0;

  return (
    <div className="min-h-screen bg-mist/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-mist bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3 pl-16">
          <Link href="/dashboard" className="text-xl font-display font-bold text-lagoon">
            InvoSafi
          </Link>
          <UserNav user={user} />
        </div>
      </header>

      <NarrowSidebarRail />

      <main className="pl-14 px-4 sm:px-8 py-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-ink">My Plan</h1>
          <p className="text-sm text-ink/50 mt-1">
            Manage your subscription and view usage
          </p>
        </div>

        {/* Active Subscription Card */}
        {hasActive ? (
          <div className="rounded-2xl border border-mist bg-white p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-display font-bold text-ink">
                    {planLabel(activeSubscription.plan)} Plan
                  </h2>
                  {statusBadge(activeSubscription.status)}
                </div>
                <p className="text-sm text-ink/50 mt-1">
                  Purchased {activeSubscription.purchasedAt
                    ? new Date(activeSubscription.purchasedAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-ink/50">Expires</p>
                <p className="text-sm font-medium text-ink">
                  {activeSubscription.expiresAt
                    ? new Date(activeSubscription.expiresAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>

            {/* Usage bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-ink/60">
                  {activeSubscription.documentsUsed} / {activeSubscription.documentsLimit} documents used
                </span>
                <span className="font-medium text-ink">
                  {remaining} remaining
                </span>
              </div>
              <div className="h-3 rounded-full bg-mist overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent >= 90
                      ? "bg-red-500"
                      : usagePercent >= 70
                        ? "bg-amber-500"
                        : "bg-lagoon"
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Renew/Upgrade CTAs */}
            {(usagePercent >= 80 || activeSubscription.status === "EXHAUSTED") && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-mist">
                <button
                  onClick={() => {
                    const currentPlan = PLANS.find((p) => p.type === activeSubscription.plan);
                    if (currentPlan) setSelectedPlan(currentPlan);
                  }}
                  className="rounded-lg bg-lagoon px-4 py-2.5 text-sm font-medium text-white hover:bg-lagoon/90 transition-colors"
                >
                  Renew Plan
                </button>
                {activeSubscription.plan !== "SCALE" && (
                  <button
                    onClick={() => {
                      const currentIdx = PLANS.findIndex((p) => p.type === activeSubscription.plan);
                      const upgradePlan = PLANS[currentIdx + 1];
                      if (upgradePlan) setSelectedPlan(upgradePlan);
                    }}
                    className="rounded-lg border border-lagoon px-4 py-2.5 text-sm font-medium text-lagoon hover:bg-lagoon/5 transition-colors"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-mist bg-white p-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mist">
                <svg className="h-5 w-5 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-ink">Pay As You Go</h2>
                <p className="text-sm text-ink/50">KSh 10 per document download via M-Pesa</p>
              </div>
            </div>
            <p className="text-sm text-ink/50 mt-2">
              You&apos;re on the default plan. Subscribe below to save up to 57% on document downloads.
            </p>
          </div>
        )}

        {/* Plan Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-display font-bold text-ink mb-4">
            {hasActive ? "Change Plan" : "Choose a Plan"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((plan, i) => {
              const isPopular = i === 1;
              const isCurrent = hasActive && activeSubscription.plan === plan.type;
              return (
                <div
                  key={plan.type}
                  className={`rounded-2xl border p-5 flex flex-col relative ${
                    isPopular
                      ? "border-lagoon bg-lagoon/[0.02] ring-1 ring-lagoon/20"
                      : "border-mist bg-white"
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lagoon px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Popular
                    </span>
                  )}
                  <h3 className="text-lg font-display font-bold text-ink">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-ink">
                      KSh {plan.price.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-ink/50 mt-1">
                    {plan.documentsLimit} docs · {plan.perDocPrice}/doc
                  </p>
                  <p className="text-xs text-ink/40 mt-0.5 mb-4">
                    Valid for 1 year
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-ink/70">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setSelectedPlan(plan)}
                    disabled={isCurrent}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                      isCurrent
                        ? "bg-mist text-ink/40 cursor-not-allowed"
                        : isPopular
                          ? "bg-lagoon text-white hover:bg-lagoon/90"
                          : "bg-ink/5 text-ink hover:bg-ink/10"
                    }`}
                  >
                    {isCurrent ? "Current Plan" : `Get ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pay As You Go reminder */}
        <div className="rounded-xl border border-mist bg-white px-5 py-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mist/70">
              <svg className="h-4 w-4 text-ink/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-ink/60">
              <span className="font-medium text-ink/80">Pay As You Go</span> is always available.
              Even with an exhausted or expired plan, you can still download documents for KSh {PAY_AS_YOU_GO.price} each via M-Pesa.
            </p>
          </div>
        </div>

        {/* Subscription History */}
        {subscriptionHistory.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-bold text-ink mb-4">
              Subscription History
            </h2>
            <div className="rounded-xl border border-mist bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mist bg-mist/30">
                    <th className="text-left px-4 py-3 font-medium text-ink/60">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-ink/60">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-ink/60">Usage</th>
                    <th className="text-left px-4 py-3 font-medium text-ink/60">Purchased</th>
                     <th className="text-left px-4 py-3 font-medium text-ink/60">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionHistory.map((sub) => (
                    <tr key={sub.id} className="border-b border-mist last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">
                        {planLabel(sub.plan)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                      <td className="px-4 py-3 text-ink/70">
                        {sub.documentsUsed} / {sub.documentsLimit}
                      </td>
                      <td className="px-4 py-3 text-ink/50">
                        {sub.purchasedAt
                          ? new Date(sub.purchasedAt).toLocaleDateString("en-KE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink/50">
                        {sub.expiresAt
                          ? new Date(sub.expiresAt).toLocaleDateString("en-KE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Subscription Payment Modal */}
      {selectedPlan && (
        <SubscriptionPaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={() => {
            setSelectedPlan(null);
            // Refresh page to show updated subscription
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
