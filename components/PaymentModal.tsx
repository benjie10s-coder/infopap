// components/PaymentModal.tsx — M-Pesa payment flow modal (all document types)
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type ModalState = "input" | "processing" | "success" | "error";

export type PayableDocumentType =
  | "INVOICE"
  | "CASH_SALE"
  | "DELIVERY_NOTE"
  | "RECEIPT"
  | "PURCHASE_ORDER"
  | "QUOTATION";

interface PaymentModalProps {
  publicId: string;
  onClose: () => void;
  onSuccess: () => void;
  documentType?: PayableDocumentType;
}

// Map document types to their status polling endpoints
function getStatusUrl(publicId: string, documentType: PayableDocumentType): string {
  switch (documentType) {
    case "INVOICE": return `/api/invoices/public/${publicId}/status`;
    case "CASH_SALE": return `/api/cash-sales/public/${publicId}/status`;
    case "DELIVERY_NOTE": return `/api/delivery-notes/public/${publicId}/status`;
    case "RECEIPT": return `/api/receipts/public/${publicId}/status`;
    case "PURCHASE_ORDER": return `/api/purchase-orders/public/${publicId}/status`;
    case "QUOTATION": return `/api/quotations/public/${publicId}/status`;
  }
}

export function PaymentModal({ publicId, onClose, onSuccess, documentType = "INVOICE" }: PaymentModalProps) {
  const [state, setState] = useState<ModalState>("input");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  // Poll for payment status when processing
  useEffect(() => {
    if (state !== "processing" || !checkoutRequestId) return;

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 24; // 24 × 5s = 120s max

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
        const res = await fetch(getStatusUrl(publicId, documentType));
        const data = await res.json();

        if (data.isPaid) {
          setState("success");
          return;
        }

        // Check payment status directly
        const payments = data.payments || [];
        const latest = payments[0];
        if (latest?.status === "COMPLETED") {
          setState("success");
          return;
        }
        if (latest?.status === "FAILED" || latest?.status === "CANCELLED") {
          setState("error");
          setError(
            latest.status === "CANCELLED"
              ? "Payment was cancelled. Please try again."
              : "Payment failed. Please try again."
          );
          return;
        }

        // Query Daraja directly every 8th poll (~40s) as a fallback.
        // Most payments resolve via the callback → status poll path.
        // Reducing from every 5th to every 8th cuts Safaricom API calls
        // by ~50% — critical at 500+ payments/day.
        if (pollCount % 8 === 0) {
          try {
            const queryRes = await fetch("/api/payments/query", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checkoutRequestId }),
            });
            const queryData = await queryRes.json();
            if (queryData.status === "COMPLETED") {
              setState("success");
              return;
            }
            if (queryData.status === "FAILED" || queryData.status === "CANCELLED") {
              setState("error");
              setError(queryData.resultDesc || "Payment failed.");
              return;
            }
          } catch {
            // Non-critical — continue polling
          }
        }
      } catch {
        // Network error — continue polling
      }

      if (!cancelled) {
        setTimeout(poll, 5000);
      }
    };

    // First poll after 4s — gives STK time to arrive on the phone
    const timeout = setTimeout(poll, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [state, checkoutRequestId, publicId, documentType]);

  // Auto-trigger download on success
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => {
        onSuccess();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, onSuccess]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      // Basic phone validation
      const cleaned = phone.replace(/\s/g, "");
      if (!/^(?:\+?254|0)[17]\d{8}$/.test(cleaned)) {
        setError("Please enter a valid Kenyan phone number (e.g. 0712345678)");
        return;
      }

      setState("processing");

      try {
        const res = await fetch("/api/payments/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId, phoneNumber: cleaned, documentType }),
        });

        const data = await res.json();

        if (!res.ok) {
          setState("error");
          setError(data.error || "Failed to initiate payment");
          return;
        }

        setCheckoutRequestId(data.checkoutRequestId);
        // Stay in processing state — polling will handle the rest
      } catch {
        setState("error");
        setError("Network error. Please try again.");
      }
    },
    [phone, publicId, documentType]
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-soft w-full max-w-md p-6 animate-fadeUp">
        {/* Close button - always visible except during success */}
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
            ) : state === "error" ? (
              <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-lagoon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
          </div>

          <h2 className="text-lg font-display font-bold text-ink">
            {state === "input" && "Pay via M-Pesa"}
            {state === "processing" && "Waiting for Payment..."}
            {state === "success" && "Payment Confirmed!"}
            {state === "error" && "Payment Issue"}
          </h2>

          <p className="text-sm text-ink/50 mt-1">
            {state === "input" &&
              "Enter your M-Pesa number to download the clean document. Just KSh 10."}
            {state === "processing" &&
              "Check your phone for the M-Pesa prompt. Enter your PIN to complete."}
            {state === "success" &&
              "Your document is downloading now..."}
            {state === "error" && error}
          </p>
        </div>

        {/* Input state */}
        {state === "input" && (<>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full rounded-lg border border-mist px-4 py-3 text-base text-ink placeholder:text-ink/30 focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
                autoFocus={typeof window !== 'undefined' && window.innerWidth >= 640}
              />
              <p className="text-xs text-ink/40 mt-1">
                Format: 07XX, 01XX, +254XX
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-mist px-4 py-3 text-ink/60 font-medium hover:bg-mist/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-lagoon px-6 py-3 text-white font-medium hover:bg-lagoon/90 transition-colors"
              >
                Pay KSh 10
              </button>
            </div>
          </form>

          {/* Upsell banner */}
          <div className="mt-4 rounded-lg bg-lagoon/5 border border-lagoon/10 px-4 py-3">
            <Link
              href="/pricing"
              className="flex items-center justify-between text-sm group"
              onClick={onClose}
            >
              <span className="text-ink/60">
                <span className="font-medium text-lagoon">Save with a plan</span>
                {" — from KSh 5/doc"}
              </span>
              <svg className="h-4 w-4 text-lagoon group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>)}

        {/* Processing state */}
        {state === "processing" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full border-4 border-mist border-t-lagoon animate-spin" />
            <p className="text-sm text-ink/40">
              This usually takes 10-30 seconds...
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 text-sm text-ink/50 hover:text-ink underline transition-colors"
            >
              Cancel and close
            </button>
          </div>
        )}

        {/* Success state */}
        {state === "success" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-mist px-4 py-3 text-sm text-ink/60 hover:bg-mist/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setState("input");
                setError("");
              }}
              className="flex-1 rounded-lg bg-lagoon px-4 py-3 text-sm text-white font-medium hover:bg-lagoon/90 transition-colors"
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
