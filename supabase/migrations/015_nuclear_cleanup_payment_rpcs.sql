-- Migration 015: Nuclear cleanup of ALL payment RPC functions
-- =============================================================================
-- PURPOSE: Drop EVERY known overload of every payment RPC function, then
--          recreate a single canonical version of each.
--          This guarantees PostgREST has exactly ONE function per name and
--          eliminates the "Could not choose the best candidate function" error.
--
-- ALSO:    Expires all stale PENDING/PROCESSING payments across all tables
--          so "Payment already in progress" blocks are cleared.
--
-- SAFE TO RE-RUN: Fully idempotent (DROP IF EXISTS + CREATE OR REPLACE).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 0: Diagnostic — show what we're about to clean up
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'create_%_payment_if_unpaid'
    ORDER BY p.proname, p.oid
  LOOP
    RAISE NOTICE 'BEFORE cleanup: % (%)', fn.proname, fn.args;
  END LOOP;

  -- Also check the invoice one
  FOR fn IN
    SELECT p.proname, pg_get_function_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_payment_if_unpaid'
    ORDER BY p.oid
  LOOP
    RAISE NOTICE 'BEFORE cleanup: % (%)', fn.proname, fn.args;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: DROP every known signature of every payment function
-- ─────────────────────────────────────────────────────────────────────────────

-- Invoice: create_payment_if_unpaid
DROP FUNCTION IF EXISTS public.create_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.create_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.create_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC(15,2));

