// app/api/payments/initiate/route.ts — POST (STK Push initiation for ALL document types)
import { NextRequest, NextResponse } from "next/server";
import {
  getInvoiceByPublicId,
  createPaymentIfUnpaid,
  updatePaymentToProcessing,
  getCashSaleByPublicId,
  createCashSalePaymentIfUnpaid,
  updateCashSalePaymentToProcessing,
  getDeliveryNoteByPublicId,
  createDeliveryNotePaymentIfUnpaid,
  updateDeliveryNotePaymentToProcessing,
  getReceiptByPublicId,
  createReceiptPaymentIfUnpaid,
  updateReceiptPaymentToProcessing,
  getPurchaseOrderByPublicId,
  createPurchaseOrderPaymentIfUnpaid,
  updatePurchaseOrderPaymentToProcessing,
  getQuotationByPublicId,
  createQuotationPaymentIfUnpaid,
  updateQuotationPaymentToProcessing,
} from "@/lib/db";
import { InitiatePaymentSchema, type PayableDocumentType } from "@/lib/validators";
import { initiateSTKPush, normalizePhoneNumber } from "@/lib/mpesa";
import { isMpesaEnabled } from "@/lib/env";
import { checkRateLimit, paymentLimiter } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { ZodError } from "zod";

export const maxDuration = 60; // Allow up to 60s for M-Pesa STK Push (includes token fetch + retries)

const DOWNLOAD_PRICE = 10; // KSh 10

