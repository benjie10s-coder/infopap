// app/view/cs/[publicId]/PublicCashSaleView.tsx — Client-side public cash sale viewer
"use client";

import { useState, useCallback, useMemo } from "react";
import type { CashSaleWithItems } from "@/lib/db/types";
import { CashSalePdf } from "@/lib/pdf-components/cash-sale";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";

interface CashSaleData {
  id: string;
  publicId: string;
  cashSaleNumber: string;
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
  issueDate: string;
  orderNumber: string | null;
  referenceInvoiceNumber: string | null;
  paymentMethod: string;
  transactionCode: string | null;
  currency: string;
  taxRate: number;
  discountType: string;
  discountValue: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
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

export function PublicCashSaleView({
  cashSale: cs,
}: {
  cashSale: CashSaleData;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const isGuest = !cs.userId;

  const cashSaleRecord = useMemo((): CashSaleWithItems => ({
    id: cs.id,
    userId: cs.userId,
    guestSessionId: null,
    publicId: cs.publicId,
    documentTitle: cs.documentTitle,
    cashSaleNumber: cs.cashSaleNumber,
    issueDate: cs.issueDate,
    orderNumber: cs.orderNumber,
    referenceInvoiceNumber: cs.referenceInvoiceNumber,
    paymentMethod: cs.paymentMethod,
    transactionCode: cs.transactionCode,
    fromName: cs.fromName,
    fromEmail: cs.fromEmail,
    fromPhone: cs.fromPhone,
    fromMobile: cs.fromMobile,
    fromFax: cs.fromFax,
    fromAddress: cs.fromAddress,
    fromCity: cs.fromCity,
    fromZipCode: cs.fromZipCode,
    fromBusinessNumber: cs.fromBusinessNumber,
    toName: cs.toName,
    toEmail: cs.toEmail,
    toPhone: cs.toPhone,
    toMobile: cs.toMobile,
    toFax: cs.toFax,
    toAddress: cs.toAddress,
    toCity: cs.toCity,
    toZipCode: cs.toZipCode,
    toBusinessNumber: cs.toBusinessNumber,
    currency: cs.currency,
    taxRate: cs.taxRate,
    discountType: cs.discountType,
    discountValue: cs.discountValue,
    subtotal: cs.subtotal,
    taxAmount: cs.taxAmount,
    discountAmount: cs.discountAmount,
    total: cs.total,
    accentColor: cs.accentColor,
    logoDataUrl: cs.logoDataUrl,
    signatureDataUrl: cs.signatureDataUrl,
    notes: cs.notes,
    isPaid: cs.isPaid,
    paidAt: null,
    pdfUrl: null,
    createdAt: "",
    updatedAt: "",
    lineItems: cs.lineItems.map((li, i) => ({
      id: li.id,
      cashSaleId: cs.id,
      description: li.description,
      additionalDetails: li.additionalDetails,
      quantity: li.quantity,
      rate: li.rate,
      amount: li.amount,
      sortOrder: i,
      createdAt: "",
      updatedAt: "",
    })),
    photos: cs.photos.map((p, i) => ({
      id: p.id,
      cashSaleId: cs.id,
      url: p.url,
      filename: null,
      sortOrder: i,
      createdAt: "",
    })),
  }), [cs]);

  const handleDownload = useCallback(() => {
    if (!cs.isPaid) {
      setShowPayment(true);
      return;
    }
    // Paid — show share options
    setShowShare(true);
  }, [cs.isPaid]);

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
            {cs.isPaid ? "Download / Share" : "Download PDF (KSh 10)"}
          </button>
        </div>
      </header>

      {/* Cash Sale */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PdfPreview document={<CashSalePdf cashSale={cashSaleRecord} showWatermark={!cs.isPaid} />} />

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
          publicId={cs.publicId}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          documentType="CASH_SALE"
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          publicId={cs.publicId}
          documentNumber={cs.cashSaleNumber}
          documentType="cash-sale"
          downloadUrl={`/api/documents/download-cs/${cs.publicId}`}
          onClose={() => setShowShare(false)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}

