// components/DeliveryNoteEditor.tsx — Main page orchestrator for Delivery Note document
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useDeliveryNoteStore } from "@/lib/store/deliveryNoteStore";
import { useAuth } from "@/lib/hooks/useAuth";
import { DeliveryNoteForm } from "@/components/DeliveryNoteForm";
import { DeliveryNotePreview } from "@/components/DeliveryNotePreview";
import { DeliveryNoteOptionsSidebar } from "@/components/DeliveryNoteOptionsSidebar";
import { PaymentModal } from "@/components/PaymentModal";
import { UserNav } from "@/components/UserNav";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { DocumentTypeSwitcher } from "@/components/DocumentTypeSwitcher";

export function DeliveryNoteEditor() {
  const store = useDeliveryNoteStore();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showPayment, setShowPayment] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  // Validate required fields before save
  const validateForm = useCallback((): string | null => {
    if (!store.from.name.trim()) return "Please enter the sender's name (From)";
    if (!store.to.name.trim()) return "Please enter the recipient's name (To)";
    const hasValidItem = store.items.some((item) => item.description.trim());
    if (!hasValidItem) return "Please add at least one item with a description";
    return null;
  }, [store.from.name, store.to.name, store.items]);

  const saveDeliveryNote = useCallback(async (): Promise<string | null> => {
    // Client-side validation
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return null;
    }

    setSaving(true);
    try {
      // Helper to convert empty strings to undefined (for optional fields)
      const emptyToUndef = (val: string | null | undefined) => val?.trim() || undefined;

      const payload = {
        documentTitle: store.documentTitle,
        deliveryNoteNumber: store.deliveryNoteNumber || undefined,
        issueDate: store.issueDate,
        orderNumber: store.orderNumber || undefined,
        referenceInvoiceNumber: store.referenceInvoiceNumber || undefined,
        fromName: store.from.name,
        fromEmail: emptyToUndef(store.from.email),
        fromPhone: emptyToUndef(store.from.phone),
        fromAddress: emptyToUndef(store.from.address),
        fromCity: emptyToUndef(store.from.city),
        fromZipCode: emptyToUndef(store.from.zipCode),
        fromBusinessNumber: emptyToUndef(store.from.businessNumber),
        toName: store.to.name,
        toEmail: emptyToUndef(store.to.email),
        toPhone: emptyToUndef(store.to.phone),
        toAddress: emptyToUndef(store.to.address),
        toCity: emptyToUndef(store.to.city),
        toZipCode: emptyToUndef(store.to.zipCode),
        toBusinessNumber: emptyToUndef(store.to.businessNumber),
        acknowledgmentText: emptyToUndef(store.acknowledgmentText),
        notes: emptyToUndef(store.notes),
        accentColor: store.accentColor,
        logoDataUrl: store.logoDataUrl,
        signatureDataUrl: store.signatureDataUrl,
        photoDataUrls: store.photoDataUrls,
        items: store.items.map((item) => ({
          description: item.description,
          additionalDetails: emptyToUndef(item.additionalDetails),
          quantity: item.quantity,
        })),
      };

      let res: Response;
      if (store.currentDeliveryNoteId) {
        res = await fetch(`/api/delivery-notes/${store.currentDeliveryNoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/delivery-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save delivery note");
      }

      const data = await res.json();
      store.setMeta(data.id, data.publicId);
      if (data.deliveryNoteNumber) {
        store.setField("deliveryNoteNumber", data.deliveryNoteNumber);
      }

      return data.publicId;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save");
      return null;
    } finally {
      setSaving(false);
    }
  }, [store, validateForm]);

  const handleDownload = useCallback(async () => {
    // Force save if form was modified to create a new unpaid document
    const publicId = (store.isDirty || !store.currentPublicId)
      ? (await saveDeliveryNote())
      : store.currentPublicId;
    if (!publicId) return;

    const res = await fetch(`/api/documents/download-dn/${publicId}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${store.deliveryNoteNumber || "delivery-note"}.pdf`;
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
  }, [store.currentPublicId, store.isDirty, store.deliveryNoteNumber, saveDeliveryNote]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false);
    if (store.currentPublicId) {
      const a = document.createElement("a");
      a.href = `/api/documents/download-dn/${store.currentPublicId}`;
      a.download = `${store.deliveryNoteNumber || "delivery-note"}.pdf`;
      a.click();
    }
  }, [store.currentPublicId, store.deliveryNoteNumber]);

  const handleNew = useCallback(() => {
    if (confirm("Start a new document? Unsaved changes will be lost.")) {
      store.reset();
    }
  }, [store]);

  return (
    <div className="min-h-screen bg-mist/30">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-mist safe-top">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center shrink-0">
              <Link href="/" className="text-lg sm:text-xl font-display font-bold text-lagoon">
                Invopap
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
                <DeliveryNoteForm />

                {/* Mobile download button */}
                <div className="mt-6 pt-6 border-t border-mist lg:hidden">
                  <button
                    onClick={handleDownload}
                    disabled={saving}
                    className="w-full rounded-lg bg-ember py-3 px-4 font-medium text-white shadow-sm hover:bg-ember/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                </div>
              </div>
            ) : (
              <DeliveryNotePreview />
            )}
          </div>

          {/* Right: Options sidebar (desktop) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20">
              <DeliveryNoteOptionsSidebar
                onDownload={handleDownload}
                onNew={handleNew}
                saving={saving}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ─── Floating options button (mobile/tablet) ─── */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-30 lg:hidden rounded-full bg-lagoon p-3 text-white shadow-lg hover:bg-lagoon/90 transition-colors"
        aria-label="Toggle options"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

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
            <DeliveryNoteOptionsSidebar
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
          documentType="DELIVERY_NOTE"
        />
      )}
    </div>
  );
}
