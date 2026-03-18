// app/api/admin/analytics/route.ts — Time-series analytics for admin charts
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createRequestLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const logger = createRequestLogger();

  // Validate admin secret
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    // Parallel queries for all chart data
    const [
      invoicesByDay,
      cashSalesByDay,
      deliveryNotesByDay,
      receiptsByDay,
      purchaseOrdersByDay,
      quotationsByDay,
      paymentsByDay,
      invoiceTypeCounts,
    ] = await Promise.all([
      // Documents created per day — Invoices
      admin
        .from("Invoice")
        .select("createdAt")
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
      admin
        .from("CashSale")
        .select("createdAt")
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
      admin
        .from("DeliveryNote")
        .select("createdAt")
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
      admin
        .from("Receipt")
        .select("createdAt")
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
      admin
        .from("PurchaseOrder")
        .select("createdAt")
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
      admin
        .from("Quotation")
        .select("createdAt")
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
      // Payments per day
      admin
        .from("Payment")
        .select("createdAt, status, amount")
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
      // Document type totals (all-time)
      Promise.all([
        admin.from("Invoice").select("id", { count: "exact", head: true }),
        admin.from("CashSale").select("id", { count: "exact", head: true }),
        admin.from("DeliveryNote").select("id", { count: "exact", head: true }),
        admin.from("Receipt").select("id", { count: "exact", head: true }),
        admin.from("PurchaseOrder").select("id", { count: "exact", head: true }),
        admin.from("Quotation").select("id", { count: "exact", head: true }),
      ]),
    ]);

    // Helper: group rows by date
    const groupByDate = (rows: { createdAt: string }[] | null): Record<string, number> => {
      const map: Record<string, number> = {};
      if (!rows) return map;
      for (const row of rows) {
        const date = row.createdAt.slice(0, 10); // YYYY-MM-DD
        map[date] = (map[date] || 0) + 1;
      }
      return map;
    }

    // Generate last 30 dates
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    // Documents per day (all types combined)
    const allDocDates = [
      ...groupEntries(groupByDate(invoicesByDay.data)),
      ...groupEntries(groupByDate(cashSalesByDay.data)),
      ...groupEntries(groupByDate(deliveryNotesByDay.data)),
      ...groupEntries(groupByDate(receiptsByDay.data)),
      ...groupEntries(groupByDate(purchaseOrdersByDay.data)),
      ...groupEntries(groupByDate(quotationsByDay.data)),
    ];
    const docCountByDate: Record<string, number> = {};
    for (const [date, count] of allDocDates) {
      docCountByDate[date] = (docCountByDate[date] || 0) + count;
    }

    const documentsByDay = dates.map((date) => ({
      date: formatDateShort(date),
      count: docCountByDate[date] || 0,
    }));

    // Revenue per day (from completed payments)
    const revenueByDate: Record<string, number> = {};
    const completedByDate: Record<string, number> = {};
    const failedByDate: Record<string, number> = {};

    if (paymentsByDay.data) {
      for (const p of paymentsByDay.data) {
        const date = p.createdAt.slice(0, 10);
        if (p.status === "COMPLETED") {
          revenueByDate[date] = (revenueByDate[date] || 0) + (p.amount || 0);
          completedByDate[date] = (completedByDate[date] || 0) + 1;
        } else if (p.status === "FAILED") {
          failedByDate[date] = (failedByDate[date] || 0) + 1;
        }
      }
    }

    const revenueByDay = dates.map((date) => ({
      date: formatDateShort(date),
      revenue: revenueByDate[date] || 0,
    }));

    const paymentsByDayChart = dates.map((date) => ({
      date: formatDateShort(date),
      completed: completedByDate[date] || 0,
      failed: failedByDate[date] || 0,
    }));

    // Document type breakdown
    const [inv, cs, dn, rec, po, qt] = invoiceTypeCounts;
    const documentsByType = [
      { type: "Invoice", count: inv.count || 0 },
      { type: "Cash Sale", count: cs.count || 0 },
      { type: "Delivery Note", count: dn.count || 0 },
      { type: "Receipt", count: rec.count || 0 },
      { type: "Purchase Order", count: po.count || 0 },
      { type: "Quotation", count: qt.count || 0 },
    ].filter((d) => d.count > 0);

    // Guest vs Authenticated documents
    const [guestInvoices, authInvoices] = await Promise.all([
      admin.from("Invoice").select("id", { count: "exact", head: true }).not("guestSessionId", "is", null),
      admin.from("Invoice").select("id", { count: "exact", head: true }).not("userId", "is", null),
    ]);

    const guestVsAuth = [
      { label: "Authenticated", count: authInvoices.count || 0 },
      { label: "Guest", count: guestInvoices.count || 0 },
    ];

    logger.info("admin_analytics_accessed");

    return NextResponse.json(
      {
        revenueByDay,
        documentsByDay,
        paymentsByDay: paymentsByDayChart,
        documentsByType,
        guestVsAuth,
      },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (error) {
    logger.error("admin_analytics_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to get analytics" }, { status: 500 });
  }
}

function groupEntries(map: Record<string, number>): [string, number][] {
  return Object.entries(map);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
