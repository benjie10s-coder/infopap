// app/api/documents/download/[publicId]/route.ts — PDF download 
import { NextRequest, NextResponse } from "next/server";
import { getInvoiceByPublicId, markInvoicePaid, useSubscriptionDocument } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/pdf";
import { checkRateLimit, publicReadLimiter } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { getTenantContext } from "@/lib/session";

export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  const logger = createRequestLogger();

  const limited = await checkRateLimit(publicReadLimiter, request);
  if (limited) return limited;

  try {
    const invoice = await getInvoiceByPublicId(params.publicId);
    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify payment — do not consume/destroy isPaid so re-downloads are always allowed
    if (!invoice.isPaid) {
      // Check if user has an active subscription
      if (invoice.userId) {
        const tenant = await getTenantContext();
        if (tenant.isAuthenticated && tenant.userId === invoice.userId) {
          const usage = await useSubscriptionDocument(tenant.userId);
          if (usage) {
            await markInvoicePaid(invoice.id);
            logger.info("subscription_doc_used", {
              publicId: params.publicId,
              plan: usage.sub_plan,
              remaining: usage.documents_remaining,
            });
            // Fall through to PDF generation
          } else {
            return NextResponse.json(
              { error: "Payment required", publicId: params.publicId },
              { status: 402 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "Payment required", publicId: params.publicId },
            { status: 402 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Payment required", publicId: params.publicId },
          { status: 402 }
        );
      }
    }

    // Generate PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderInvoicePdf(invoice, { showWatermark: false });
    } catch (error) {
      if (error instanceof Error && error.message === "PDF_BUSY") {
        return NextResponse.json(
          { error: "Server busy generating PDFs, please retry in a few seconds" },
          { status: 503, headers: { "Retry-After": "5" } }
        );
      }
      throw error;
    }

    const filename = `${invoice.invoiceNumber}.pdf`;

    logger.done("pdf_download", {
      publicId: params.publicId,
      invoiceId: invoice.id,
      size: pdfBuffer.length,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("pdf_download_error", {
      publicId: params.publicId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
