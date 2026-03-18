// app/api/admin/subscriptions/route.ts — Admin subscription listing + management
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
    const status = url.searchParams.get("status") || "";
    const plan = url.searchParams.get("plan") || "";
    const offset = (page - 1) * limit;

    let query = admin
      .from("Subscription")
      .select("*, User!inner(name, email)", { count: "exact" })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (plan) query = query.eq("plan", plan);

    const { data: subscriptions, count, error } = await query;
    if (error) throw error;

    // Aggregate stats
    const [activeSubs, totalRevenue, expiringSoon] = await Promise.all([
      admin.from("Subscription").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      admin.from("Subscription").select("amountPaid").eq("status", "ACTIVE"),
      admin.from("Subscription").select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE")
        .lte("expiresAt", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const totalSubRevenue = (totalRevenue.data || []).reduce(
      (sum, s) => sum + (s.amountPaid || 0),
      0
    );

    logger.info("admin_subscriptions_listed", { page, count });

    return NextResponse.json({
      subscriptions: subscriptions || [],
      pagination: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      aggregates: {
        activeSubs: activeSubs.count || 0,
        totalSubRevenue,
        expiringSoon: expiringSoon.count || 0,
      },
    });
  } catch (error) {
    logger.error("admin_subscriptions_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to list subscriptions" }, { status: 500 });
  }
}
