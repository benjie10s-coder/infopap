// app/api/health/route.ts — Health check endpoint
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Probe the database so Railway marks the service unhealthy on DB connection loss
  let dbStatus: "ok" | "error" = "ok";
  let dbError: string | undefined;
  try {
    const admin = getAdminClient();
    const { error } = await admin.from("Invoice").select("id").limit(1);
    if (error) {
      dbStatus = "error";
      dbError = error.message;
    }
  } catch (err) {
    dbStatus = "error";
    dbError = err instanceof Error ? err.message : "Unknown error";
  }

  const healthy = dbStatus === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      db: dbStatus,
      ...(dbError ? { dbError } : {}),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    { status: healthy ? 200 : 503 }
  );
}