-- CashSale: create_cash_sale_payment_if_unpaid
DROP FUNCTION IF EXISTS public.create_cash_sale_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.create_cash_sale_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- DeliveryNote: create_delivery_note_payment_if_unpaid
DROP FUNCTION IF EXISTS public.create_delivery_note_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.create_delivery_note_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- Receipt: create_receipt_payment_if_unpaid
DROP FUNCTION IF EXISTS public.create_receipt_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.create_receipt_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- PurchaseOrder: create_purchase_order_payment_if_unpaid
DROP FUNCTION IF EXISTS public.create_purchase_order_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.create_purchase_order_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- Quotation: create_quotation_payment_if_unpaid
DROP FUNCTION IF EXISTS public.create_quotation_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.create_quotation_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Recreate each function with CANONICAL signature
--         (p_payment_id FIRST, then doc_id, user_id, phone, amount)
--         Returns JSONB, SECURITY DEFINER, search_path = public
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. Invoice payment
CREATE OR REPLACE FUNCTION public.create_payment_if_unpaid(
  p_payment_id   TEXT,
  p_invoice_id   TEXT,
  p_user_id      TEXT,
  p_phone_number TEXT,
  p_amount       NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice        RECORD;
  v_active_payment RECORD;
  v_stale_cutoff   TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
BEGIN
  SELECT "id", "isPaid", "userId"
  INTO v_invoice
  FROM "Invoice"
  WHERE "id" = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invoice not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_invoice."isPaid" THEN
    RETURN jsonb_build_object('error', 'Invoice already paid', 'code', 'ALREADY_PAID');
  END IF;

  -- Auto-expire stale payments
  UPDATE "Payment"
  SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
  WHERE "invoiceId" = p_invoice_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" < v_stale_cutoff;

  -- Check for active (recent) payments only
  SELECT "id", "status"
  INTO v_active_payment
  FROM "Payment"
  WHERE "invoiceId" = p_invoice_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" >= v_stale_cutoff
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  INSERT INTO "Payment" ("id", "invoiceId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_invoice_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- 2b. CashSale payment
CREATE OR REPLACE FUNCTION public.create_cash_sale_payment_if_unpaid(
  p_payment_id   TEXT,
  p_cash_sale_id TEXT,
  p_user_id      TEXT,
  p_phone_number TEXT,
  p_amount       NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash_sale      RECORD;
  v_active_payment RECORD;
  v_stale_cutoff   TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
BEGIN
  SELECT "id", "isPaid", "userId"
  INTO v_cash_sale
  FROM "CashSale"
  WHERE "id" = p_cash_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cash sale not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_cash_sale."isPaid" THEN
    RETURN jsonb_build_object('error', 'Cash sale already paid', 'code', 'ALREADY_PAID');
  END IF;

  UPDATE "CashSalePayment"
  SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
  WHERE "cashSaleId" = p_cash_sale_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" < v_stale_cutoff;

  SELECT "id", "status"
  INTO v_active_payment
  FROM "CashSalePayment"
  WHERE "cashSaleId" = p_cash_sale_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" >= v_stale_cutoff
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  INSERT INTO "CashSalePayment" ("id", "cashSaleId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_cash_sale_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- 2c. DeliveryNote payment
CREATE OR REPLACE FUNCTION public.create_delivery_note_payment_if_unpaid(
  p_payment_id       TEXT,
  p_delivery_note_id TEXT,
  p_user_id          TEXT,
  p_phone_number     TEXT,
  p_amount           NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_note  RECORD;
  v_active_payment RECORD;
  v_stale_cutoff   TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
BEGIN
  SELECT "id", "isPaid", "userId"
  INTO v_delivery_note
  FROM "DeliveryNote"
  WHERE "id" = p_delivery_note_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Delivery note not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_delivery_note."isPaid" THEN
    RETURN jsonb_build_object('error', 'Delivery note already paid', 'code', 'ALREADY_PAID');
  END IF;

  UPDATE "DeliveryNotePayment"
  SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
  WHERE "deliveryNoteId" = p_delivery_note_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" < v_stale_cutoff;

  SELECT "id", "status"
  INTO v_active_payment
  FROM "DeliveryNotePayment"
  WHERE "deliveryNoteId" = p_delivery_note_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" >= v_stale_cutoff
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  INSERT INTO "DeliveryNotePayment" ("id", "deliveryNoteId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_delivery_note_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- 2d. Receipt payment
CREATE OR REPLACE FUNCTION public.create_receipt_payment_if_unpaid(
  p_payment_id   TEXT,
  p_receipt_id   TEXT,
  p_user_id      TEXT,
  p_phone_number TEXT,
  p_amount       NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt        RECORD;
  v_active_payment RECORD;
  v_stale_cutoff   TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
BEGIN
  SELECT "id", "isPaid", "userId"
  INTO v_receipt
  FROM "Receipt"
  WHERE "id" = p_receipt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Receipt not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_receipt."isPaid" THEN
    RETURN jsonb_build_object('error', 'Receipt already paid', 'code', 'ALREADY_PAID');
  END IF;

  UPDATE "ReceiptPayment"
  SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
  WHERE "receiptId" = p_receipt_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" < v_stale_cutoff;

  SELECT "id", "status"
  INTO v_active_payment
  FROM "ReceiptPayment"
  WHERE "receiptId" = p_receipt_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" >= v_stale_cutoff
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  INSERT INTO "ReceiptPayment" ("id", "receiptId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_receipt_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- 2e. PurchaseOrder payment
CREATE OR REPLACE FUNCTION public.create_purchase_order_payment_if_unpaid(
  p_payment_id        TEXT,
  p_purchase_order_id TEXT,
  p_user_id           TEXT,
  p_phone_number      TEXT,
  p_amount            NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po             RECORD;
  v_active_payment RECORD;
  v_stale_cutoff   TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
BEGIN
  SELECT "id", "isPaid", "userId"
  INTO v_po
  FROM "PurchaseOrder"
  WHERE "id" = p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Purchase order not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_po."isPaid" THEN
    RETURN jsonb_build_object('error', 'Purchase order already paid', 'code', 'ALREADY_PAID');
  END IF;

  UPDATE "PurchaseOrderPayment"
  SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
  WHERE "purchaseOrderId" = p_purchase_order_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" < v_stale_cutoff;

  SELECT "id", "status"
  INTO v_active_payment
  FROM "PurchaseOrderPayment"
  WHERE "purchaseOrderId" = p_purchase_order_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" >= v_stale_cutoff
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  INSERT INTO "PurchaseOrderPayment" ("id", "purchaseOrderId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_purchase_order_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- 2f. Quotation payment
CREATE OR REPLACE FUNCTION public.create_quotation_payment_if_unpaid(
  p_payment_id   TEXT,
  p_quotation_id TEXT,
  p_user_id      TEXT,
  p_phone_number TEXT,
  p_amount       NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quotation      RECORD;
  v_active_payment RECORD;
  v_stale_cutoff   TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
BEGIN
  SELECT "id", "isPaid", "userId"
  INTO v_quotation
  FROM "Quotation"
  WHERE "id" = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Quotation not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_quotation."isPaid" THEN
    RETURN jsonb_build_object('error', 'Quotation already paid', 'code', 'ALREADY_PAID');
  END IF;

  UPDATE "QuotationPayment"
  SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
  WHERE "quotationId" = p_quotation_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" < v_stale_cutoff;

  SELECT "id", "status"
  INTO v_active_payment
  FROM "QuotationPayment"
  WHERE "quotationId" = p_quotation_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" >= v_stale_cutoff
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  INSERT INTO "QuotationPayment" ("id", "quotationId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_quotation_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Expire ALL stale payments across all tables
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    UPDATE "Payment" SET "status" = 'FAILED', "resultDesc" = 'Expired - migration 015 cleanup'
    WHERE "status" IN ('PENDING', 'PROCESSING');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashSalePayment') THEN
    UPDATE "CashSalePayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - migration 015 cleanup'
    WHERE "status" IN ('PENDING', 'PROCESSING');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DeliveryNotePayment') THEN
    UPDATE "DeliveryNotePayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - migration 015 cleanup'
    WHERE "status" IN ('PENDING', 'PROCESSING');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ReceiptPayment') THEN
    UPDATE "ReceiptPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - migration 015 cleanup'
    WHERE "status" IN ('PENDING', 'PROCESSING');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PurchaseOrderPayment') THEN
    UPDATE "PurchaseOrderPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - migration 015 cleanup'
    WHERE "status" IN ('PENDING', 'PROCESSING');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'QuotationPayment') THEN
    UPDATE "QuotationPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - migration 015 cleanup'
    WHERE "status" IN ('PENDING', 'PROCESSING');
  END IF;

  RAISE NOTICE 'All stale payments expired successfully';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Verify — each function name should appear exactly ONCE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn RECORD;
  fn_count INT;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'create_%_payment_if_unpaid' OR p.proname = 'create_payment_if_unpaid')
    ORDER BY p.proname, p.oid
  LOOP
    RAISE NOTICE 'AFTER cleanup: % (%)', fn.proname, fn.args;
  END LOOP;

  -- Count — should be exactly 6
  SELECT COUNT(*) INTO fn_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND (p.proname LIKE 'create_%_payment_if_unpaid' OR p.proname = 'create_payment_if_unpaid');

  IF fn_count = 6 THEN
    RAISE NOTICE '✓ Exactly 6 payment functions found — all clean!';
  ELSE
    RAISE WARNING '✗ Expected 6 payment functions, found %. Check for residual overloads!', fn_count;
  END IF;
END $$;
