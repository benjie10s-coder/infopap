// app/api/admin/badges/route.ts — Sidebar badge counts (failed payments, expiring subs)
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
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

    // Count failed payments in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: failedPayments } = await admin
      .from("Payment")
      .select("id", { count: "exact", head: true })
      .eq("status", "FAILED")
      .gte("createdAt", weekAgo);

    // Count subscriptions expiring in next 7 days
    const now = new Date().toISOString();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: expiringSubs } = await admin
      .from("Subscription")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .gte("expiresAt", now)
      .lte("expiresAt", nextWeek);

    return NextResponse.json({
      payments: failedPayments || 0,
      subscriptions: expiringSubs || 0,
    });
  } catch {
    return NextResponse.json({ payments: 0, subscriptions: 0 });
  }
}
