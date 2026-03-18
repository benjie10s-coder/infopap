// app/api/admin/payments/route.ts — Unified payment listing across all document types
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createRequestLogger } from "@/lib/logger";

interface PaymentRow {
  id: string;
  documentType: string;
  userId: string | null;
  phoneNumber: string;
  amount: number;
  currency: string;
  status: string;
  mpesaReceiptNumber: string | null;
  resultDesc: string | null;
  createdAt: string;
  completedAt: string | null;
}

const PAYMENT_TABLES = [
  { table: "Payment", docType: "Invoice", fk: "invoiceId" },
  { table: "CashSalePayment", docType: "Cash Sale", fk: "cashSaleId" },
  { table: "DeliveryNotePayment", docType: "Delivery Note", fk: "deliveryNoteId" },
  { table: "ReceiptPayment", docType: "Receipt", fk: "receiptId" },
  { table: "PurchaseOrderPayment", docType: "Purchase Order", fk: "purchaseOrderId" },
  { table: "QuotationPayment", docType: "Quotation", fk: "quotationId" },
] as const;

export async function GET(request: NextRequest) {
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
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") || "";
    const docTypeFilter = url.searchParams.get("docType") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = 30;

    // Query all payment tables in parallel
    const tablesToQuery = docTypeFilter
      ? PAYMENT_TABLES.filter((t) => t.docType === docTypeFilter)
      : PAYMENT_TABLES;

    const queries = tablesToQuery.map(({ table, docType }) => {
      let q = admin
        .from(table)
        .select("id, userId, phoneNumber, amount, currency, status, mpesaReceiptNumber, resultDesc, createdAt, completedAt");
      if (statusFilter) q = q.eq("status", statusFilter);
      return q.then((res) => ({
        docType,
        data: (res.data || []) as Array<{
          id: string;
          userId: string | null;
          phoneNumber: string;
          amount: number;
          currency: string;
          status: string;
          mpesaReceiptNumber: string | null;
          resultDesc: string | null;
          createdAt: string;
          completedAt: string | null;
        }>,
      }));
    });

    const results = await Promise.all(queries);

    // Merge and sort all payments
    const allPayments: PaymentRow[] = [];
    for (const { docType, data } of results) {
      for (const row of data) {
        allPayments.push({ ...row, documentType: docType });
      }
    }
    allPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const totalItems = allPayments.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const offset = (page - 1) * limit;
    const paginated = allPayments.slice(offset, offset + limit);

    // Aggregate stats
    const statusCounts: Record<string, { count: number; amount: number }> = {};
    for (const p of allPayments) {
      if (!statusCounts[p.status]) statusCounts[p.status] = { count: 0, amount: 0 };
      statusCounts[p.status].count++;
      statusCounts[p.status].amount += p.amount || 0;
    }

    logger.info("admin_payments_listed", { total: totalItems, page });

    return NextResponse.json({
      payments: paginated,
      pagination: { page, limit, totalItems, totalPages },
      statusCounts,
    });
  } catch (error) {
    logger.error("admin_payments_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to list payments" }, { status: 500 });
  }
}
