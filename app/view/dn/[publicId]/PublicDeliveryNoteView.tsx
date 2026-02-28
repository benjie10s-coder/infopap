// app/view/dn/[publicId]/PublicDeliveryNoteView.tsx — Client-side public delivery note viewer
"use client";

import { useState, useMemo } from "react";
import type { DeliveryNoteWithItems } from "@/lib/db/types";
import { DeliveryNotePdf } from "@/lib/pdf-components/delivery-note";
import { PdfPreview } from "@/components/PdfPreview";
import { PaymentModal } from "@/components/PaymentModal";
import { ShareModal } from "@/components/ShareModal";
import { BackButton } from "@/components/BackButton";
import { ViewActionsSidebar } from "@/components/ViewActionsSidebar";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { UserNav } from "@/components/UserNav";
import Link from "next/link";

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

type ViewUser = { displayName: string; email: string; avatarUrl: string | null } | null;

export function PublicDeliveryNoteView({
  deliveryNote: dn,
  user,
}: {
  deliveryNote: DeliveryNoteData;
  user: ViewUser;
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
            <BackButton />
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
        isPaid={dn.isPaid}
        onPay={() => setShowPayment(true)}
        onShare={() => setShowShare(true)}
      />

      {/* Document content */}
      <div className={`${user ? "pl-14" : ""} lg:pr-64`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PdfPreview document={<DeliveryNotePdf deliveryNote={deliveryNoteRecord} showWatermark={!dn.isPaid} />} />

          {/* Mobile action bar */}
          <div className="lg:hidden flex gap-3 mt-6">
            {dn.isPaid ? (
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
