// app/view/quotation/[publicId]/PublicQuotationView.tsx — Client-side public quotation viewer
"use client";

import { useState, useCallback, useMemo } from "react";
import type { QuotationWithItems } from "@/lib/db/types";
import { QuotationPdf } from "@/lib/pdf-components/quotation";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";

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

export function PublicQuotationView({
  quotation: q,
}: {
  quotation: QuotationData;
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

  const handleDownload = useCallback(() => {
    if (!q.isPaid) {
      setShowPayment(true);
      return;
    }
    // Paid — show share options
    setShowShare(true);
  }, [q.isPaid]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false);
    // Show share modal after successful payment
    setShowShare(true);
  }, []);

  return (
    <div className="min-h-screen bg-mist/30">
      {/* Top bar */}
      <header className="bg-white border-b border-mist">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-lg font-display font-bold text-lagoon">
            Invopap
          </span>
          <button
            onClick={handleDownload}
            className="rounded-lg bg-ember px-4 py-2 text-sm font-medium text-white hover:bg-ember/90 transition-colors flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {q.isPaid ? "Download / Share" : "Download PDF (KSh 10)"}
          </button>
        </div>
      </header>

      {/* Quotation */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PdfPreview document={<QuotationPdf quotation={quotationRecord} showWatermark={!q.isPaid} />} />

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-ink/30">
            Created with{" "}
            <a href="/" className="text-lagoon hover:underline" target="_blank">Invopap</a>
          </p>
        </div>
      </div>

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

