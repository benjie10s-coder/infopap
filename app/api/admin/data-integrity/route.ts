// app/api/admin/data-integrity/route.ts
// Returns a comprehensive data integrity report to help diagnose admin dashboard accuracy issues

import { NextRequest, NextResponse } from "next/server";
import { generateIntegrityReport } from "@/lib/admin/data-integrity-checker";
import { createRequestLogger } from "@/lib/logger";

const logger = createRequestLogger();

export async function GET(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { error: "Admin endpoint not configured" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("data_integrity_check_requested");

    const report = await generateIntegrityReport();

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "private, max-age=0", // Don't cache, always fresh
      },
    });
  } catch (error) {
    logger.error("data_integrity_check_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to generate integrity report" },
      { status: 500 }
    );
  }
}
