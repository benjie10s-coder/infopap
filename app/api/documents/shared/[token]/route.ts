// app/api/documents/shared/[token]/route.ts — Download document via share token
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, publicReadLimiter } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";

// Import all PDF renderers
import { renderInvoicePdf } from "@/lib/pdf";
import { renderCashSalePdf } from "@/lib/cash-sale-pdf";
import { renderDeliveryNotePdf } from "@/lib/delivery-note-pdf";
import { renderReceiptPdf } from "@/lib/receipt-pdf";
import { renderPurchaseOrderPdf } from "@/lib/purchase-order-pdf";
import { renderQuotationPdf } from "@/lib/quotation-pdf";

// Import DB getters
import {
  getInvoiceByPublicId,
  getCashSaleByPublicId,
  getDeliveryNoteByPublicId,
  getReceiptByPublicId,
  getPurchaseOrderByPublicId,
  getQuotationByPublicId,
} from "@/lib/db";

export const maxDuration = 30;

interface DocumentInfo {
  documentType: string;
  documentId: string;
  publicId: string;
  userId: string | null;
  guestSessionId: string | null;
  isPaid: boolean;
}

async function findDocumentByToken(token: string): Promise<DocumentInfo | null> {
  const admin = getAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).rpc("find_document_by_share_token", {
    p_token: token,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const doc = data[0];
  return {
    documentType: doc.document_type,
    documentId: doc.document_id,
    publicId: doc.public_id,
    userId: doc.user_id,
    guestSessionId: doc.guest_session_id,
    isPaid: doc.is_paid,
  };
}

async function consumeGuestShareToken(token: string, documentType: string): Promise<void> {
  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).rpc("consume_guest_share_token", {
    p_token: token,
    p_document_type: documentType,
  });
}

async function generatePdfForDocument(
  documentType: string,
  publicId: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  switch (documentType) {
    case "invoice": {
      const doc = await getInvoiceByPublicId(publicId);
      if (!doc) return null;
      const buffer = await renderInvoicePdf(doc, { showWatermark: false });
      return { buffer, filename: `${doc.invoiceNumber}.pdf` };
    }
    case "cash-sale": {
      const doc = await getCashSaleByPublicId(publicId);
      if (!doc) return null;
      const buffer = await renderCashSalePdf(doc, { showWatermark: false });
      return { buffer, filename: `${doc.cashSaleNumber}.pdf` };
    }
    case "delivery-note": {
      const doc = await getDeliveryNoteByPublicId(publicId);
      if (!doc) return null;
      const buffer = await renderDeliveryNotePdf(doc, { showWatermark: false });
      return { buffer, filename: `${doc.deliveryNoteNumber}.pdf` };
    }
    case "receipt": {
      const doc = await getReceiptByPublicId(publicId);
      if (!doc) return null;
      const buffer = await renderReceiptPdf(doc, { showWatermark: false });
      return { buffer, filename: `${doc.receiptNumber}.pdf` };
    }
    case "purchase-order": {
      const doc = await getPurchaseOrderByPublicId(publicId);
      if (!doc) return null;
      const buffer = await renderPurchaseOrderPdf(doc, { showWatermark: false });
      return { buffer, filename: `${doc.purchaseOrderNumber}.pdf` };
    }
    case "quotation": {
      const doc = await getQuotationByPublicId(publicId);
      if (!doc) return null;
      const buffer = await renderQuotationPdf(doc, { showWatermark: false });
      return { buffer, filename: `${doc.quotationNumber}.pdf` };
    }
    default:
      return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const logger = createRequestLogger();
  const { token } = params;

  const limited = await checkRateLimit(publicReadLimiter, request);
  if (limited) return limited;

  try {
    // Find document by share token
    const docInfo = await findDocumentByToken(token);
    
    if (!docInfo) {
      return NextResponse.json(
        { error: "Share link not found or expired" },
        { status: 404 }
      );
    }

    // Payment guard (should be paid if token exists, but check anyway)
    if (!docInfo.isPaid) {
      return NextResponse.json(
        { error: "Document payment status invalid" },
        { status: 402 }
      );
    }

    // Generate PDF
    let pdfResult;
    try {
      pdfResult = await generatePdfForDocument(
        docInfo.documentType,
        docInfo.publicId
      );
    } catch (error) {
      if (error instanceof Error && error.message === "PDF_BUSY") {
        return NextResponse.json(
          { error: "Server busy generating PDFs, please retry in a few seconds" },
          { status: 503, headers: { "Retry-After": "5" } }
        );
      }
      throw error;
    }

    if (!pdfResult) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // For guest documents, consume the share token (single-use)
    // Do this AFTER PDF generation succeeds, so user gets file before token is consumed
    if (!docInfo.userId) {
      await consumeGuestShareToken(token, docInfo.documentType);
      logger.done("guest_share_token_consumed", {
        documentType: docInfo.documentType,
        publicId: docInfo.publicId,
      });
    }

    logger.done("shared_pdf_download", {
      documentType: docInfo.documentType,
      publicId: docInfo.publicId,
      isGuest: !docInfo.userId,
      size: pdfResult.buffer.length,
    });

    return new Response(new Uint8Array(pdfResult.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfResult.filename}"`,
        "Content-Length": String(pdfResult.buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("shared_pdf_download_error", {
      token,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
