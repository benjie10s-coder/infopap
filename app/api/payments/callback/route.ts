// app/api/payments/callback/route.ts — POST (Safaricom M-Pesa callback for ALL document types)
import { NextRequest, NextResponse } from "next/server";
import {
  parseSTKCallback,
  isSafaricomIP,
  type STKCallbackData,
} from "@/lib/mpesa";
import {
  // Invoice payments
  updatePaymentCompleted,
  updatePaymentFailed,
  getPaymentByCheckoutRequestId,
  markInvoicePaid,
  // Cash sale payments
  getCashSalePaymentByCheckoutRequestId,
  updateCashSalePaymentCompleted,
  updateCashSalePaymentFailed,
  markCashSalePaid,
  // Delivery note payments
  getDeliveryNotePaymentByCheckoutRequestId,
  updateDeliveryNotePaymentCompleted,
  updateDeliveryNotePaymentFailed,
  markDeliveryNotePaid,
  // Receipt payments
  getReceiptPaymentByCheckoutRequestId,
  updateReceiptPaymentCompleted,
  updateReceiptPaymentFailed,
  markReceiptPaid,
  // Purchase order payments
  getPurchaseOrderPaymentByCheckoutRequestId,
  updatePurchaseOrderPaymentCompleted,
  updatePurchaseOrderPaymentFailed,
  markPurchaseOrderPaid,
  // Quotation payments
  getQuotationPaymentByCheckoutRequestId,
  updateQuotationPaymentCompleted,
  updateQuotationPaymentFailed,
  markQuotationPaid,
} from "@/lib/db";
import { getClientIP } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";

const DOWNLOAD_PRICE = 10; // KSh 10

// Always return 200 to Safaricom — non-200 causes retries
const OK_RESPONSE = NextResponse.json(
  { ResultCode: 0, ResultDesc: "Accepted" },
  { status: 200 }
);

// Generic payment record shape used across all document types
interface PaymentRecord {
  id: string;
  documentId: string;
  status: string;
  documentType: "INVOICE" | "CASH_SALE" | "DELIVERY_NOTE" | "RECEIPT" | "PURCHASE_ORDER" | "QUOTATION";
}

// Search all payment tables for a checkoutRequestId
async function findPaymentByCheckoutRequestId(
  checkoutRequestId: string
): Promise<PaymentRecord | null> {
  // Check invoice payments first (most common)
  const invPayment = await getPaymentByCheckoutRequestId(checkoutRequestId);
  if (invPayment) return { id: invPayment.id, documentId: invPayment.invoiceId, status: invPayment.status, documentType: "INVOICE" };

  const csPayment = await getCashSalePaymentByCheckoutRequestId(checkoutRequestId);
  if (csPayment) return { id: csPayment.id, documentId: csPayment.cashSaleId, status: csPayment.status, documentType: "CASH_SALE" };

  const dnPayment = await getDeliveryNotePaymentByCheckoutRequestId(checkoutRequestId);
  if (dnPayment) return { id: dnPayment.id, documentId: dnPayment.deliveryNoteId, status: dnPayment.status, documentType: "DELIVERY_NOTE" };

  const rctPayment = await getReceiptPaymentByCheckoutRequestId(checkoutRequestId);
  if (rctPayment) return { id: rctPayment.id, documentId: rctPayment.receiptId, status: rctPayment.status, documentType: "RECEIPT" };

  const poPayment = await getPurchaseOrderPaymentByCheckoutRequestId(checkoutRequestId);
  if (poPayment) return { id: poPayment.id, documentId: poPayment.purchaseOrderId, status: poPayment.status, documentType: "PURCHASE_ORDER" };

  const qPayment = await getQuotationPaymentByCheckoutRequestId(checkoutRequestId);
  if (qPayment) return { id: qPayment.id, documentId: qPayment.quotationId, status: qPayment.status, documentType: "QUOTATION" };

  return null;
}

// Complete a payment by document type
async function completePayment(
  checkoutRequestId: string,
  params: { mpesaReceiptNumber: string; transactionDate?: string; amount: number; phoneNumber?: string },
  documentType: string
) {
  switch (documentType) {
    case "INVOICE": return updatePaymentCompleted(checkoutRequestId, params);
    case "CASH_SALE": return updateCashSalePaymentCompleted(checkoutRequestId, params);
    case "DELIVERY_NOTE": return updateDeliveryNotePaymentCompleted(checkoutRequestId, params);
    case "RECEIPT": return updateReceiptPaymentCompleted(checkoutRequestId, params);
    case "PURCHASE_ORDER": return updatePurchaseOrderPaymentCompleted(checkoutRequestId, params);
    case "QUOTATION": return updateQuotationPaymentCompleted(checkoutRequestId, params);
    default: return null;
  }
}

// Fail a payment by document type
async function failPayment(checkoutRequestId: string, resultCode: string, resultDesc: string, documentType: string) {
  switch (documentType) {
    case "INVOICE": return updatePaymentFailed(checkoutRequestId, resultCode, resultDesc);
    case "CASH_SALE": return updateCashSalePaymentFailed(checkoutRequestId, resultCode, resultDesc);
    case "DELIVERY_NOTE": return updateDeliveryNotePaymentFailed(checkoutRequestId, resultCode, resultDesc);
    case "RECEIPT": return updateReceiptPaymentFailed(checkoutRequestId, resultCode, resultDesc);
    case "PURCHASE_ORDER": return updatePurchaseOrderPaymentFailed(checkoutRequestId, resultCode, resultDesc);
    case "QUOTATION": return updateQuotationPaymentFailed(checkoutRequestId, resultCode, resultDesc);
  }
}

