// components/SubscriptionPaymentModal.tsx — M-Pesa payment modal for plan subscriptions
"use client";

import { useState, useEffect, useCallback } from "react";
import type { PlanConfig } from "@/lib/plans";

type ModalState = "input" | "processing" | "success" | "error";

interface SubscriptionPaymentModalProps {
  plan: PlanConfig;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubscriptionPaymentModal({
  plan,
  onClose,
  onSuccess,
}: SubscriptionPaymentModalProps) {
  const [state, setState] = useState<ModalState>("input");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // Poll subscription status
  useEffect(() => {
    if (state !== "processing" || !subscriptionId) return;

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 24; // 24 × 5s = 120s

    const poll = async () => {
      if (cancelled || pollCount >= maxPolls) {
        if (!cancelled && pollCount >= maxPolls) {
          setState("error");
          setError("Payment timeout. Please check your M-Pesa messages and try again.");
        }
        return;
      }

      pollCount++;

      try {
        const res = await fetch(
          `/api/subscriptions/status?subscriptionId=${encodeURIComponent(subscriptionId)}`
        );
        const data = await res.json();

        if (data.status === "ACTIVE") {
          setState("success");
          return;
        }
        if (data.status === "FAILED" || data.status === "CANCELLED") {
          setState("error");
          setError(
            data.status === "CANCELLED"
              ? "Payment was cancelled. Please try again."
              : "Payment failed. Please try again."
          );
          return;
        }
      } catch {
        // Network error — continue polling
      }

      if (!cancelled) {
        setTimeout(poll, 5000);
      }
    };

    const timeout = setTimeout(poll, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [state, subscriptionId]);

  // Auto-trigger success callback
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => onSuccess(), 1500);
      return () => clearTimeout(timer);
    }
  }, [state, onSuccess]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      const cleaned = phone.replace(/\s/g, "");
      if (!/^(?:\+?254|0)[17]\d{8}$/.test(cleaned)) {
        setError("Please enter a valid Kenyan phone number (e.g. 0712345678)");
        return;
      }

      setState("processing");

      try {
        const res = await fetch("/api/subscriptions/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: plan.type, phoneNumber: cleaned }),
        });

        const data = await res.json();

        if (!res.ok) {
          setState("error");
          setError(data.error || "Failed to initiate payment");
          return;
        }

        setSubscriptionId(data.subscriptionId);
      } catch {
        setState("error");
        setError("Network error. Please try again.");
      }
    },
    [phone, plan.type]
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-soft w-full max-w-md p-6 animate-fadeUp">
          {/* Close button */}
          {state !== "success" && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 text-ink/50 hover:text-ink transition-colors p-2 rounded-full hover:bg-mist/50 z-10"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-lagoon/10 mb-3">
              {state === "success" ? (
                <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-7 w-7 text-lagoon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-display font-bold text-ink">
              {state === "success"
                ? "Subscription Activated!"
                : state === "processing"
                  ? "Confirm on Your Phone"
                  : `Subscribe to ${plan.name}`}
            </h2>
            {state === "input" && (
              <p className="text-sm text-ink/50 mt-1">
                KSh {plan.price.toLocaleString()} · {plan.documentsLimit} documents · Valid 1 year
              </p>
            )}
          </div>

          {/* Input state */}
          {state === "input" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Plan summary */}
              <div className="rounded-xl bg-mist/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink/60">{plan.name} Plan</span>
                  <span className="text-lg font-bold text-ink">KSh {plan.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-ink/40">Per document</span>
                  <span className="text-sm text-lagoon font-medium">{plan.perDocPrice}</span>
                </div>
              </div>

              <div>
                <label htmlFor="sub-phone" className="block text-sm font-medium text-ink/70 mb-1.5">
                  M-Pesa Phone Number
                </label>
                <input
                  id="sub-phone"
                  type="tel"
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-mist px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-lagoon/30 focus:border-lagoon transition-colors"
                  autoFocus
                  autoComplete="tel"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-lagoon py-3 text-sm font-semibold text-white hover:bg-lagoon/90 transition-colors"
              >
                Pay KSh {plan.price.toLocaleString()} via M-Pesa
              </button>
            </form>
          )}

          {/* Processing state */}
          {state === "processing" && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full border-4 border-mist border-t-lagoon animate-spin" />
              </div>
              <p className="text-sm text-ink/60 mb-1">
                Check your phone for the M-Pesa prompt
              </p>
              <p className="text-xs text-ink/40">
                Enter your M-Pesa PIN to pay KSh {plan.price.toLocaleString()}
              </p>
            </div>
          )}

          {/* Success state */}
          {state === "success" && (
            <div className="text-center py-4">
              <p className="text-sm text-ink/60 mb-1">
                Your {plan.name} plan is now active
              </p>
              <p className="text-xs text-ink/40">
                {plan.documentsLimit} document downloads included
              </p>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="space-y-4">
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
              <button
                onClick={() => {
                  setState("input");
                  setError("");
                  setSubscriptionId(null);
                }}
                className="w-full rounded-xl bg-lagoon py-3 text-sm font-semibold text-white hover:bg-lagoon/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
