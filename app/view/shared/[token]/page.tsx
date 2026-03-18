// app/view/shared/[token]/page.tsx — Shared document viewer (via share token)
import { getAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { SharedDocumentView } from "./SharedDocumentView";
import type { Metadata } from "next";

interface DocumentInfo {
  documentType: string;
  documentId: string;
  publicId: string;
  userId: string | null;
  guestSessionId: string | null;
  isPaid: boolean;
}

interface Props {
  params: { token: string };
}

async function findDocumentByToken(token: string): Promise<DocumentInfo | null> {
  const admin = getAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).rpc("find_document_by_share_token", {
    p_token: token,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  // RPC returns snake_case
  const doc = data[0];
  return {
    documentType: doc.document_type,
    documentId: doc.document_id,
    publicId: doc.public_id,
    userId: doc.user_id,
    guestSessionId: doc.guest_session_id,
    isPaid: doc.is_paid,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await findDocumentByToken(params.token);
  
  if (!doc) {
    return { title: "Document Not Found" };
  }

  const typeLabels: Record<string, string> = {
    invoice: "Invoice",
    "cash-sale": "Cash Sale",
    "delivery-note": "Delivery Note",
    receipt: "Receipt",
    "purchase-order": "Purchase Order",
    quotation: "Quotation",
  };

  return {
    title: `Shared ${typeLabels[doc.documentType] || "Document"} — InvoSafi`,
    description: "View and download your shared document",
    robots: { index: false, follow: false },
  };
}

export default async function SharedDocumentPage({ params }: Props) {
  const doc = await findDocumentByToken(params.token);

  if (!doc) {
    notFound();
  }

  // Pass token and document info to client component
  return (
    <SharedDocumentView
      token={params.token}
      documentType={doc.documentType}
      documentId={doc.documentId}
      publicId={doc.publicId}
      isGuestDocument={!doc.userId}
      isPaid={doc.isPaid}
    />
  );
}
