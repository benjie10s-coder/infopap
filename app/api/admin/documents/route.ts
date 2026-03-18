// app/api/admin/documents/route.ts — Document analytics + listing API
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createRequestLogger } from "@/lib/logger";

const DOC_TABLES = [
  { table: "Invoice", type: "Invoice", numberCol: "invoiceNumber", hasTotal: true },
  { table: "CashSale", type: "Cash Sale", numberCol: "cashSaleNumber", hasTotal: true },
  { table: "DeliveryNote", type: "Delivery Note", numberCol: "deliveryNoteNumber", hasTotal: false },
  { table: "Receipt", type: "Receipt", numberCol: "receiptNumber", hasTotal: false },
  { table: "PurchaseOrder", type: "Purchase Order", numberCol: "purchaseOrderNumber", hasTotal: true },
  { table: "Quotation", type: "Quotation", numberCol: "quotationNumber", hasTotal: true },
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
    const typeFilter = url.searchParams.get("type") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = 30;

    // If a specific document type is requested, return paginated listing
    if (typeFilter) {
      const tableDef = DOC_TABLES.find((t) => t.type === typeFilter);
      if (!tableDef) {
        return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
      }

      const selectCols = `id, publicId, ${tableDef.numberCol}, toName, currency, isPaid, paidAt, createdAt, userId, guestSessionId${tableDef.hasTotal ? ", total" : ""}`;

      const { data, count, error } = await admin
        .from(tableDef.table)
        .select(selectCols, { count: "exact" })
        .order("createdAt", { ascending: false })
        .range((page - 1) * limit, (page - 1) * limit + limit - 1);

      if (error) throw error;

      const documents = ((data || []) as unknown as Record<string, unknown>[]).map((doc) => ({
        id: doc.id,
        publicId: doc.publicId,
        docType: tableDef.type,
        number: doc[tableDef.numberCol] || "",
        toName: doc.toName || "",
        total: tableDef.hasTotal ? (doc.total as number) || 0 : null,
        currency: (doc.currency as string) || "KES",
        isPaid: doc.isPaid || false,
        isGuest: !!doc.guestSessionId,
        createdAt: doc.createdAt,
      }));

      return NextResponse.json({
        documents,
        pagination: {
          page,
          limit,
          totalItems: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // Otherwise return aggregate analytics for all document types
    const queries = DOC_TABLES.map(({ table, type, hasTotal }) =>
      Promise.all([
        admin.from(table).select("id", { count: "exact", head: true }),
        admin.from(table).select("id", { count: "exact", head: true }).eq("isPaid", true),
        admin.from(table).select("id", { count: "exact", head: true }).eq("isPaid", false),
        admin.from(table).select("id", { count: "exact", head: true }).not("guestSessionId", "is", null),
        admin.from(table).select("id", { count: "exact", head: true }).not("userId", "is", null),
        hasTotal
          ? admin.from(table).select("total").eq("isPaid", true)
          : Promise.resolve({ data: null }),
      ]).then(([total, paid, unpaid, guest, auth, revData]) => ({
        type,
        total: total.count || 0,
        paid: paid.count || 0,
        unpaid: unpaid.count || 0,
        guest: guest.count || 0,
        authenticated: auth.count || 0,
        totalRevenue: revData.data
          ? (revData.data as Array<{ total: number }>).reduce((s, r) => s + (r.total || 0), 0)
          : 0,
      }))
    );

    // Also fetch recent documents (last 20 across all types)
    const recentQueries = DOC_TABLES.map(({ table, type, numberCol, hasTotal }) => {
      const cols = `id, publicId, ${numberCol}, toName, isPaid, createdAt${hasTotal ? ", total, currency" : ""}`;
      return admin
        .from(table)
        .select(cols)
        .order("createdAt", { ascending: false })
        .limit(5)
        .then((res) =>
          ((res.data || []) as unknown as Record<string, unknown>[]).map((d) => ({
            id: d.id,
            publicId: d.publicId,
            docType: type,
            number: d[numberCol] || "",
            toName: d.toName || "",
            total: hasTotal ? (d.total as number) || 0 : null,
            currency: (d.currency as string) || "KES",
            isPaid: d.isPaid || false,
            createdAt: d.createdAt,
          }))
        );
    });

    // Top document generators (users with most docs)
    const topUsersQuery = admin
      .from("Invoice")
      .select("userId")
      .not("userId", "is", null)
      .then((res) => {
        const counts: Record<string, number> = {};
        for (const row of res.data || []) {
          if (row.userId) {
            counts[row.userId] = (counts[row.userId] || 0) + 1;
          }
        }
        return Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([userId, docCount]) => ({ userId, docCount }));
      });

    const [typeStats, ...recentResults] = await Promise.all([
      Promise.all(queries),
      ...recentQueries,
      topUsersQuery,
    ]);

    // Merge recent documents, sort, take latest 20
    const topUsers = recentResults.pop() as Array<{ userId: string; docCount: number }>;
    const recentDocs = (recentResults as Array<Array<Record<string, unknown>>>)
      .flat()
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
      .slice(0, 20);

    // Resolve user names for top generators
    const topUserIds = (topUsers || []).map((u) => u.userId);
    let topGenerators: Array<{ userId: string; name: string; email: string; docCount: number }> = [];
    if (topUserIds.length > 0) {
      const { data: userData } = await admin
        .from("User")
        .select("id, name, email")
        .in("id", topUserIds);

      const userMap: Record<string, { name: string; email: string }> = {};
      for (const u of userData || []) {
        userMap[u.id] = { name: u.name || "Unknown", email: u.email };
      }

      topGenerators = (topUsers || []).map((t) => ({
        ...t,
        name: userMap[t.userId]?.name || "Unknown",
        email: userMap[t.userId]?.email || "",
      }));
    }

    logger.info("admin_documents_analytics", {
      totalTypes: typeStats.length,
    });

    return NextResponse.json({
      typeStats,
      recentDocuments: recentDocs,
      topGenerators,
    });
  } catch (error) {
    logger.error("admin_documents_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to get document analytics" }, { status: 500 });
  }
}
