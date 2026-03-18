// app/api/admin/health/route.ts — Service health checks (Supabase, M-Pesa, Resend)
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createRequestLogger } from "@/lib/logger";

interface ServiceHealth {
  service: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs: number;
  message: string;
}

async function checkService(
  name: string,
  fn: () => Promise<void>
): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await fn();
    return {
      service: name,
      status: "HEALTHY",
      latencyMs: Date.now() - start,
      message: "OK",
    };
  } catch (err) {
    const latency = Date.now() - start;
    return {
      service: name,
      status: latency > 5000 ? "DOWN" : "DEGRADED",
      latencyMs: latency,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

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
    const services = await Promise.all([
      // 1. Supabase Database
      checkService("Supabase Database", async () => {
        const admin = getAdminClient();
        const { error } = await admin.from("User").select("id", { count: "exact", head: true });
        if (error) throw new Error(error.message);
      }),

      // 2. Supabase Auth
      checkService("Supabase Auth", async () => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) throw new Error("No Supabase URL configured");
        const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
          headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`Auth health: ${res.status}`);
      }),

      // 3. M-Pesa Daraja
      checkService("M-Pesa Daraja", async () => {
        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        if (!consumerKey || !consumerSecret) throw new Error("M-Pesa credentials not configured");
        const baseUrl = process.env.MPESA_ENV === "production"
          ? "https://api.safaricom.co.ke"
          : "https://sandbox.safaricom.co.ke";
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
        const res = await fetch(
          `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
          {
            headers: { Authorization: `Basic ${auth}` },
            signal: AbortSignal.timeout(10000),
          }
        );
        if (!res.ok) throw new Error(`Daraja auth: ${res.status}`);
        const data = await res.json();
        if (!data.access_token) throw new Error("No access token returned");
      }),

      // 4. Resend Email
      checkService("Resend Email", async () => {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) throw new Error("Resend API key not configured");
        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${resendKey}` },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`Resend API: ${res.status}`);
      }),

      // 5. Redis/Rate Limiter
      checkService("Rate Limiter", async () => {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        if (!redisUrl) throw new Error("Using in-memory fallback (no Redis)");
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        const res = await fetch(`${redisUrl}/ping`, {
          headers: { Authorization: `Bearer ${redisToken}` },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`Redis: ${res.status}`);
      }),
    ]);

    // System metrics
    const admin = getAdminClient();
    const [userCount, invoiceCount, paymentCount, subscriptionCount] = await Promise.all([
      admin.from("User").select("id", { count: "exact", head: true }),
      admin.from("Invoice").select("id", { count: "exact", head: true }),
      admin.from("Payment").select("id", { count: "exact", head: true }),
      admin.from("Subscription").select("id", { count: "exact", head: true }),
    ]);

    const overallStatus = services.every((s) => s.status === "HEALTHY")
      ? "HEALTHY"
      : services.some((s) => s.status === "DOWN")
      ? "DOWN"
      : "DEGRADED";

    logger.info("admin_health_checked", {
      overallStatus,
      services: services.map((s) => `${s.service}:${s.status}`).join(","),
    });

    return NextResponse.json({
      status: overallStatus,
      checkedAt: new Date().toISOString(),
      services,
      metrics: {
        users: userCount.count || 0,
        invoices: invoiceCount.count || 0,
        payments: paymentCount.count || 0,
        subscriptions: subscriptionCount.count || 0,
      },
    }, {
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (error) {
    logger.error("admin_health_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}
