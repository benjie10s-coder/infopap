// components/CashSaleEditor.tsx — Main page orchestrator for Cash Sale document (responsive)
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useCashSaleStore } from "@/lib/store/cashSaleStore";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBusinessProfile } from "@/lib/hooks/useBusinessProfile";
import { usePrefillPreference } from "@/lib/hooks/usePrefillPreference";
import { CashSaleForm } from "@/components/CashSaleForm";
import { DocumentPreviewShell } from "@/components/DocumentPreviewShell";
import { CashSaleHtmlPreview } from "@/components/html-preview/CashSaleHtmlPreview";
import { CashSaleOptionsSidebar } from "@/components/CashSaleOptionsSidebar";
import { PaymentModal } from "@/components/PaymentModal";
import { PrefillPrompt } from "@/components/PrefillPrompt";
import { UserNav } from "@/components/UserNav";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { FloatingOptionsButton } from "@/components/FloatingOptionsButton";
import { DownloadButton } from "@/components/DownloadButton";

export function CashSaleEditor() {
  const store = useCashSaleStore();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useBusinessProfile();
  const { preference, setPreference } = usePrefillPreference();

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showPayment, setShowPayment] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrefillPrompt, setShowPrefillPrompt] = useState(false);
  const prefillCheckedRef = useRef(false);

  const applyPrefill = useCallback(() => {
    if (!profile) return;
    store.setField("from.name", profile.name);
    store.setField("from.email", profile.email);
    store.setField("from.phone", profile.phone);
    store.setField("from.address", profile.address);
    store.setField("from.city", profile.city);
    store.setField("from.zipCode", profile.zipCode);
    store.setField("from.businessNumber", profile.businessNumber);
  }, [store, profile]);

  useEffect(() => {
    if (authLoading || profileLoading || !user) return;
    if (prefillCheckedRef.current) return;
    if (store.currentCashSaleId !== null || store.from.name.trim() !== "") return;
    prefillCheckedRef.current = true;
    if (preference === "always" && profile) {
      applyPrefill();
    } else if (preference === "ask") {
      setShowPrefillPrompt(true);
    }
  }, [authLoading, profileLoading, user, preference, profile, store.currentCashSaleId, store.from.name, applyPrefill]);

  // Save cash sale to API, return the publicId
  const saveCashSale = useCallback(async (): Promise<string | null> => {
    setSaving(true);
    try {
      const payload = {
        documentTitle: store.documentTitle,
        cashSaleNumber: store.cashSaleNumber || undefined,
        issueDate: store.issueDate,
        orderNumber: store.orderNumber || undefined,
        referenceInvoiceNumber: store.referenceInvoiceNumber || undefined,
        paymentMethod: store.paymentMethod,
        transactionCode: store.transactionCode || undefined,
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
        notes: store.notes || undefined,
        taxRate: store.taxRate,
        discountType: store.discountType === "percentage" ? "PERCENTAGE" : "FIXED",
        discountValue: store.discountValue,
        currency: store.currency.code,
        accentColor: store.accentColor,
        logoDataUrl: store.logoDataUrl,
        signatureDataUrl: store.signatureDataUrl,
        photoDataUrls: store.photoDataUrls,
        items: store.items.map((item) => ({
          description: item.description,
          additionalDetails: item.additionalDetails,
          quantity: item.quantity,
          rate: item.rate,
        })),
      };

      let res: Response;
      if (store.currentCashSaleId) {
        res = await fetch(`/api/cash-sales/${store.currentCashSaleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/cash-sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save cash sale");
      }

      const data = await res.json();
      store.setMeta(data.id, data.publicId);
      if (data.cashSaleNumber) {
        store.setField("cashSaleNumber", data.cashSaleNumber);
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
    const publicId = store.currentPublicId || (await saveCashSale());
    if (!publicId) return;

    const res = await fetch(`/api/documents/download-cs/${publicId}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${store.cashSaleNumber || "cash-sale"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (res.status === 402) {
      setShowOptions(false);
      setShowPayment(true);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to download");
    }
  }, [store.currentPublicId, store.cashSaleNumber, saveCashSale]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false);
    if (store.currentPublicId) {
      const a = document.createElement("a");
      a.href = `/api/documents/download-cs/${store.currentPublicId}`;
      a.download = `${store.cashSaleNumber || "cash-sale"}.pdf`;
      a.click();
    }
  }, [store.currentPublicId, store.cashSaleNumber]);

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
                InvoSafi
              </Link>
            </div>

          {/* Center: Preview / Edit toggle */}
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

          {/* Right: Auth + mobile options toggle */}
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
                  <div className="flex items-center gap-1">
                    <Link
                      href="/auth/login"
                      className="rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-ink/60 hover:text-ink hover:bg-mist/50 transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="rounded-lg bg-lagoon px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-lagoon/90 transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </>
            )}
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
          {/* Left: Form or Preview */}
          <div className="flex-1 min-w-0">
            {activeTab === "edit" ? (
              <div className="bg-white rounded-xl border border-mist shadow-sm p-4 sm:p-6 md:p-8">
                <CashSaleForm />
              </div>
            ) : (
              <DocumentPreviewShell>
                <CashSaleHtmlPreview />
              </DocumentPreviewShell>
            )}

            {/* Download button at end of document (mobile/tablet) */}
            <div className="mt-4 lg:hidden">
              <DownloadButton onDownload={handleDownload} saving={saving} />
            </div>
          </div>

          {/* Right: Options sidebar (desktop) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-16 z-10 max-h-[calc(100vh-5rem)] overflow-y-auto space-y-4">
              <CashSaleOptionsSidebar
                onDownload={handleDownload}
                onNew={handleNew}
                saving={saving}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Floating options button (mobile/tablet) */}
      <FloatingOptionsButton
        onToggle={() => setShowOptions(!showOptions)}
        visible={!showOptions}
      />

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
            <CashSaleOptionsSidebar
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
          documentType="CASH_SALE"
        />
      )}

      {/* ─── Prefill prompt ─── */}
      {showPrefillPrompt && (
        <PrefillPrompt
          hasProfile={!!profile?.name}
          onAccept={() => {
            setShowPrefillPrompt(false);
            applyPrefill();
          }}
          onDecline={() => setShowPrefillPrompt(false)}
          onRemember={setPreference}
        />
      )}
    </div>
  );
}
