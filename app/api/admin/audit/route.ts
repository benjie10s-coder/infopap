// app/api/admin/audit/route.ts — Audit log listing API
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
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const actionFilter = url.searchParams.get("action") || "";
    const targetTypeFilter = url.searchParams.get("targetType") || "";
    const offset = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (admin as any)
      .from("AuditLog")
      .select("*", { count: "exact" })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionFilter) query = query.eq("action", actionFilter);
    if (targetTypeFilter) query = query.eq("targetType", targetTypeFilter);

    const { data, count, error } = await query;
    if (error) throw error;

    // Get unique action types for filter dropdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: actionTypes } = await (admin as any)
      .from("AuditLog")
      .select("action")
      .limit(1000);
    const uniqueActions = [...new Set((actionTypes || []).map((a: Record<string, string>) => a.action))].sort();

    logger.info("admin_audit_listed", { page, count });

    return NextResponse.json({
      entries: data || [],
      pagination: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      actionTypes: uniqueActions,
    });
  } catch (error) {
    logger.error("admin_audit_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to list audit log" }, { status: 500 });
  }
}
