// app/api/admin/users/route.ts — Admin user listing with aggregated stats
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createRequestLogger } from "@/lib/logger";

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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const search = url.searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    // Build query
    let query = admin
      .from("User")
      .select("*", { count: "exact" })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,businessName.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query;
    if (error) throw error;

    // Get document counts and subscription info for each user
    const userIds = (users || []).map((u) => u.id);

    if (userIds.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: { page, limit, totalItems: 0, totalPages: 0 },
      });
    }

    // Parallel aggregate queries
    const [invoiceCounts, subscriptions] = await Promise.all([
      // Count documents per user (invoices only for now - main doc type)
      admin
        .from("Invoice")
        .select("userId, isPaid")
        .in("userId", userIds),
      // Active subscriptions
      admin
        .from("Subscription")
        .select("userId, plan, status, documentsLimit, documentsUsed, expiresAt")
        .in("userId", userIds)
        .eq("status", "ACTIVE"),
    ]);

    // Build lookup maps
    const docCounts: Record<string, { total: number; paid: number }> = {};
    if (invoiceCounts.data) {
      for (const inv of invoiceCounts.data) {
        if (!inv.userId) continue;
        if (!docCounts[inv.userId]) docCounts[inv.userId] = { total: 0, paid: 0 };
        docCounts[inv.userId].total++;
        if (inv.isPaid) docCounts[inv.userId].paid++;
      }
    }

    const subMap: Record<string, { plan: string; status: string; documentsLimit: number; documentsUsed: number; expiresAt: string | null }> = {};
    if (subscriptions.data) {
      for (const sub of subscriptions.data) {
        if (sub.userId) subMap[sub.userId] = sub;
      }
    }

    // Enrich users
    const enrichedUsers = (users || []).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      businessName: user.businessName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      documentsCreated: docCounts[user.id]?.total || 0,
      documentsPaid: docCounts[user.id]?.paid || 0,
      subscription: subMap[user.id] || null,
    }));

    logger.info("admin_users_listed", { page, count });

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error("admin_users_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
