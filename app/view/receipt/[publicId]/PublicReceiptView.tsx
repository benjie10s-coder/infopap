// app/view/receipt/[publicId]/PublicReceiptView.tsx — Client-side public receipt viewer
"use client";

import { useState, useMemo } from "react";
import type { ReceiptWithPhotos } from "@/lib/db/types";
import { ReceiptPdf } from "@/lib/pdf-components/receipt";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";
import { ViewActionsSidebar } from "@/components/ViewActionsSidebar";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { UserNav } from "@/components/UserNav";
import Link from "next/link";

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

type ViewUser = { displayName: string; email: string; avatarUrl: string | null } | null;

export function PublicReceiptView({
  receipt: r,
  user,
}: {
  receipt: ReceiptData;
  user: ViewUser;
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
        isPaid={r.isPaid}
        onPay={() => setShowPayment(true)}
        onShare={() => setShowShare(true)}
      />

      {/* Document content */}
      <div className={`${user ? "md:pl-14" : ""} lg:pr-64`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PdfPreview document={<ReceiptPdf receipt={receiptRecord} showWatermark={!r.isPaid} />} />

          {/* Mobile action bar */}
          <div className="lg:hidden flex gap-3 mt-6">
            {r.isPaid ? (
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
