// app/view/[publicId]/PublicInvoiceView.tsx — Client-side public invoice viewer
"use client";

import { useState, useCallback, useMemo } from "react";
import type { InvoiceWithItems } from "@/lib/db/types";
import { InvoicePdf } from "@/lib/pdf-components/invoice";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";

interface InvoiceData {
  id: string;
  publicId: string;
  invoiceNumber: string;
  documentTitle: string;
  documentType: string;
  accentColor: string;
  currency: string;
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
  dueDate: string | null;
  notes: string | null;
  taxRate: number;
  discountType: string;
  discountValue: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
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

export function PublicInvoiceView({ invoice }: { invoice: InvoiceData }) {
  const [showPayment, setShowPayment] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const isGuest = !invoice.userId;

  const invoiceRecord = useMemo((): InvoiceWithItems => ({
    id: invoice.id,
    userId: invoice.userId,
    guestSessionId: null,
    publicId: invoice.publicId,
    documentType: invoice.documentType || "INVOICE",
    documentTitle: invoice.documentTitle,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    paymentTerms: "",
    fromName: invoice.fromName,
    fromEmail: invoice.fromEmail,
    fromPhone: invoice.fromPhone,
    fromMobile: null,
    fromFax: null,
    fromAddress: invoice.fromAddress,
    fromCity: invoice.fromCity,
    fromZipCode: invoice.fromZipCode,
    fromBusinessNumber: invoice.fromBusinessNumber,
    toName: invoice.toName,
    toEmail: invoice.toEmail,
    toPhone: invoice.toPhone,
    toMobile: null,
    toFax: null,
    toAddress: invoice.toAddress,
    toCity: invoice.toCity,
    toZipCode: invoice.toZipCode,
    toBusinessNumber: invoice.toBusinessNumber,
    currency: invoice.currency,
    taxRate: invoice.taxRate,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    discountAmount: invoice.discountAmount,
    total: invoice.total,
    accentColor: invoice.accentColor,
    logoDataUrl: invoice.logoDataUrl,
    signatureDataUrl: invoice.signatureDataUrl,
    notes: invoice.notes,
    isPaid: invoice.isPaid,
    paidAt: null,
    pdfUrl: null,
    createdAt: "",
    updatedAt: "",
    lineItems: invoice.lineItems.map((li, i) => ({
      id: li.id,
      invoiceId: invoice.id,
      description: li.description,
      additionalDetails: li.additionalDetails,
      quantity: li.quantity,
      rate: li.rate,
      amount: li.amount,
      sortOrder: i,
      createdAt: "",
      updatedAt: "",
    })),
    photos: invoice.photos.map((p, i) => ({
      id: p.id,
      invoiceId: invoice.id,
      url: p.url,
      filename: null,
      sortOrder: i,
      createdAt: "",
    })),
  }), [invoice]);

  const handleDownload = useCallback(() => {
    if (!invoice.isPaid) {
      setShowPayment(true);
      return;
    }
    // Paid — show share options
    setShowShare(true);
  }, [invoice.isPaid]);

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {invoice.isPaid ? "Download / Share" : "Download PDF (KSh 10)"}
          </button>
        </div>
      </header>

      {/* Invoice */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PdfPreview document={<InvoicePdf invoice={invoiceRecord} showWatermark={!invoice.isPaid} />} />

        {/* Footer links */}
        <div className="text-center text-xs text-ink/30 py-6">
          Powered by{" "}
          <a href="/" className="text-lagoon hover:underline">
            Invopap
          </a>{" "}
          · <a href="/terms" className="hover:underline">Terms</a>{" "}
          · <a href="/privacy" className="hover:underline">Privacy</a>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          publicId={invoice.publicId}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          publicId={invoice.publicId}
          documentNumber={invoice.invoiceNumber}
          documentType="invoice"
          downloadUrl={`/api/documents/download/${invoice.publicId}`}
          onClose={() => setShowShare(false)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}