// Mark a document as paid by type
async function markDocumentPaid(documentId: string, documentType: string) {
  switch (documentType) {
    case "INVOICE": return markInvoicePaid(documentId);
    case "CASH_SALE": return markCashSalePaid(documentId);
    case "DELIVERY_NOTE": return markDeliveryNotePaid(documentId);
    case "RECEIPT": return markReceiptPaid(documentId);
    case "PURCHASE_ORDER": return markPurchaseOrderPaid(documentId);
    case "QUOTATION": return markQuotationPaid(documentId);
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger();

  try {
    // 1. Verify callback secret (if configured)
    const callbackSecret = process.env.MPESA_CALLBACK_SECRET;
    if (callbackSecret) {
      const url = new URL(request.url);
      const token = url.searchParams.get("token");
      if (token !== callbackSecret) {
        logger.warn("payment_callback_invalid_secret", {
          ip: getClientIP(request),
        });
        return OK_RESPONSE; // Still return 200 to avoid retries
      }
    }

    // 2. IP whitelist (production)
    const clientIP = getClientIP(request);
    if (!isSafaricomIP(clientIP)) {
      logger.warn("payment_callback_invalid_ip", { ip: clientIP });
      return OK_RESPONSE;
    }

    // 3. Parse callback data
    const data: STKCallbackData = await request.json();
    const parsed = parseSTKCallback(data);

    logger.info("payment_callback_received", {
      checkoutRequestId: parsed.checkoutRequestId,
      resultCode: parsed.resultCode,
      success: parsed.success,
    });

    // 4. Look up the payment across all document payment tables
    const payment = await findPaymentByCheckoutRequestId(
      parsed.checkoutRequestId
    );

    if (!payment) {
      logger.warn("payment_callback_no_payment", {
        checkoutRequestId: parsed.checkoutRequestId,
        resultCode: parsed.resultCode,
        success: parsed.success,
      });
      return OK_RESPONSE;
    }

    logger.info("payment_callback_found", {
      paymentId: payment.id,
      documentId: payment.documentId,
      documentType: payment.documentType,
      currentStatus: payment.status,
    });

    // 5. Idempotency: skip if already in terminal state
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(payment.status)) {
      logger.info("payment_callback_already_terminal", {
        paymentId: payment.id,
        status: payment.status,
        documentType: payment.documentType,
      });
      return OK_RESPONSE;
    }

    // 6. Handle success
    if (parsed.success) {
      // Hard block: reject amounts below KSh 10
      if (parsed.amount && parsed.amount < DOWNLOAD_PRICE) {
        logger.error("payment_callback_amount_below_minimum", {
          expected: DOWNLOAD_PRICE,
          received: parsed.amount,
          paymentId: payment.id,
          documentType: payment.documentType,
        });
        // Treat as failed — do NOT mark as paid
        await failPayment(
          parsed.checkoutRequestId,
          "AMOUNT_BELOW_MINIMUM",
          `Amount ${parsed.amount} is below minimum ${DOWNLOAD_PRICE}`,
          payment.documentType
        );
        return OK_RESPONSE;
      }

      const updatedPayment = await completePayment(
        parsed.checkoutRequestId,
        {
          mpesaReceiptNumber: parsed.mpesaReceiptNumber || "",
          transactionDate: parsed.transactionDate,
          amount: parsed.amount || DOWNLOAD_PRICE,
          phoneNumber: parsed.phoneNumber,
        },
        payment.documentType
      );

      if (updatedPayment) {
        // Mark the document as paid
        await markDocumentPaid(payment.documentId, payment.documentType);

        logger.info("payment_completed", {
          paymentId: payment.id,
          documentId: payment.documentId,
          documentType: payment.documentType,
          receipt: parsed.mpesaReceiptNumber,
        });
      } else {
        // completePayment returned null — payment row may already be terminal
        // but Safaricom confirmed success (resultCode 0), so mark document paid anyway
        logger.error("payment_callback_complete_returned_null", {
          paymentId: payment.id,
          documentId: payment.documentId,
          documentType: payment.documentType,
          checkoutRequestId: parsed.checkoutRequestId,
          paymentStatus: payment.status,
          receipt: parsed.mpesaReceiptNumber,
        });

        // Fallback: Safaricom says paid, so honour it
        await markDocumentPaid(payment.documentId, payment.documentType);

        logger.info("payment_completed_via_fallback", {
          paymentId: payment.id,
          documentId: payment.documentId,
          documentType: payment.documentType,
          receipt: parsed.mpesaReceiptNumber,
        });
      }
    } else {
      // 7. Handle failure
      await failPayment(
        parsed.checkoutRequestId,
        String(parsed.resultCode),
        parsed.resultDesc,
        payment.documentType
      );

      logger.info("payment_failed", {
        paymentId: payment.id,
        documentType: payment.documentType,
        resultCode: parsed.resultCode,
        resultDesc: parsed.resultDesc,
      });
    }

    return OK_RESPONSE;
  } catch (error) {
    logger.error("payment_callback_error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return OK_RESPONSE; // Always return 200
  }
}
