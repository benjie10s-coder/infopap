// app/view/cs/[publicId]/PublicCashSaleView.tsx — Client-side public cash sale viewer
"use client";

import { useState, useMemo } from "react";
import type { CashSaleWithItems } from "@/lib/db/types";
import { CashSalePdf } from "@/lib/pdf-components/cash-sale";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";
import { ViewActionsSidebar } from "@/components/ViewActionsSidebar";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { UserNav } from "@/components/UserNav";
import Link from "next/link";

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

type ViewUser = { displayName: string; email: string; avatarUrl: string | null } | null;

export function PublicCashSaleView({
  cashSale: cs,
  user,
}: {
  cashSale: CashSaleData;
  user: ViewUser;
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
        isPaid={cs.isPaid}
        onPay={() => setShowPayment(true)}
        onShare={() => setShowShare(true)}
      />

      {/* Document content */}
      <div className={`${user ? "pl-14" : ""} lg:pr-64`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PdfPreview document={<CashSalePdf cashSale={cashSaleRecord} showWatermark={!cs.isPaid} />} />

          {/* Mobile action bar */}
          <div className="lg:hidden flex gap-3 mt-6">
            {cs.isPaid ? (
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

