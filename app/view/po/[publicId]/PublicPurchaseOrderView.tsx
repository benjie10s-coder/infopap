// app/view/po/[publicId]/PublicPurchaseOrderView.tsx — Client-side public purchase order viewer
"use client";

import { useState, useCallback, useMemo } from "react";
import type { PurchaseOrderWithItems } from "@/lib/db/types";
import { PurchaseOrderPdf } from "@/lib/pdf-components/purchase-order";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";

interface PurchaseOrderData {
  id: string;
  publicId: string;
  purchaseOrderNumber: string;
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
  fromWebsite: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toMobile: string | null;
  toFax: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  shipToEnabled: boolean;
  shipToName: string | null;
  shipToCompanyName: string | null;
  shipToAddress: string | null;
  shipToCity: string | null;
  shipToZipCode: string | null;
  shipToPhone: string | null;
  authorizedByName: string | null;
  authorizedByDesignation: string | null;
  issueDate: string;
  expectedDeliveryDate: string | null;
  paymentTerms: string | null;
  orderNumber: string | null;
  currency: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
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
    unitPrice: number;
    amount: number;
  }>;
  photos: Array<{ id: string; url: string }>;
  userId: string | null;
}

export function PublicPurchaseOrderView({
  purchaseOrder: po,
}: {
  purchaseOrder: PurchaseOrderData;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const isGuest = !po.userId;

  const purchaseOrderRecord = useMemo((): PurchaseOrderWithItems => ({
    id: po.id,
    userId: po.userId,
    guestSessionId: null,
    publicId: po.publicId,
    documentTitle: po.documentTitle,
    purchaseOrderNumber: po.purchaseOrderNumber,
    issueDate: po.issueDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    paymentTerms: po.paymentTerms,
    orderNumber: po.orderNumber,
    fromName: po.fromName,
    fromEmail: po.fromEmail,
    fromPhone: po.fromPhone,
    fromMobile: po.fromMobile,
    fromFax: po.fromFax,
    fromAddress: po.fromAddress,
    fromCity: po.fromCity,
    fromZipCode: po.fromZipCode,
    fromBusinessNumber: po.fromBusinessNumber,
    fromWebsite: po.fromWebsite,
    toName: po.toName,
    toEmail: po.toEmail,
    toPhone: po.toPhone,
    toMobile: po.toMobile,
    toFax: po.toFax,
    toAddress: po.toAddress,
    toCity: po.toCity,
    toZipCode: po.toZipCode,
    toBusinessNumber: po.toBusinessNumber,
    shipToEnabled: po.shipToEnabled,
    shipToName: po.shipToName,
    shipToCompanyName: po.shipToCompanyName,
    shipToAddress: po.shipToAddress,
    shipToCity: po.shipToCity,
    shipToZipCode: po.shipToZipCode,
    shipToPhone: po.shipToPhone,
    authorizedByName: po.authorizedByName,
    authorizedByDesignation: po.authorizedByDesignation,
    currency: po.currency,
    taxRate: po.taxRate,
    subtotal: po.subtotal,
    taxAmount: po.taxAmount,
    total: po.total,
    accentColor: po.accentColor,
    logoDataUrl: po.logoDataUrl,
    signatureDataUrl: po.signatureDataUrl,
    notes: po.notes,
    isPaid: po.isPaid,
    paidAt: null,
    pdfUrl: null,
    createdAt: "",
    updatedAt: "",
    lineItems: po.lineItems.map((li, i) => ({
      id: li.id,
      purchaseOrderId: po.id,
      description: li.description,
      additionalDetails: li.additionalDetails,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.amount,
      sortOrder: i,
      createdAt: "",
      updatedAt: "",
    })),
    photos: po.photos.map((p, i) => ({
      id: p.id,
      purchaseOrderId: po.id,
      url: p.url,
      filename: null,
      sortOrder: i,
      createdAt: "",
    })),
  }), [po]);

  const handleDownload = useCallback(() => {
    if (!po.isPaid) {
      setShowPayment(true);
      return;
    }
    // Paid — show share options
    setShowShare(true);
  }, [po.isPaid]);

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
            {po.isPaid ? "Download / Share" : "Download PDF (KSh 10)"}
          </button>
        </div>
      </header>

      {/* Purchase Order */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PdfPreview document={<PurchaseOrderPdf purchaseOrder={purchaseOrderRecord} showWatermark={!po.isPaid} />} />

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-ink/30">
            Created with{" "}
            <a href="/" className="text-lagoon hover:underline" target="_blank">
              Invopap
            </a>
          </p>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          publicId={po.publicId}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          documentType="PURCHASE_ORDER"
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          publicId={po.publicId}
          documentNumber={po.purchaseOrderNumber}
          documentType="purchase-order"
          downloadUrl={`/api/documents/download-po/${po.publicId}`}
          onClose={() => setShowShare(false)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}
