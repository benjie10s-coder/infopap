// app/view/[publicId]/PublicInvoiceView.tsx — Client-side public invoice viewer
"use client";

import { useState, useMemo } from "react";
import type { InvoiceWithItems } from "@/lib/db/types";
import { InvoicePdf } from "@/lib/pdf-components/invoice";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";
import { ViewActionsSidebar } from "@/components/ViewActionsSidebar";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { UserNav } from "@/components/UserNav";
import Link from "next/link";

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

type ViewUser = { displayName: string; email: string; avatarUrl: string | null } | null;

export function PublicInvoiceView({
  invoice,
  user,
}: {
  invoice: InvoiceData;
  user: ViewUser;
}) {
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
        isPaid={invoice.isPaid}
        onPay={() => setShowPayment(true)}
        onShare={() => setShowShare(true)}
      />

      {/* Document content */}
      <div className={`${user ? "pl-14" : ""} lg:pr-64`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PdfPreview document={<InvoicePdf invoice={invoiceRecord} showWatermark={!invoice.isPaid} />} />

          {/* Mobile action bar */}
          <div className="lg:hidden flex gap-3 mt-6">
            {invoice.isPaid ? (
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

          {/* Footer */}
          <div className="text-center text-xs text-ink/30 py-6">
            Powered by{" "}
            <a href="/" className="text-lagoon hover:underline">Invopap</a>{" "}
            · <a href="/terms" className="hover:underline">Terms</a>{" "}
            · <a href="/privacy" className="hover:underline">Privacy</a>
          </div>
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


