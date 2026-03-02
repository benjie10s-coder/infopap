// app/api/payments/initiate/route.ts — POST (STK Push initiation for ALL document types)
import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentIfUnpaid,
  updatePaymentToProcessing,
  createCashSalePaymentIfUnpaid,
  updateCashSalePaymentToProcessing,
  createDeliveryNotePaymentIfUnpaid,
  updateDeliveryNotePaymentToProcessing,
  createReceiptPaymentIfUnpaid,
  updateReceiptPaymentToProcessing,
  createPurchaseOrderPaymentIfUnpaid,
  updatePurchaseOrderPaymentToProcessing,
  createQuotationPaymentIfUnpaid,
  updateQuotationPaymentToProcessing,
} from "@/lib/db";
import { getAdminClient } from "@/lib/supabase/admin";
import { InitiatePaymentSchema, type PayableDocumentType } from "@/lib/validators";
import { initiateSTKPush, normalizePhoneNumber } from "@/lib/mpesa";
import { isMpesaEnabled } from "@/lib/env";
import { checkRateLimit, paymentLimiter } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { ZodError } from "zod";

export const maxDuration = 60; // Allow up to 60s for M-Pesa STK Push (includes token fetch + retries)

const DOWNLOAD_PRICE = 10; // KSh 10

// Slim document info — only the 4 fields payment needs (skips lineItems, photos)
interface SlimDocument {
  id: string;
  userId: string | null;
  isPaid: boolean;
  docNumber: string;
}

// Map document types to their Supabase table and number column
const DOC_TABLE_MAP: Record<PayableDocumentType, { table: string; numberCol: string }> = {
  INVOICE: { table: "Invoice", numberCol: "invoiceNumber" },
  CASH_SALE: { table: "CashSale", numberCol: "cashSaleNumber" },
  DELIVERY_NOTE: { table: "DeliveryNote", numberCol: "deliveryNoteNumber" },
  RECEIPT: { table: "Receipt", numberCol: "receiptNumber" },
  PURCHASE_ORDER: { table: "PurchaseOrder", numberCol: "purchaseOrderNumber" },
  QUOTATION: { table: "Quotation", numberCol: "quotationNumber" },
};

/**
 * Fetch only the 4 fields needed for payment (id, userId, isPaid, docNumber).
 * Single query instead of 2-3 sequential queries (skips lineItems + photos).
 * Saves ~100-200ms per payment initiation.
 */
async function getDocumentSlim(
  documentType: PayableDocumentType,
  publicId: string
): Promise<SlimDocument | null> {
  const admin = getAdminClient();
  const { table, numberCol } = DOC_TABLE_MAP[documentType];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from(table)
    .select(`id, userId, isPaid, ${numberCol}`)
    .eq("publicId", publicId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.userId,
    isPaid: data.isPaid,
    docNumber: data[numberCol],
  };
}

// Payment operation factories by document type
function getPaymentOps(documentType: PayableDocumentType) {
  switch (documentType) {
    case "INVOICE":
      return {
        createPayment: (p: { docId: string; userId: string | null; phoneNumber: string; amount: number }) =>
          createPaymentIfUnpaid({ invoiceId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updatePaymentToProcessing,
      };
    case "CASH_SALE":
      return {
        createPayment: (p: { docId: string; userId: string | null; phoneNumber: string; amount: number }) =>
          createCashSalePaymentIfUnpaid({ cashSaleId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updateCashSalePaymentToProcessing,
      };
    case "DELIVERY_NOTE":
      return {
        createPayment: (p: { docId: string; userId: string | null; phoneNumber: string; amount: number }) =>
          createDeliveryNotePaymentIfUnpaid({ deliveryNoteId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updateDeliveryNotePaymentToProcessing,
      };
    case "RECEIPT":
      return {
        createPayment: (p: { docId: string; userId: string | null; phoneNumber: string; amount: number }) =>
          createReceiptPaymentIfUnpaid({ receiptId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updateReceiptPaymentToProcessing,
      };
    case "PURCHASE_ORDER":
      return {
        createPayment: (p: { docId: string; userId: string | null; phoneNumber: string; amount: number }) =>
          createPurchaseOrderPaymentIfUnpaid({ purchaseOrderId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updatePurchaseOrderPaymentToProcessing,
      };
    case "QUOTATION":
      return {
        createPayment: (p: { docId: string; userId: string | null; phoneNumber: string; amount: number }) =>
          createQuotationPaymentIfUnpaid({ quotationId: p.docId, userId: p.userId, phoneNumber: p.phoneNumber, amount: p.amount }),
        updateToProcessing: updateQuotationPaymentToProcessing,
      };
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger();
  const t0 = Date.now();

  // Rate limit: 5/min per IP
  const limited = await checkRateLimit(paymentLimiter, request);
  if (limited) return limited;
  const tRateLimit = Date.now();

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

    // Slim document lookup — single query for just id, userId, isPaid, docNumber
    // (skips lineItems + photos, saves ~100-200ms vs full getXByPublicId)
    logger.info("payment_resolve_document", { documentType, publicId });
    let document: SlimDocument | null;
    try {
      document = await getDocumentSlim(documentType, publicId);
    } catch (resolveError) {
      logger.error("payment_resolve_document_error", {
        documentType,
        publicId,
        error: resolveError instanceof Error ? resolveError.message : String(resolveError),
        stack: resolveError instanceof Error ? resolveError.stack : undefined,
      });
      return NextResponse.json(
        { error: `Failed to look up ${documentType.toLowerCase()}` },
        { status: 500 }
      );
    }
    const tDocLookup = Date.now();

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

    // Get payment operations for this document type
    const { createPayment, updateToProcessing } = getPaymentOps(documentType);

    // Atomically create payment (prevents double-payment)
    const paymentResult = await createPayment({
      docId: document.id,
      userId: document.userId,
      phoneNumber: normalizedPhone,
      amount: DOWNLOAD_PRICE,
    });
    const tCreatePayment = Date.now();

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
    const tStkPush = Date.now();

    // Await updateToProcessing — callback needs checkoutRequestId to find this payment
    try {
      await updateToProcessing(
        paymentResult.paymentId,
        stkResponse.MerchantRequestID,
        stkResponse.CheckoutRequestID
      );
    } catch (err) {
      logger.error("update_processing_failed", {
        paymentId: paymentResult.paymentId,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    // Timing breakdown — visible in Railway logs for diagnosing latency
    const tTotal = Date.now();
    logger.done("payment_initiated", {
      publicId,
      documentType,
      paymentId: paymentResult.paymentId,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      timing: {
        rateLimitMs: tRateLimit - t0,
        docLookupMs: tDocLookup - tRateLimit,
        createPaymentMs: tCreatePayment - tDocLookup,
        stkPushMs: tStkPush - tCreatePayment,
        totalMs: tTotal - t0,
      },
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
