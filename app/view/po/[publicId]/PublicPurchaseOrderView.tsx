// app/view/po/[publicId]/PublicPurchaseOrderView.tsx — Client-side public purchase order viewer
"use client";

import { useState, useMemo } from "react";
import type { PurchaseOrderWithItems } from "@/lib/db/types";
import { PurchaseOrderPdf } from "@/lib/pdf-components/purchase-order";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";
import { ViewActionsSidebar } from "@/components/ViewActionsSidebar";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { UserNav } from "@/components/UserNav";
import Link from "next/link";

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

type ViewUser = { displayName: string; email: string; avatarUrl: string | null } | null;

export function PublicPurchaseOrderView({
  purchaseOrder: po,
  user,
}: {
  purchaseOrder: PurchaseOrderData;
  user: ViewUser;
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
              InvoSafi
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
        isPaid={po.isPaid}
        onPay={() => setShowPayment(true)}
        onShare={() => setShowShare(true)}
      />

      {/* Document content */}
      <div className={`${user ? "pl-14" : ""} lg:pr-64`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PdfPreview document={<PurchaseOrderPdf purchaseOrder={purchaseOrderRecord} showWatermark={!po.isPaid} />} />

          {/* Mobile action bar */}
          <div className="lg:hidden flex gap-3 mt-6">
            {po.isPaid ? (
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
        <a href="/" className="text-lagoon hover:underline">InvoSafi</a>{" "}
        · <a href="/terms" className="hover:underline">Terms</a>{" "}
        · <a href="/privacy" className="hover:underline">Privacy</a>
      </footer>

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