// Helper: resolve document by type and publicId
async function resolveDocument(
  documentType: PayableDocumentType,
  publicId: string
): Promise<{
  document: { id: string; userId: string | null; isPaid: boolean; docNumber: string } | null;
  createPayment: (params: { docId: string; userId: string | null; phoneNumber: string; amount: number }) => Promise<
    | { success: true; paymentId: string }
    | { success: false; error: string; code: string; paymentId?: string }
  >;
  updateToProcessing: (paymentId: string, merchantRequestId: string, checkoutRequestId: string) => Promise<void>;
}> {
  switch (documentType) {
    case "INVOICE": {
      const inv = await getInvoiceByPublicId(publicId);
      return {
        document: inv ? { id: inv.id, userId: inv.userId, isPaid: inv.isPaid, docNumber: inv.invoiceNumber } : null,
        createPayment: (p) => createPaymentIfUnpaid({ invoiceId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updatePaymentToProcessing,
      };
    }
    case "CASH_SALE": {
      const cs = await getCashSaleByPublicId(publicId);
      return {
        document: cs ? { id: cs.id, userId: cs.userId, isPaid: cs.isPaid, docNumber: cs.cashSaleNumber } : null,
        createPayment: (p) => createCashSalePaymentIfUnpaid({ cashSaleId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updateCashSalePaymentToProcessing,
      };
    }
    case "DELIVERY_NOTE": {
      const dn = await getDeliveryNoteByPublicId(publicId);
      return {
        document: dn ? { id: dn.id, userId: dn.userId, isPaid: dn.isPaid, docNumber: dn.deliveryNoteNumber } : null,
        createPayment: (p) => createDeliveryNotePaymentIfUnpaid({ deliveryNoteId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updateDeliveryNotePaymentToProcessing,
      };
    }
    case "RECEIPT": {
      const rct = await getReceiptByPublicId(publicId);
      return {
        document: rct ? { id: rct.id, userId: rct.userId, isPaid: rct.isPaid, docNumber: rct.receiptNumber } : null,
        createPayment: (p) => createReceiptPaymentIfUnpaid({ receiptId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updateReceiptPaymentToProcessing,
      };
    }
    case "PURCHASE_ORDER": {
      const po = await getPurchaseOrderByPublicId(publicId);
      return {
        document: po ? { id: po.id, userId: po.userId, isPaid: po.isPaid, docNumber: po.purchaseOrderNumber } : null,
        createPayment: (p) => createPurchaseOrderPaymentIfUnpaid({ purchaseOrderId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updatePurchaseOrderPaymentToProcessing,
      };
    }
    case "QUOTATION": {
      const q = await getQuotationByPublicId(publicId);
      return {
        document: q ? { id: q.id, userId: q.userId, isPaid: q.isPaid, docNumber: q.quotationNumber } : null,
        createPayment: (p) => createQuotationPaymentIfUnpaid({ quotationId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updateQuotationPaymentToProcessing,
      };
    }
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger();

  // Rate limit: 5/min per IP
  const limited = await checkRateLimit(paymentLimiter, request);
  if (limited) return limited;

  try {
    // Validate input
    const body = await request.json();
    logger.info("payment_initiate_request", {
      documentType: body?.documentType,
      publicId: body?.publicId,
      hasPhone: !!body?.phoneNumber,
    });
    const { publicId, phoneNumber, documentType } = InitiatePaymentSchema.parse(body);

    // Check M-Pesa is configured
    if (!isMpesaEnabled()) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    // Look up document by type
    logger.info("payment_resolve_document", { documentType, publicId });
    let resolved;
    try {
      resolved = await resolveDocument(documentType, publicId);
    } catch (resolveError) {
      logger.error("payment_resolve_document_error", {
        documentType,
        publicId,
        error: resolveError instanceof Error ? resolveError.message : String(resolveError),
        stack: resolveError instanceof Error ? resolveError.stack : undefined,
        errorKeys: resolveError && typeof resolveError === "object" ? Object.keys(resolveError) : [],
      });
      return NextResponse.json(
        { error: `Failed to look up ${documentType.toLowerCase()}` },
        { status: 500 }
      );
    }
    const { document, createPayment, updateToProcessing } = resolved;
    if (!document) {
      logger.error("payment_document_not_found", { documentType, publicId });
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if already paid
    if (document.isPaid) {
      return NextResponse.json(
        { error: "Document already paid", isPaid: true },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Atomically create payment (prevents double-payment)
    const paymentResult = await createPayment({
      docId: document.id,
      userId: document.userId,
      phoneNumber: normalizedPhone,
      amount: DOWNLOAD_PRICE,
    });

    if (!paymentResult.success) {
      logger.error("payment_rpc_failed", {
        documentType,
        publicId,
        error: paymentResult.error,
        code: paymentResult.code,
        docId: document.id,
      });
      const status = paymentResult.code === "PAYMENT_IN_PROGRESS" ? 409 : 400;
      return NextResponse.json(
        { error: paymentResult.error, code: paymentResult.code },
        { status }
      );
    }

    // Initiate STK Push
    const stkResponse = await initiateSTKPush({
      phoneNumber: normalizedPhone,
      amount: DOWNLOAD_PRICE,
      accountReference: document.docNumber.substring(0, 12),
      transactionDesc: "Invopap Doc",
    });

    // Fire-and-forget: update payment to PROCESSING with Daraja IDs.
    // The client doesn't need to wait for this DB write — the STK prompt
    // is already on its way to the user's phone. This saves ~30-80ms of
    // perceived latency. Errors are logged but don't block the response.
    updateToProcessing(
      paymentResult.paymentId,
      stkResponse.MerchantRequestID,
      stkResponse.CheckoutRequestID
    ).catch((err) =>
      logger.error("update_processing_failed", {
        paymentId: paymentResult.paymentId,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        error: err instanceof Error ? err.message : String(err),
      })
    );

    logger.done("payment_initiated", {
      publicId,
      documentType,
      paymentId: paymentResult.paymentId,
      checkoutRequestId: stkResponse.CheckoutRequestID,
    });

    return NextResponse.json({
      checkoutRequestId: stkResponse.CheckoutRequestID,
      customerMessage: stkResponse.CustomerMessage,
      paymentId: paymentResult.paymentId,
    });
  } catch (error) {
    // Zod validation errors — use instanceof for precise detection
    if (error instanceof ZodError) {
      logger.error("payment_validation_failed", {
        issues: error.issues,
        formattedErrors: error.format(),
      });
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    // Fallback: legacy check for ZodError-like objects (e.g. from different Zod versions)
    if (error && typeof error === "object" && "issues" in error && !(error instanceof Error)) {
      logger.error("payment_validation_failed_legacy", {
        errorType: (error as Record<string, unknown>).constructor?.name,
        issues: (error as Record<string, unknown>).issues,
        errorKeys: Object.keys(error),
      });
      return NextResponse.json(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { error: "Validation failed", details: (error as any).issues },
        { status: 400 }
      );
    }

    const errMsg = error instanceof Error ? error.message : "Unknown error";

    logger.error("payment_initiate_error", {
      error: errMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Phone number validation errors → 400
    if (errMsg.includes("Invalid phone number")) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use 07XX, 01XX, or 254XX format." },
        { status: 400 }
      );
    }

    // M-Pesa timeout or network errors → 504
    if (
      errMsg.includes("aborted") ||
      errMsg.includes("TimeoutError") ||
      errMsg.includes("ETIMEDOUT") ||
      errMsg.includes("fetch failed")
    ) {
      return NextResponse.json(
        { error: "M-Pesa service timed out. Please try again." },
        { status: 504 }
      );
    }

    // M-Pesa API errors → 502
    if (errMsg.includes("STK Push failed") || errMsg.includes("STK Push rejected")) {
      return NextResponse.json(
        { error: "M-Pesa service error. Please try again shortly." },
        { status: 502 }
      );
    }

    // M-Pesa credentials not configured → 503
    if (errMsg.includes("not configured")) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
