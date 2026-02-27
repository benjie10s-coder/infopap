// app/view/receipt/[publicId]/PublicReceiptView.tsx — Client-side public receipt viewer
"use client";

import { useState, useCallback, useMemo } from "react";
import type { ReceiptWithPhotos } from "@/lib/db/types";
import { ReceiptPdf } from "@/lib/pdf-components/receipt";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";

interface ReceiptData {
  id: string;
  publicId: string;
  receiptNumber: string;
  documentTitle: string;
  accentColor: string;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromZipCode: string | null;
  fromBusinessNumber: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  issueDate: string;
  currency: string;
  totalAmountOwed: number;
  amountReceived: number;
  outstandingBalance: number;
  amountInWords: string | null;
  beingPaymentOf: string | null;
  paymentMethod: string;
  transactionCode: string | null;
  notes: string | null;
  isPaid: boolean;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  photos: Array<{ id: string; url: string }>;
  userId: string | null;
}

export function PublicReceiptView({
  receipt: r,
}: {
  receipt: ReceiptData;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const isGuest = !r.userId;

  const receiptRecord = useMemo((): ReceiptWithPhotos => ({
    id: r.id,
    userId: r.userId,
    guestSessionId: null,
    publicId: r.publicId,
    documentTitle: r.documentTitle,
    receiptNumber: r.receiptNumber,
    issueDate: r.issueDate,
    fromName: r.fromName,
    fromEmail: r.fromEmail,
    fromPhone: r.fromPhone,
    fromMobile: null,
    fromFax: null,
    fromAddress: r.fromAddress,
    fromCity: r.fromCity,
    fromZipCode: r.fromZipCode,
    fromBusinessNumber: r.fromBusinessNumber,
    toName: r.toName,
    toEmail: r.toEmail,
    toPhone: r.toPhone,
    toMobile: null,
    toFax: null,
    toAddress: r.toAddress,
    toCity: r.toCity,
    toZipCode: r.toZipCode,
    toBusinessNumber: r.toBusinessNumber,
    currency: r.currency,
    totalAmountOwed: r.totalAmountOwed,
    amountReceived: r.amountReceived,
    outstandingBalance: r.outstandingBalance,
    amountInWords: r.amountInWords,
    beingPaymentOf: r.beingPaymentOf,
    paymentMethod: r.paymentMethod,
    transactionCode: r.transactionCode,
    accentColor: r.accentColor,
    logoDataUrl: r.logoDataUrl,
    signatureDataUrl: r.signatureDataUrl,
    notes: r.notes,
    isPaid: r.isPaid,
    paidAt: null,
    pdfUrl: null,
    createdAt: "",
    updatedAt: "",
    photos: r.photos.map((p, i) => ({
      id: p.id,
      receiptId: r.id,
      url: p.url,
      filename: null,
      sortOrder: i,
      createdAt: "",
    })),
  }), [r]);

  const handleDownload = useCallback(() => {
    if (!r.isPaid) {
      setShowPayment(true);
      return;
    }
    // Paid — show share options
    setShowShare(true);
  }, [r.isPaid]);

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
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {r.isPaid ? "Download / Share" : "Download PDF (KSh 10)"}
          </button>
        </div>
      </header>

      {/* Receipt */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PdfPreview document={<ReceiptPdf receipt={receiptRecord} showWatermark={!r.isPaid} />} />

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-ink/30">
            Created with{" "}
            <a
              href="/"
              className="text-lagoon hover:underline"
              target="_blank"
            >
              Invopap
            </a>
          </p>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          publicId={r.publicId}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          documentType="RECEIPT"
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          publicId={r.publicId}
          documentNumber={r.receiptNumber}
          documentType="receipt"
          downloadUrl={`/api/documents/download-receipt/${r.publicId}`}
          onClose={() => setShowShare(false)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}
