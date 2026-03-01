// app/api/admin/reconcile-payments/route.ts
// Reconciles M-Pesa payments that were marked FAILED by the stale-payment cleanup
// job but whose actual Daraja status was never confirmed.
//
// Trigger this periodically via an external cron — e.g. a Railway Cron Job:
//   URL:    POST https://invopap.com/api/admin/reconcile-payments
//   Header: x-admin-secret: <ADMIN_SECRET>
//   Schedule: every 5 minutes  ("*/5 * * * *")
//
// The endpoint is idempotent — running it more than once with the same data
// is safe because all payment state transitions guard against re-processing
// completed/failed terminal states.

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { querySTKPush } from "@/lib/mpesa";
import { isMpesaEnabled } from "@/lib/env";
import {
  // Invoice
  updatePaymentCompleted,
  updatePaymentFailed,
  markInvoicePaid,
  // Cash sale
  updateCashSalePaymentCompleted,
  updateCashSalePaymentFailed,
  markCashSalePaid,
  // Delivery note
  updateDeliveryNotePaymentCompleted,
  updateDeliveryNotePaymentFailed,
  markDeliveryNotePaid,
  // Receipt
  updateReceiptPaymentCompleted,
  updateReceiptPaymentFailed,
  markReceiptPaid,
  // Purchase order
  updatePurchaseOrderPaymentCompleted,
  updatePurchaseOrderPaymentFailed,
  markPurchaseOrderPaid,
  // Quotation
  updateQuotationPaymentCompleted,
  updateQuotationPaymentFailed,
  markQuotationPaid,
} from "@/lib/db";
import { createRequestLogger } from "@/lib/logger";

// How far back to look for expired payments (2 hours gives plenty of buffer
// for M-Pesa callbacks that are slow to arrive while not re-querying ancient history)
const LOOKBACK_MINUTES = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DocumentType =
  | "INVOICE"
  | "CASH_SALE"
  | "DELIVERY_NOTE"
  | "RECEIPT"
  | "PURCHASE_ORDER"
  | "QUOTATION";

interface ExpiredPayment {
  id: string;
  checkoutRequestId: string;
  documentId: string;
  documentType: DocumentType;
}

/** Fetch recently-expired (Daraja-unconfirmed) payments across all six tables. */
async function getRecentlyExpiredPayments(): Promise<ExpiredPayment[]> {
  const admin = getAdminClient();
  const cutoff = new Date(
    Date.now() - LOOKBACK_MINUTES * 60 * 1000
  ).toISOString();
  const results: ExpiredPayment[] = [];

  // Each payment table has a different foreign-key column name
  const tables: { table: string; docField: string; type: DocumentType }[] = [
    { table: "Payment",             docField: "invoiceId",       type: "INVOICE"        },
    { table: "CashSalePayment",     docField: "cashSaleId",      type: "CASH_SALE"      },
    { table: "DeliveryNotePayment", docField: "deliveryNoteId",  type: "DELIVERY_NOTE"  },
    { table: "ReceiptPayment",      docField: "receiptId",       type: "RECEIPT"        },
    { table: "PurchaseOrderPayment",docField: "purchaseOrderId", type: "PURCHASE_ORDER" },
    { table: "QuotationPayment",    docField: "quotationId",     type: "QUOTATION"      },
  ];

  for (const { table, docField, type } of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from(table)
      .select(`id, checkoutRequestId, ${docField}`)
      .eq("status", "FAILED")
      .eq("resultDesc", "Expired - timed out")
      .not("checkoutRequestId", "is", null)
      .gte("createdAt", cutoff);

    if (data) {
      for (const row of data) {
        results.push({
          id: row.id,
          checkoutRequestId: row.checkoutRequestId,
          documentId: row[docField],
          documentType: type,
        });
      }
    }
  }

  return results;
}

