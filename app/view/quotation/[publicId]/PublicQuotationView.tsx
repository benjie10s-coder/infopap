// app/view/quotation/[publicId]/PublicQuotationView.tsx — Client-side public quotation viewer
"use client";

import { useState, useMemo } from "react";
import type { QuotationWithItems } from "@/lib/db/types";
import { QuotationPdf } from "@/lib/pdf-components/quotation";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";
import { ViewActionsSidebar } from "@/components/ViewActionsSidebar";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { UserNav } from "@/components/UserNav";
import Link from "next/link";

interface QuotationData {
  id: string;
  publicId: string;
  quotationNumber: string;
  documentTitle: string;
  accentColor: string;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromMobile: string | null;
  fromFax: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromZipCode: string | null;
  fromBusinessNumber: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toMobile: string | null;
  toFax: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  quotationDate: string;
  validUntil: string | null;
  currency: string;
  discountType: string;
  discountValue: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  termsAndConditions: string | null;
  notes: string | null;
  isPaid: boolean;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  lineItems: Array<{
    id: string;
    description: string;
    additionalDetails: string | null;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  photos: Array<{ id: string; url: string }>;
  userId: string | null;
}

type ViewUser = { displayName: string; email: string; avatarUrl: string | null } | null;

export function PublicQuotationView({
  quotation: q,
  user,
}: {
  quotation: QuotationData;
  user: ViewUser;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const isGuest = !q.userId;

  const quotationRecord = useMemo((): QuotationWithItems => ({
    id: q.id,
    userId: q.userId,
    guestSessionId: null,
    publicId: q.publicId,
    documentTitle: q.documentTitle,
    quotationNumber: q.quotationNumber,
    quotationDate: q.quotationDate,
    validUntil: q.validUntil,
    fromName: q.fromName,
    fromEmail: q.fromEmail,
    fromPhone: q.fromPhone,
    fromMobile: q.fromMobile,
    fromFax: q.fromFax,
    fromAddress: q.fromAddress,
    fromCity: q.fromCity,
    fromZipCode: q.fromZipCode,
    fromBusinessNumber: q.fromBusinessNumber,
    toName: q.toName,
    toEmail: q.toEmail,
    toPhone: q.toPhone,
    toMobile: q.toMobile,
    toFax: q.toFax,
    toAddress: q.toAddress,
    toCity: q.toCity,
    toZipCode: q.toZipCode,
    toBusinessNumber: q.toBusinessNumber,
    currency: q.currency,
    discountType: q.discountType,
    discountValue: q.discountValue,
    subtotal: q.subtotal,
    discountAmount: q.discountAmount,
    total: q.total,
    accentColor: q.accentColor,
    logoDataUrl: q.logoDataUrl,
    signatureDataUrl: q.signatureDataUrl,
    termsAndConditions: q.termsAndConditions,
    notes: q.notes,
    isPaid: q.isPaid,
    paidAt: null,
    pdfUrl: null,
    createdAt: "",
    updatedAt: "",
    lineItems: q.lineItems.map((li, i) => ({
      id: li.id,
      quotationId: q.id,
      description: li.description,
      additionalDetails: li.additionalDetails,
      quantity: li.quantity,
      rate: li.rate,
      amount: li.amount,
      sortOrder: i,
      createdAt: "",
      updatedAt: "",
    })),
    photos: q.photos.map((p, i) => ({
      id: p.id,
      quotationId: q.id,
      url: p.url,
      filename: null,
      sortOrder: i,
      createdAt: "",
    })),
  }), [q]);

  function handlePaymentSuccess() {
    setShowPayment(false);
    setShowShare(true);
  }

  return (
    <div className="min-h-screen bg-mist/30">
      {/* Sticky header — consistent with the rest of the site */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-mist">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-display font-bold text-lagoon">
              Invopap
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <UserNav user={user} />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-ink/60 hover:text-ink transition-colors hidden sm:inline"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-lg bg-lagoon px-4 py-2 text-sm font-medium text-white hover:bg-lagoon/90 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Left nav rail — authenticated users only */}
      {user && <NarrowSidebarRail />}

      {/* Right actions sidebar */}
      <ViewActionsSidebar
        isPaid={q.isPaid}
        onPay={() => setShowPayment(true)}
        onShare={() => setShowShare(true)}
      />

      {/* Document content */}
      <div className={`${user ? "pl-14" : ""} lg:pr-64`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PdfPreview document={<QuotationPdf quotation={quotationRecord} showWatermark={!q.isPaid} />} />

          {/* Mobile action bar */}
          <div className="lg:hidden flex gap-3 mt-6">
            {q.isPaid ? (
              <button
                onClick={() => setShowShare(true)}
                className="flex-1 rounded-lg bg-ember px-4 py-3 text-sm font-medium text-white hover:bg-ember/90 transition-colors"
              >
                Download / Share
              </button>
            ) : (
              <button
                onClick={() => setShowPayment(true)}
                className="flex-1 rounded-lg bg-ember px-4 py-3 text-sm font-medium text-white hover:bg-ember/90 transition-colors"
              >
                Download PDF — KSh 10
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer — full width, outside the sidebar-padded area */}
      <footer className="text-center text-xs text-ink/30 py-6 border-t border-mist">
        Powered by{" "}
        <a href="/" className="text-lagoon hover:underline">Invopap</a>{" "}
        · <a href="/terms" className="hover:underline">Terms</a>{" "}
        · <a href="/privacy" className="hover:underline">Privacy</a>
      </footer>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          publicId={q.publicId}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          documentType="QUOTATION"
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          publicId={q.publicId}
          documentNumber={q.quotationNumber}
          documentType="quotation"
          downloadUrl={`/api/documents/download-quotation/${q.publicId}`}
          onClose={() => setShowShare(false)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}

