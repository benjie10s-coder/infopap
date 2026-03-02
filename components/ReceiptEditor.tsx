// components/ReceiptEditor.tsx — Main page orchestrator for Receipt document
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useReceiptStore } from "@/lib/store/receiptStore";
import { useAuth } from "@/lib/hooks/useAuth";
import { ReceiptForm } from "@/components/ReceiptForm";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { ReceiptOptionsSidebar } from "@/components/ReceiptOptionsSidebar";
import { PaymentModal } from "@/components/PaymentModal";
import { UserNav } from "@/components/UserNav";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";

export function ReceiptEditor() {
  const store = useReceiptStore();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showPayment, setShowPayment] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveReceipt = useCallback(async (): Promise<string | null> => {
    setSaving(true);
    try {
      const payload = {
        documentTitle: store.documentTitle,
        receiptNumber: store.receiptNumber || undefined,
        issueDate: store.issueDate,
        fromName: store.from.name,
        fromEmail: store.from.email || undefined,
        fromPhone: store.from.phone || undefined,
        fromAddress: store.from.address || undefined,
        fromCity: store.from.city || undefined,
        fromZipCode: store.from.zipCode || undefined,
        fromBusinessNumber: store.from.businessNumber || undefined,
        toName: store.to.name,
        toEmail: store.to.email || undefined,
        toPhone: store.to.phone || undefined,
        toAddress: store.to.address || undefined,
        toCity: store.to.city || undefined,
        toZipCode: store.to.zipCode || undefined,
        toBusinessNumber: store.to.businessNumber || undefined,
        currency: store.currency.code,
        totalAmountOwed: store.totalAmountOwed,
        amountReceived: store.amountReceived,
        outstandingBalance: store.outstandingBalance,
        amountInWords: store.amountInWords,
        beingPaymentOf: store.beingPaymentOf,
        paymentMethod: store.paymentMethod || undefined,
        transactionCode: store.transactionCode || undefined,
        notes: store.notes,
        accentColor: store.accentColor,
        logoDataUrl: store.logoDataUrl,
        signatureDataUrl: store.signatureDataUrl,
        photoDataUrls: store.photoDataUrls,
      };

      let res: Response;
      if (store.currentReceiptId) {
        res = await fetch(`/api/receipts/${store.currentReceiptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save receipt");
      }

      const data = await res.json();
      store.setMeta(data.id, data.publicId);
      if (data.receiptNumber) {
        store.setField("receiptNumber", data.receiptNumber);
      }

      return data.publicId;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save");
      return null;
    } finally {
      setSaving(false);
    }
  }, [store]);

  const handleDownload = useCallback(async () => {
    const publicId = store.currentPublicId || (await saveReceipt());
    if (!publicId) return;

    const res = await fetch(`/api/documents/download-receipt/${publicId}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${store.receiptNumber || "receipt"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (res.status === 402) {
      setShowPayment(true);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to download");
    }
  }, [store.currentPublicId, store.receiptNumber, saveReceipt]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false);
    if (store.currentPublicId) {
      const a = document.createElement("a");
      a.href = `/api/documents/download-receipt/${store.currentPublicId}`;
      a.download = `${store.receiptNumber || "receipt"}.pdf`;
      a.click();
    }
  }, [store.currentPublicId, store.receiptNumber]);

  const handleNew = useCallback(() => {
    if (confirm("Start a new document? Unsaved changes will be lost.")) {
      store.reset();
    }
  }, [store]);

  return (
    <div className="min-h-screen bg-mist/30">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-mist safe-top">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center shrink-0">
              <Link href="/" className="text-lg sm:text-xl font-display font-bold text-lagoon">
                Invopap
              </Link>
            </div>

            <div className="flex items-center bg-mist/60 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  activeTab === "preview" ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink/70"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  activeTab === "edit" ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink/70"
                }`}
              >
                Edit
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {!authLoading && (
                <>
                  {user ? (
                    <UserNav
                      user={{
                        displayName:
                          user.user_metadata?.full_name ||
                          user.email?.split("@")[0] ||
                          "User",
                        email: user.email || "",
                        avatarUrl: user.user_metadata?.avatar_url || null,
                      }}
                    />
                  ) : (
                    <div className="hidden sm:flex items-center gap-1">
                      <Link
                        href="/auth/login"
                        className="rounded-lg px-3 py-1.5 text-sm text-ink/60 hover:text-ink hover:bg-mist/50 transition-colors"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/auth/signup"
                        className="rounded-lg bg-lagoon px-3 py-1.5 text-sm font-medium text-white hover:bg-lagoon/90 transition-colors"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => setShowOptions(!showOptions)}
                className="rounded-lg border border-mist p-2 text-ink/40 hover:text-ink hover:bg-mist/50 transition-colors lg:hidden touch-target flex items-center justify-center"
                aria-label="Toggle options"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Narrow sidebar rail for logged-in users */}
      {user && <NarrowSidebarRail />}

      {/* ─── Main content: 2-column layout ─── */}
      <div className={user ? "pl-14" : ""}>
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            {activeTab === "edit" ? (
              <div className="bg-white rounded-xl border border-mist shadow-sm p-4 sm:p-6 md:p-8">
                <ReceiptForm />
              </div>
            ) : (
              <ReceiptPreview />
            )}
          </div>

          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-16 z-10 space-y-4">
              <ReceiptOptionsSidebar
                onDownload={handleDownload}
                onNew={handleNew}
                saving={saving}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ─── Options drawer (mobile) ─── */}
      {showOptions && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/30 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setShowOptions(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-white rounded-t-2xl animate-fadeUp safe-bottom">
            <div className="sticky top-0 bg-white flex justify-between items-center px-4 py-3 border-b border-mist z-10">
              <h3 className="font-semibold text-ink">Options</h3>
              <button
                onClick={() => setShowOptions(false)}
                className="text-ink/30 hover:text-ink p-2 -mr-2 touch-target flex items-center justify-center"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ReceiptOptionsSidebar
              onDownload={handleDownload}
              onNew={handleNew}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* ─── Payment modal ─── */}
      {showPayment && store.currentPublicId && (
        <PaymentModal
          publicId={store.currentPublicId}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          documentType="RECEIPT"
        />
      )}
    </div>
  );
}