/** Mark a payment completed and its parent document paid. */
async function resolveCompleted(payment: ExpiredPayment): Promise<void> {
  const params = { mpesaReceiptNumber: "", amount: 10 };
  switch (payment.documentType) {
    case "INVOICE": {
      const updated = await updatePaymentCompleted(payment.checkoutRequestId, params);
      if (updated) await markInvoicePaid(payment.documentId);
      break;
    }
    case "CASH_SALE": {
      const updated = await updateCashSalePaymentCompleted(payment.checkoutRequestId, params);
      if (updated) await markCashSalePaid(payment.documentId);
      break;
    }
    case "DELIVERY_NOTE": {
      const updated = await updateDeliveryNotePaymentCompleted(payment.checkoutRequestId, params);
      if (updated) await markDeliveryNotePaid(payment.documentId);
      break;
    }
    case "RECEIPT": {
      const updated = await updateReceiptPaymentCompleted(payment.checkoutRequestId, params);
      if (updated) await markReceiptPaid(payment.documentId);
      break;
    }
    case "PURCHASE_ORDER": {
      const updated = await updatePurchaseOrderPaymentCompleted(payment.checkoutRequestId, params);
      if (updated) await markPurchaseOrderPaid(payment.documentId);
      break;
    }
    case "QUOTATION": {
      const updated = await updateQuotationPaymentCompleted(payment.checkoutRequestId, params);
      if (updated) await markQuotationPaid(payment.documentId);
      break;
    }
  }
}

/** Keep a payment as FAILED (update resultDesc with confirmed Daraja reason). */
async function resolveConfirmedFailed(
  payment: ExpiredPayment,
  resultCode: string,
  resultDesc: string
): Promise<void> {
  switch (payment.documentType) {
    case "INVOICE":         await updatePaymentFailed(payment.checkoutRequestId, resultCode, resultDesc); break;
    case "CASH_SALE":       await updateCashSalePaymentFailed(payment.checkoutRequestId, resultCode, resultDesc); break;
    case "DELIVERY_NOTE":   await updateDeliveryNotePaymentFailed(payment.checkoutRequestId, resultCode, resultDesc); break;
    case "RECEIPT":         await updateReceiptPaymentFailed(payment.checkoutRequestId, resultCode, resultDesc); break;
    case "PURCHASE_ORDER":  await updatePurchaseOrderPaymentFailed(payment.checkoutRequestId, resultCode, resultDesc); break;
    case "QUOTATION":       await updateQuotationPaymentFailed(payment.checkoutRequestId, resultCode, resultDesc); break;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const logger = createRequestLogger();

  // Authenticate with ADMIN_SECRET
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMpesaEnabled()) {
    return NextResponse.json(
      { message: "M-Pesa is not configured — nothing to reconcile", reconciled: 0, skipped: 0, failed: 0 },
      { status: 200 }
    );
  }

  const summary = {
    total: 0,
    reconciled: 0,   // confirmed paid by Daraja and now marked paid
    confirmed_failed: 0, // confirmed failed by Daraja (resultDesc updated)
    daraja_error: 0, // could not reach Daraja — left as-is for next run
  };

  try {
    const expired = await getRecentlyExpiredPayments();
    summary.total = expired.length;

    logger.info("reconciliation_start", {
      total: expired.length,
      lookbackMinutes: LOOKBACK_MINUTES,
    });

    for (const payment of expired) {
      try {
        const result = await querySTKPush(payment.checkoutRequestId);

        if (result.ResultCode === "0") {
          // Daraja confirms payment succeeded — user was charged, give them the doc
          await resolveCompleted(payment);
          summary.reconciled++;

          logger.info("reconciliation_recovered", {
            paymentId: payment.id,
            documentId: payment.documentId,
            documentType: payment.documentType,
          });
        } else {
          // Daraja confirms payment did not succeed — update the stored reason
          await resolveConfirmedFailed(
            payment,
            result.ResultCode,
            result.ResultDesc
          );
          summary.confirmed_failed++;
        }
      } catch (err) {
        // Network error querying Daraja — leave the payment as-is, next cron run will retry
        summary.daraja_error++;
        logger.error("reconciliation_daraja_error", {
          paymentId: payment.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    logger.info("reconciliation_complete", summary);

    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logger.error("reconciliation_fatal", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Reconciliation failed", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
