// app/view/dn/[publicId]/PublicDeliveryNoteView.tsx — Client-side public delivery note viewer
"use client";

import { useState, useCallback, useMemo } from "react";
import type { DeliveryNoteWithItems } from "@/lib/db/types";
import { DeliveryNotePdf } from "@/lib/pdf-components/delivery-note";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";

interface DeliveryNoteData {
  id: string;
  publicId: string;
  deliveryNoteNumber: string;
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
  orderNumber: string | null;
  referenceInvoiceNumber: string | null;
  acknowledgmentText: string | null;
  notes: string | null;
  isPaid: boolean;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  lineItems: Array<{
    id: string;
    description: string;
    additionalDetails: string | null;
    quantity: number;
  }>;
  photos: Array<{ id: string; url: string }>;
  userId: string | null;
}

export function PublicDeliveryNoteView({
  deliveryNote: dn,
}: {
  deliveryNote: DeliveryNoteData;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const isGuest = !dn.userId;

  const deliveryNoteRecord = useMemo((): DeliveryNoteWithItems => ({
    id: dn.id,
    userId: dn.userId,
    guestSessionId: null,
    publicId: dn.publicId,
    documentTitle: dn.documentTitle,
    deliveryNoteNumber: dn.deliveryNoteNumber,
    issueDate: dn.issueDate,
    orderNumber: dn.orderNumber,
    referenceInvoiceNumber: dn.referenceInvoiceNumber,
    acknowledgmentText: dn.acknowledgmentText,
    fromName: dn.fromName,
    fromEmail: dn.fromEmail,
    fromPhone: dn.fromPhone,
    fromMobile: null,
    fromFax: null,
    fromAddress: dn.fromAddress,
    fromCity: dn.fromCity,
    fromZipCode: dn.fromZipCode,
    fromBusinessNumber: dn.fromBusinessNumber,
    toName: dn.toName,
    toEmail: dn.toEmail,
    toPhone: dn.toPhone,
    toMobile: null,
    toFax: null,
    toAddress: dn.toAddress,
    toCity: dn.toCity,
    toZipCode: dn.toZipCode,
    toBusinessNumber: dn.toBusinessNumber,
    accentColor: dn.accentColor,
    logoDataUrl: dn.logoDataUrl,
    signatureDataUrl: dn.signatureDataUrl,
    notes: dn.notes,
    isPaid: dn.isPaid,
    paidAt: null,
    pdfUrl: null,
    createdAt: "",
    updatedAt: "",
    lineItems: dn.lineItems.map((li, i) => ({
      id: li.id,
      deliveryNoteId: dn.id,
      description: li.description,
      additionalDetails: li.additionalDetails,
      quantity: li.quantity,
      sortOrder: i,
      createdAt: "",
      updatedAt: "",
    })),
    photos: dn.photos.map((p, i) => ({
      id: p.id,
      deliveryNoteId: dn.id,
      url: p.url,
      filename: null,
      sortOrder: i,
      createdAt: "",
    })),
  }), [dn]);

  const handleDownload = useCallback(() => {
    if (!dn.isPaid) {
      setShowPayment(true);
      return;
    }
    // Paid — show share options
    setShowShare(true);
  }, [dn.isPaid]);

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
            {dn.isPaid ? "Download / Share" : "Download PDF (KSh 10)"}
          </button>
        </div>
      </header>

      {/* Delivery Note */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PdfPreview document={<DeliveryNotePdf deliveryNote={deliveryNoteRecord} showWatermark={!dn.isPaid} />} />

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
          publicId={dn.publicId}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          documentType="DELIVERY_NOTE"
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          publicId={dn.publicId}
          documentNumber={dn.deliveryNoteNumber}
          documentType="delivery-note"
          downloadUrl={`/api/documents/download-dn/${dn.publicId}`}
          onClose={() => setShowShare(false)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}
