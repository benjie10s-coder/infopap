-- =============================================================================
-- Migration 011: RPC Function Hardening
-- =============================================================================
-- PURPOSE: Drop ALL known function signatures then re-create them.
--          This guarantees no stale overloads exist in the database and makes
--          every RPC call via PostgREST unambiguous.
--
-- SAFETY:  Each function is dropped by its exact (name, arg-types) signature.
--          CREATE OR REPLACE then re-creates it. This is fully idempotent and
--          safe to run on a live database (wrapped in a single transaction).
--
-- PATTERN: Future migrations that change an RPC's parameters MUST include
--          DROP FUNCTION IF EXISTS with the OLD signature before CREATE OR REPLACE.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Invoice payment RPC (from 003 / 004)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS create_payment_if_unpaid(text, text, text, text, numeric);

CREATE OR REPLACE FUNCTION create_payment_if_unpaid(
  p_payment_id TEXT,
  p_invoice_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC(15,2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_active_payment RECORD;
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT "id", "isPaid", "userId"
  INTO v_invoice
  FROM "Invoice"
  WHERE "id" = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invoice not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_invoice."isPaid" THEN
    RETURN json_build_object('error', 'Invoice already paid', 'code', 'ALREADY_PAID');
  END IF;

  SELECT "id", "status"
  INTO v_active_payment
  FROM "Payment"
  WHERE "invoiceId" = p_invoice_id
    AND status IN ('PENDING', 'PROCESSING')
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  INSERT INTO "Payment" ("id", "invoiceId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_invoice_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN json_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Delivery‑note payment RPC (from 006)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS create_delivery_note_payment_if_unpaid(text, text, text, text, numeric);

CREATE OR REPLACE FUNCTION create_delivery_note_payment_if_unpaid(
  p_payment_id TEXT,
  p_delivery_note_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_paid BOOLEAN;
  v_existing_payment RECORD;
BEGIN
  SELECT "isPaid" INTO v_is_paid
  FROM "DeliveryNote"
  WHERE "id" = p_delivery_note_id
  FOR UPDATE;

  IF v_is_paid IS NULL THEN
    RETURN jsonb_build_object('error', 'Delivery note not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_is_paid THEN
    RETURN jsonb_build_object('error', 'Already paid', 'code', 'ALREADY_PAID');
  END IF;

  SELECT "id" INTO v_existing_payment
  FROM "DeliveryNotePayment"
  WHERE "deliveryNoteId" = p_delivery_note_id
    AND "status" IN ('PENDING', 'PROCESSING')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_existing_payment."id"
    );
  END IF;

  INSERT INTO "DeliveryNotePayment" ("id", "deliveryNoteId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_delivery_note_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Cash‑sale payment RPC (from 007)
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop BOTH possible signatures (correct + old stale overload)
DROP FUNCTION IF EXISTS create_cash_sale_payment_if_unpaid(text, text, text, text, numeric);
DROP FUNCTION IF EXISTS create_cash_sale_payment_if_unpaid(text, text, text, numeric, text);

CREATE OR REPLACE FUNCTION create_cash_sale_payment_if_unpaid(
  p_payment_id TEXT,
  p_cash_sale_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_paid BOOLEAN;
  v_existing_payment RECORD;
BEGIN
  SELECT "isPaid" INTO v_is_paid
  FROM "CashSale"
  WHERE "id" = p_cash_sale_id
  FOR UPDATE;

  IF v_is_paid IS NULL THEN
    RETURN jsonb_build_object('error', 'Cash sale not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_is_paid THEN
    RETURN jsonb_build_object('error', 'Already paid', 'code', 'ALREADY_PAID');
  END IF;

  SELECT "id" INTO v_existing_payment
  FROM "CashSalePayment"
  WHERE "cashSaleId" = p_cash_sale_id
    AND "status" IN ('PENDING', 'PROCESSING')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_existing_payment."id"
    );
  END IF;

  INSERT INTO "CashSalePayment" ("id", "cashSaleId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_cash_sale_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Receipt payment RPC (from 007b)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS create_receipt_payment_if_unpaid(text, text, text, text, numeric);

CREATE OR REPLACE FUNCTION create_receipt_payment_if_unpaid(
  p_payment_id TEXT,
  p_receipt_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_paid BOOLEAN;
  v_existing_payment RECORD;
BEGIN
  SELECT "isPaid" INTO v_is_paid
  FROM "Receipt"
  WHERE "id" = p_receipt_id
  FOR UPDATE;

  IF v_is_paid IS NULL THEN
    RETURN jsonb_build_object('error', 'Receipt not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_is_paid THEN
    RETURN jsonb_build_object('error', 'Already paid', 'code', 'ALREADY_PAID');
  END IF;

  SELECT "id" INTO v_existing_payment
  FROM "ReceiptPayment"
  WHERE "receiptId" = p_receipt_id
    AND "status" IN ('PENDING', 'PROCESSING')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_existing_payment."id"
    );
  END IF;

  INSERT INTO "ReceiptPayment" ("id", "receiptId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_receipt_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Purchase‑order payment RPC (from 008)
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop BOTH possible signatures (correct + old stale overload)
DROP FUNCTION IF EXISTS create_purchase_order_payment_if_unpaid(text, text, text, text, numeric);
DROP FUNCTION IF EXISTS create_purchase_order_payment_if_unpaid(text, text, text, numeric, text);

CREATE OR REPLACE FUNCTION create_purchase_order_payment_if_unpaid(
  p_payment_id TEXT,
  p_purchase_order_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_paid BOOLEAN;
  v_existing_payment RECORD;
BEGIN
  SELECT "isPaid" INTO v_is_paid
  FROM "PurchaseOrder"
  WHERE "id" = p_purchase_order_id
  FOR UPDATE;

  IF v_is_paid IS NULL THEN
    RETURN jsonb_build_object('error', 'Purchase order not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_is_paid THEN
    RETURN jsonb_build_object('error', 'Already paid', 'code', 'ALREADY_PAID');
  END IF;

  SELECT "id" INTO v_existing_payment
  FROM "PurchaseOrderPayment"
  WHERE "purchaseOrderId" = p_purchase_order_id
    AND "status" IN ('PENDING', 'PROCESSING')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_existing_payment."id"
    );
  END IF;

  INSERT INTO "PurchaseOrderPayment" ("id", "purchaseOrderId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_purchase_order_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Quotation payment RPC (from 009)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS create_quotation_payment_if_unpaid(text, text, text, text, numeric);

CREATE OR REPLACE FUNCTION create_quotation_payment_if_unpaid(
  p_payment_id TEXT,
  p_quotation_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_paid BOOLEAN;
  v_existing_payment RECORD;
BEGIN
  SELECT "isPaid" INTO v_is_paid
  FROM "Quotation"
  WHERE "id" = p_quotation_id
  FOR UPDATE;

  IF v_is_paid IS NULL THEN
    RETURN jsonb_build_object('error', 'Quotation not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_is_paid THEN
    RETURN jsonb_build_object('error', 'Already paid', 'code', 'ALREADY_PAID');
  END IF;

  SELECT "id" INTO v_existing_payment
  FROM "QuotationPayment"
  WHERE "quotationId" = p_quotation_id
    AND "status" IN ('PENDING', 'PROCESSING')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_existing_payment."id"
    );
  END IF;

  INSERT INTO "QuotationPayment" ("id", "quotationId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_quotation_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Dashboard / admin RPCs (from 004 / 005)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_dashboard_stats(text);

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF auth.role() != 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = p_user_id AND "externalId" = auth.uid()::text) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  SELECT json_build_object(
    'totalInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "userId" = p_user_id),
    'paidInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "userId" = p_user_id AND "isPaid" = true),
    'unpaidInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "userId" = p_user_id AND "isPaid" = false),
    'totalRevenue', COALESCE((SELECT SUM("total") FROM "Invoice" WHERE "userId" = p_user_id AND "isPaid" = true), 0),
    'overdueInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "userId" = p_user_id AND "isPaid" = false AND "dueDate" < NOW()),
    'recentInvoices', (
      SELECT COALESCE(json_agg(row_to_json(inv)), '[]'::json)
      FROM (
        SELECT "id", "publicId", "documentType", "invoiceNumber", "toName", "total", "currency", "isPaid", "createdAt", "dueDate"
        FROM "Invoice"
        WHERE "userId" = p_user_id
        ORDER BY "createdAt" DESC
        LIMIT 10
      ) inv
    )
  ) INTO result;

  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS expire_stale_payments();

CREATE OR REPLACE FUNCTION expire_stale_payments()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INT;
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE "Payment"
  SET
    status = 'FAILED',
    "resultDesc" = 'Expired: no callback received within 30 minutes',
    "updatedAt" = NOW()
  WHERE status IN ('PENDING', 'PROCESSING')
    AND "createdAt" < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

DROP FUNCTION IF EXISTS get_stale_processing_payments();

CREATE OR REPLACE FUNCTION get_stale_processing_payments()
RETURNS TABLE(id TEXT, "checkoutRequestId" TEXT, "invoiceId" TEXT, amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT p.id, p."checkoutRequestId", p."invoiceId", p.amount
  FROM "Payment" p
  WHERE p.status = 'PROCESSING'
    AND p."checkoutRequestId" IS NOT NULL
    AND p."createdAt" < NOW() - INTERVAL '5 minutes'
    AND p."createdAt" > NOW() - INTERVAL '30 minutes'
  LIMIT 50;
END;
$$;

DROP FUNCTION IF EXISTS cleanup_stale_guest_invoices();

CREATE OR REPLACE FUNCTION cleanup_stale_guest_invoices()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM "Invoice"
  WHERE "guestSessionId" IS NOT NULL
    AND "userId" IS NULL
    AND "isPaid" = false
    AND "createdAt" < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

DROP FUNCTION IF EXISTS get_platform_stats(text);

CREATE OR REPLACE FUNCTION get_platform_stats(p_admin_secret TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN json_build_object(
    'totalInvoices', (SELECT COUNT(*) FROM "Invoice"),
    'paidInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "isPaid" = true),
    'unpaidInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "isPaid" = false),
    'totalRevenue', (SELECT COUNT(*) * 10 FROM "Payment" WHERE status = 'COMPLETED'),
    'failedPayments', (SELECT COUNT(*) FROM "Payment" WHERE status = 'FAILED'),
    'cancelledPayments', (SELECT COUNT(*) FROM "Payment" WHERE status = 'CANCELLED'),
    'activeUsers', (SELECT COUNT(*) FROM "User"),
    'guestInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "guestSessionId" IS NOT NULL AND "userId" IS NULL),
    'invoicesToday', (SELECT COUNT(*) FROM "Invoice" WHERE "createdAt" >= CURRENT_DATE),
    'paymentsToday', (SELECT COUNT(*) FROM "Payment" WHERE status = 'COMPLETED' AND "createdAt" >= CURRENT_DATE),
    'revenueToday', (SELECT COUNT(*) * 10 FROM "Payment" WHERE status = 'COMPLETED' AND "createdAt" >= CURRENT_DATE),
    'invoicesThisMonth', (SELECT COUNT(*) FROM "Invoice" WHERE "createdAt" >= date_trunc('month', CURRENT_DATE)),
    'paymentsThisMonth', (SELECT COUNT(*) FROM "Payment" WHERE status = 'COMPLETED' AND "createdAt" >= date_trunc('month', CURRENT_DATE))
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Trigger functions (idempotent via CREATE OR REPLACE — no DROP needed)
-- ─────────────────────────────────────────────────────────────────────────────
-- These are safe because trigger functions have no parameters (no overload risk).
-- Included here for completeness; no changes to their bodies.

COMMIT;
