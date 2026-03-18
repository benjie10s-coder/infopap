// app/api/admin/users/[id]/route.ts — Admin user detail + actions
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createRequestLogger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createRequestLogger();

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin endpoint not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const userId = params.id;

    // Parallel fetch user + related data
    const [userRes, invoicesRes, cashSalesRes, receiptsRes, deliveryNotesRes, purchaseOrdersRes, quotationsRes, subscriptionsRes, paymentsRes] = await Promise.all([
      admin.from("User").select("*").eq("id", userId).single(),
      admin.from("Invoice").select("id, publicId, documentType, invoiceNumber, toName, total, currency, isPaid, createdAt").eq("userId", userId).order("createdAt", { ascending: false }).limit(50),
      admin.from("CashSale").select("id, publicId, cashSaleNumber, toName, total, currency, isPaid, createdAt").eq("userId", userId).order("createdAt", { ascending: false }).limit(50),
      admin.from("Receipt").select("id, publicId, receiptNumber, toName, totalAmountOwed, currency, isPaid, createdAt").eq("userId", userId).order("createdAt", { ascending: false }).limit(50),
      admin.from("DeliveryNote").select("id, publicId, deliveryNoteNumber, toName, isPaid, createdAt").eq("userId", userId).order("createdAt", { ascending: false }).limit(50),
      admin.from("PurchaseOrder").select("id, publicId, purchaseOrderNumber, toName, total, currency, isPaid, createdAt").eq("userId", userId).order("createdAt", { ascending: false }).limit(50),
      admin.from("Quotation").select("id, publicId, quotationNumber, toName, total, currency, isPaid, createdAt").eq("userId", userId).order("createdAt", { ascending: false }).limit(50),
      admin.from("Subscription").select("*").eq("userId", userId).order("createdAt", { ascending: false }),
      admin.from("Payment").select("*").eq("userId", userId).order("createdAt", { ascending: false }).limit(50),
    ]);

    if (userRes.error || !userRes.data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const documents = [
      ...(invoicesRes.data || []).map((d) => ({ ...d, docType: "Invoice", number: d.invoiceNumber })),
      ...(cashSalesRes.data || []).map((d) => ({ ...d, docType: "Cash Sale", number: d.cashSaleNumber, total: d.total })),
      ...(receiptsRes.data || []).map((d) => ({ ...d, docType: "Receipt", number: d.receiptNumber, total: d.totalAmountOwed })),
      ...(deliveryNotesRes.data || []).map((d) => ({ ...d, docType: "Delivery Note", number: d.deliveryNoteNumber, total: 0 })),
      ...(purchaseOrdersRes.data || []).map((d) => ({ ...d, docType: "Purchase Order", number: d.purchaseOrderNumber })),
      ...(quotationsRes.data || []).map((d) => ({ ...d, docType: "Quotation", number: d.quotationNumber })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    logger.info("admin_user_detail", { userId });

    return NextResponse.json({
      user: userRes.data,
      documents,
      subscriptions: subscriptionsRes.data || [],
      payments: paymentsRes.data || [],
      stats: {
        totalDocuments: documents.length,
        paidDocuments: documents.filter((d) => d.isPaid).length,
        totalRevenue: (paymentsRes.data || [])
          .filter((p) => p.status === "COMPLETED")
          .reduce((sum, p) => sum + (p.amount || 0), 0),
      },
    });
  } catch (error) {
    logger.error("admin_user_detail_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to get user details" }, { status: 500 });
  }
}
