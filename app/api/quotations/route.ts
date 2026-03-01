// app/api/quotations/route.ts — GET (list) / POST (create) for Quotations
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/session";
import { createQuotation, listQuotations } from "@/lib/db";
import { CreateQuotationSchema, ListQuotationsSchema } from "@/lib/validators";
import { ZodError } from "zod";
import {
  checkRateLimit,
  invoiceCreateLimiter,
  privateCrudLimiter,
  guestInvoiceLimiter,
} from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const logger = createRequestLogger();

  const limited = await checkRateLimit(privateCrudLimiter, request);
  if (limited) return limited;

  try {
    const ctx = await getTenantContext();
    if (!ctx.userId && !ctx.guestSessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const params = ListQuotationsSchema.parse({
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
      orderBy: url.searchParams.get("orderBy"),
      orderDir: url.searchParams.get("orderDir"),
      cursor: url.searchParams.get("cursor"),
    });

    const { quotations, total } = await listQuotations(ctx, params);

    logger.done("list_quotations", { total, count: quotations.length });

    return NextResponse.json(
      { quotations, total, limit: params.limit, offset: params.offset },
      {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    logger.error("list_quotations_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to list quotations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger();

  const limited = await checkRateLimit(invoiceCreateLimiter, request);
  if (limited) return limited;

  try {
    const ctx = await getTenantContext();
    if (!ctx.userId && !ctx.guestSessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Guest abuse prevention
    if (ctx.guestSessionId) {
      const guestLimited = await checkRateLimit(guestInvoiceLimiter, request);
      if (guestLimited) {
        return NextResponse.json(
          { error: "Guest limit reached. Please sign in." },
          { status: 403 }
        );
      }

      const { total } = await listQuotations(ctx, { limit: 1 });
      if (total >= 50) {
        return NextResponse.json(
          { error: "Guest quotation limit reached. Please sign in." },
          { status: 403 }
        );
      }
    }

    const rawBody = await request.text();
    if (rawBody.length > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Request too large (max 4MB)" },
        { status: 413 }
      );
    }

    const body = JSON.parse(rawBody);
    const validated = CreateQuotationSchema.parse(body);

    const quotation = await createQuotation(ctx, validated);

    logger.done("create_quotation", {
      quotationId: quotation.id,
      publicId: quotation.publicId,
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (error instanceof ZodError) {
      logger.error("create_quotation_validation_failed", {
        issues: error.issues,
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error && typeof error === "object" && "issues" in error) {
      logger.error("create_quotation_validation_failed_legacy", {
        errorType: (error as Record<string, unknown>).constructor?.name,
        errorKeys: Object.keys(error),
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          details: (error as any).issues,
        },
        { status: 400 }
      );
    }

    logger.error("create_quotation_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to create quotation" },
      { status: 500 }
    );
  }
}
