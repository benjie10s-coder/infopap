// app/dashboard/documents/page.tsx — Document library for authenticated users
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getGuestSessionId } from "@/lib/session";
import { DocumentLibraryClient } from "./DocumentLibraryClient";

export const metadata = {
  title: "Document Library — Invopap",
  description: "Access all your documents for download and sharing",
};

export default async function DocumentLibraryPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = getAdminClient();
  const { data: dbUser } = await admin
    .from("User")
    .select("id, name, email, avatarUrl")
    .eq("externalId", user.id)
    .single();

  if (!dbUser) {
    redirect("/auth/login");
  }

  // Fetch all documents from all 6 tables in parallel
  // Also include any documents the user created before signing up (guestSessionId)
  const selectCols = "id, publicId, toName, isPaid, createdAt";
  const guestSessionId = getGuestSessionId();
  const ownerFilter = guestSessionId
    ? `userId.eq.${dbUser.id},guestSessionId.eq.${guestSessionId}`
    : `userId.eq.${dbUser.id}`;

  const [invoices, cashSales, deliveryNotes, receipts, purchaseOrders, quotations] =
    await Promise.all([
      admin
        .from("Invoice")
        .select(`${selectCols}, invoiceNumber, documentType, total, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false }),
      admin
        .from("CashSale")
        .select(`${selectCols}, cashSaleNumber, total, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false }),
      admin
        .from("DeliveryNote")
        .select(`${selectCols}, deliveryNoteNumber`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false }),
      admin
        .from("Receipt")
        .select(`${selectCols}, receiptNumber, amountReceived, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false }),
      admin
        .from("PurchaseOrder")
        .select(`${selectCols}, purchaseOrderNumber, total, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false }),
      admin
        .from("Quotation")
        .select(`${selectCols}, quotationNumber, total, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false }),
    ]);

  // Normalize all docs into a common shape
  type PaidDocRow = {
    id: string;
    publicId: string;
    docType: "invoice" | "cash-sale" | "delivery-note" | "receipt" | "purchase-order" | "quotation";
    docTypeLabel: string;
    docNumber: string;
    toName: string;
    amount: number;
    currency: string;
    createdAt: string;
    viewUrl: string;
  };

  const allDocs: PaidDocRow[] = [];

  for (const inv of invoices.data || []) {
    allDocs.push({
      id: inv.id,
      publicId: inv.publicId,
      docType: "invoice",
      docTypeLabel: "Invoice",
      docNumber: inv.invoiceNumber,
      toName: inv.toName || "",
      amount: inv.total || 0,
      currency: inv.currency || "KES",
      createdAt: inv.createdAt,
      viewUrl: `/view/${inv.publicId}`,
    });
  }
  for (const cs of cashSales.data || []) {
    allDocs.push({
      id: cs.id,
      publicId: cs.publicId,
      docType: "cash-sale",
      docTypeLabel: "Cash Sale",
      docNumber: cs.cashSaleNumber,
      toName: cs.toName || "",
      amount: cs.total || 0,
      currency: cs.currency || "KES",
      createdAt: cs.createdAt,
      viewUrl: `/view/cs/${cs.publicId}`,
    });
  }
  for (const dn of deliveryNotes.data || []) {
    allDocs.push({
      id: dn.id,
      publicId: dn.publicId,
      docType: "delivery-note",
      docTypeLabel: "Delivery Note",
      docNumber: dn.deliveryNoteNumber,
      toName: dn.toName || "",
      amount: 0,
      currency: "KES",
      createdAt: dn.createdAt,
      viewUrl: `/view/dn/${dn.publicId}`,
    });
  }
  for (const r of receipts.data || []) {
    allDocs.push({
      id: r.id,
      publicId: r.publicId,
      docType: "receipt",
      docTypeLabel: "Receipt",
      docNumber: r.receiptNumber,
      toName: r.toName || "",
      amount: r.amountReceived || 0,
      currency: r.currency || "KES",
      createdAt: r.createdAt,
      viewUrl: `/view/receipt/${r.publicId}`,
    });
  }
  for (const po of purchaseOrders.data || []) {
    allDocs.push({
      id: po.id,
      publicId: po.publicId,
      docType: "purchase-order",
      docTypeLabel: "Purchase Order",
      docNumber: po.purchaseOrderNumber,
      toName: po.toName || "",
      amount: po.total || 0,
      currency: po.currency || "KES",
      createdAt: po.createdAt,
      viewUrl: `/view/po/${po.publicId}`,
    });
  }
  for (const q of quotations.data || []) {
    allDocs.push({
      id: q.id,
      publicId: q.publicId,
      docType: "quotation",
      docTypeLabel: "Quotation",
      docNumber: q.quotationNumber,
      toName: q.toName || "",
      amount: q.total || 0,
      currency: q.currency || "KES",
      createdAt: q.createdAt,
      viewUrl: `/view/quotation/${q.publicId}`,
    });
  }

  // Sort all docs by createdAt descending
  allDocs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <DocumentLibraryClient
      user={{
        displayName: dbUser.name || "User",
        email: dbUser.email,
        avatarUrl: dbUser.avatarUrl,
      }}
      documents={allDocs}
    />
  );
}
