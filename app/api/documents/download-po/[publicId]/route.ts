// app/api/documents/download-po/[publicId]/route.ts — Purchase Order PDF download
import { NextRequest, NextResponse } from "next/server";
import { getPurchaseOrderByPublicId, consumePurchaseOrderDownload, markPurchaseOrderPaid, useSubscriptionDocument } from "@/lib/db";
import { renderPurchaseOrderPdf } from "@/lib/purchase-order-pdf";
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
    const po = await getPurchaseOrderByPublicId(params.publicId);
    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Check subscription before consume
    if (po.userId) {
      const tenant = await getTenantContext();
      if (tenant.isAuthenticated && tenant.userId === po.userId) {
        const usage = await useSubscriptionDocument(tenant.userId);
        if (usage) {
          await markPurchaseOrderPaid(po.id);
          logger.info("subscription_doc_used", {
            publicId: params.publicId,
            plan: usage.sub_plan,
            remaining: usage.documents_remaining,
            docType: "PURCHASE_ORDER",
          });
          let pdfBuffer: Buffer;
          try {
            pdfBuffer = await renderPurchaseOrderPdf(po, { showWatermark: false });
          } catch (error) {
            if (error instanceof Error && error.message === "PDF_BUSY") {
              return NextResponse.json(
                { error: "Server busy generating PDFs, please retry in a few seconds" },
                { status: 503, headers: { "Retry-After": "5" } }
              );
            }
            throw error;
          }
          const filename = `${po.purchaseOrderNumber}.pdf`;
          logger.done("po_pdf_download", { publicId: params.publicId, purchaseOrderId: po.id, size: pdfBuffer.length });
          return new Response(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Content-Length": String(pdfBuffer.length),
              "Cache-Control": "no-store",
            },
          });
        }
      }
    }

    // Atomic claim: flip isPaid from true to false, returns false if already consumed
    const claimed = await consumePurchaseOrderDownload(po.id);
    if (!claimed) {
      return NextResponse.json(
        { error: "Payment required", publicId: params.publicId },
        { status: 402 }
      );
    }

    // Generate PDF (isPaid is now false, no race condition possible)
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderPurchaseOrderPdf(po, { showWatermark: false });
    } catch (error) {
      if (error instanceof Error && error.message === "PDF_BUSY") {
        return NextResponse.json(
          { error: "Server busy generating PDFs, please retry in a few seconds" },
          { status: 503, headers: { "Retry-After": "5" } }
        );
      }
      throw error;
    }

    const filename = `${po.purchaseOrderNumber}.pdf`;

    logger.done("po_pdf_download", {
      publicId: params.publicId,
      purchaseOrderId: po.id,
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
    logger.error("po_pdf_download_error", {
      publicId: params.publicId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
