// app/dashboard/page.tsx — Dashboard with stats across ALL document types
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
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

  // Fetch recent docs from ALL 6 tables in parallel
  const selectCols = "id, publicId, toName, isPaid, createdAt";
  const ownerFilter = `userId.eq.${dbUser.id}`;

  const [invoices, cashSales, deliveryNotes, receipts, purchaseOrders, quotations] =
    await Promise.all([
      admin
        .from("Invoice")
        .select(`${selectCols}, invoiceNumber, documentType, total, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false })
        .limit(10),
      admin
        .from("CashSale")
        .select(`${selectCols}, cashSaleNumber, total, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false })
        .limit(10),
      admin
        .from("DeliveryNote")
        .select(`${selectCols}, deliveryNoteNumber`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false })
        .limit(10),
      admin
        .from("Receipt")
        .select(`${selectCols}, receiptNumber, amountReceived, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false })
        .limit(10),
      admin
        .from("PurchaseOrder")
        .select(`${selectCols}, purchaseOrderNumber, total, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false })
        .limit(10),
      admin
        .from("Quotation")
        .select(`${selectCols}, quotationNumber, total, currency`)
        .or(ownerFilter)
        .order("createdAt", { ascending: false })
        .limit(10),
    ]);

  // Normalize all docs into a common shape for the client
  type DocRow = {
    id: string;
    publicId: string;
    docType: string;
    docNumber: string;
    toName: string;
    amount: number;
    currency: string;
    isPaid: boolean;
    createdAt: string;
    viewUrl: string;
  };

  const allDocs: DocRow[] = [];

  for (const inv of invoices.data || []) {
    allDocs.push({
      id: inv.id,
      publicId: inv.publicId,
      docType: "Invoice",
      docNumber: inv.invoiceNumber,
      toName: inv.toName || "",
      amount: inv.total || 0,
      currency: inv.currency || "KES",
      isPaid: inv.isPaid,
      createdAt: inv.createdAt,
      viewUrl: `/view/${inv.publicId}`,
    });
  }
  for (const cs of cashSales.data || []) {
    allDocs.push({
      id: cs.id,
      publicId: cs.publicId,
      docType: "Cash Sale",
      docNumber: cs.cashSaleNumber,
      toName: cs.toName || "",
      amount: cs.total || 0,
      currency: cs.currency || "KES",
      isPaid: cs.isPaid,
      createdAt: cs.createdAt,
      viewUrl: `/view/cs/${cs.publicId}`,
    });
  }
  for (const dn of deliveryNotes.data || []) {
    allDocs.push({
      id: dn.id,
      publicId: dn.publicId,
      docType: "Delivery Note",
      docNumber: dn.deliveryNoteNumber,
      toName: dn.toName || "",
      amount: 0,
      currency: "KES",
      isPaid: dn.isPaid,
      createdAt: dn.createdAt,
      viewUrl: `/view/dn/${dn.publicId}`,
    });
  }
  for (const r of receipts.data || []) {
    allDocs.push({
      id: r.id,
      publicId: r.publicId,
      docType: "Receipt",
      docNumber: r.receiptNumber,
      toName: r.toName || "",
      amount: r.amountReceived || 0,
      currency: r.currency || "KES",
      isPaid: r.isPaid,
      createdAt: r.createdAt,
      viewUrl: `/view/receipt/${r.publicId}`,
    });
  }
  for (const po of purchaseOrders.data || []) {
    allDocs.push({
      id: po.id,
      publicId: po.publicId,
      docType: "Purchase Order",
      docNumber: po.purchaseOrderNumber,
      toName: po.toName || "",
      amount: po.total || 0,
      currency: po.currency || "KES",
      isPaid: po.isPaid,
      createdAt: po.createdAt,
      viewUrl: `/view/po/${po.publicId}`,
    });
  }
  for (const q of quotations.data || []) {
    allDocs.push({
      id: q.id,
      publicId: q.publicId,
      docType: "Quotation",
      docNumber: q.quotationNumber,
      toName: q.toName || "",
      amount: q.total || 0,
      currency: q.currency || "KES",
      isPaid: q.isPaid,
      createdAt: q.createdAt,
      viewUrl: `/view/quotation/${q.publicId}`,
    });
  }

  // Sort all docs by createdAt descending
  allDocs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <DashboardClient
      user={{
        displayName: dbUser.name || "User",
        email: dbUser.email,
        avatarUrl: dbUser.avatarUrl,
      }}
      documents={allDocs.slice(0, 30)}
    />
  );
}
