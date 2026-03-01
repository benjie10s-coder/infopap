-- Migration 011: Expire stale pending payments (v2 - defensive)
-- Fixes "Payment already in progress" error when old payments block new attempts
-- Payments older than 5 minutes in PENDING/PROCESSING state are expired automatically
-- This migration only updates tables that exist in the database

-- =============================================================================
-- Step 1: Expire stale payments in existing tables
-- =============================================================================
DO $$
BEGIN
  -- Invoice payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    UPDATE "Payment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
    RAISE NOTICE 'Expired stale Invoice payments';
  END IF;

  -- CashSale payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashSalePayment') THEN
    UPDATE "CashSalePayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
    RAISE NOTICE 'Expired stale CashSale payments';
  END IF;

  -- DeliveryNote payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DeliveryNotePayment') THEN
    UPDATE "DeliveryNotePayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
    RAISE NOTICE 'Expired stale DeliveryNote payments';
  END IF;

  -- Receipt payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ReceiptPayment') THEN
    UPDATE "ReceiptPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
    RAISE NOTICE 'Expired stale Receipt payments';
  END IF;

  -- PurchaseOrder payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PurchaseOrderPayment') THEN
    UPDATE "PurchaseOrderPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
    RAISE NOTICE 'Expired stale PurchaseOrder payments';
  END IF;

  -- Quotation payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'QuotationPayment') THEN
    UPDATE "QuotationPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
    RAISE NOTICE 'Expired stale Quotation payments';
  END IF;
END $$;

-- =============================================================================
-- Step 2: Update Invoice payment RPC (always exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION create_payment_if_unpaid(
  p_invoice_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC,
  p_payment_id TEXT DEFAULT gen_random_uuid()::TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_active_payment RECORD;
  v_stale_cutoff TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
BEGIN
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

  -- Expire old stale payments before checking
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

-- =============================================================================
-- Step 3: Conditionally update other payment RPCs (only if tables exist)
-- =============================================================================

-- CashSale payment RPC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashSalePayment') THEN
    RAISE NOTICE 'CashSalePayment table does not exist, skipping RPC update';
    RETURN;
  END IF;

  EXECUTE $func$
    CREATE OR REPLACE FUNCTION create_cash_sale_payment_if_unpaid(
      p_cash_sale_id TEXT,
      p_user_id TEXT,
      p_phone_number TEXT,
      p_amount NUMERIC,
      p_payment_id TEXT DEFAULT gen_random_uuid()::TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $inner$
    DECLARE
      v_cash_sale RECORD;
      v_active_payment RECORD;
      v_stale_cutoff TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
    BEGIN
      SELECT "id", "isPaid", "userId"
      INTO v_cash_sale
      FROM "CashSale"
      WHERE "id" = p_cash_sale_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN json_build_object('error', 'Cash sale not found', 'code', 'NOT_FOUND');
      END IF;

      IF v_cash_sale."isPaid" THEN
        RETURN json_build_object('error', 'Cash sale already paid', 'code', 'ALREADY_PAID');
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
        RETURN json_build_object(
          'error', 'Payment already in progress',
          'code', 'PAYMENT_IN_PROGRESS',
          'paymentId', v_active_payment."id"
        );
      END IF;

      INSERT INTO "CashSalePayment" ("id", "cashSaleId", "userId", "phoneNumber", "amount", "currency", "status")
      VALUES (p_payment_id, p_cash_sale_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

      RETURN json_build_object('success', true, 'paymentId', p_payment_id);
    END;
    $inner$
  $func$;
  RAISE NOTICE 'Updated CashSale payment RPC';
END $$;

-- DeliveryNote payment RPC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DeliveryNotePayment') THEN
    RAISE NOTICE 'DeliveryNotePayment table does not exist, skipping RPC update';
    RETURN;
  END IF;

  EXECUTE $func$
    CREATE OR REPLACE FUNCTION create_delivery_note_payment_if_unpaid(
      p_delivery_note_id TEXT,
      p_user_id TEXT,
      p_phone_number TEXT,
      p_amount NUMERIC,
      p_payment_id TEXT DEFAULT gen_random_uuid()::TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $inner$
    DECLARE
      v_delivery_note RECORD;
      v_active_payment RECORD;
      v_stale_cutoff TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
    BEGIN
      SELECT "id", "isPaid", "userId"
      INTO v_delivery_note
      FROM "DeliveryNote"
      WHERE "id" = p_delivery_note_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN json_build_object('error', 'Delivery note not found', 'code', 'NOT_FOUND');
      END IF;

      IF v_delivery_note."isPaid" THEN
        RETURN json_build_object('error', 'Delivery note already paid', 'code', 'ALREADY_PAID');
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
        RETURN json_build_object(
          'error', 'Payment already in progress',
          'code', 'PAYMENT_IN_PROGRESS',
          'paymentId', v_active_payment."id"
        );
      END IF;

      INSERT INTO "DeliveryNotePayment" ("id", "deliveryNoteId", "userId", "phoneNumber", "amount", "currency", "status")
      VALUES (p_payment_id, p_delivery_note_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

      RETURN json_build_object('success', true, 'paymentId', p_payment_id);
    END;
    $inner$
  $func$;
  RAISE NOTICE 'Updated DeliveryNote payment RPC';
END $$;

-- Receipt payment RPC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ReceiptPayment') THEN
    RAISE NOTICE 'ReceiptPayment table does not exist, skipping RPC update';
    RETURN;
  END IF;

  EXECUTE $func$
    CREATE OR REPLACE FUNCTION create_receipt_payment_if_unpaid(
      p_receipt_id TEXT,
      p_user_id TEXT,
      p_phone_number TEXT,
      p_amount NUMERIC,
      p_payment_id TEXT DEFAULT gen_random_uuid()::TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $inner$
    DECLARE
      v_receipt RECORD;
      v_active_payment RECORD;
      v_stale_cutoff TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
    BEGIN
      SELECT "id", "isPaid", "userId"
      INTO v_receipt
      FROM "Receipt"
      WHERE "id" = p_receipt_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN json_build_object('error', 'Receipt not found', 'code', 'NOT_FOUND');
      END IF;

      IF v_receipt."isPaid" THEN
        RETURN json_build_object('error', 'Receipt already paid', 'code', 'ALREADY_PAID');
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
        RETURN json_build_object(
          'error', 'Payment already in progress',
          'code', 'PAYMENT_IN_PROGRESS',
          'paymentId', v_active_payment."id"
        );
      END IF;

      INSERT INTO "ReceiptPayment" ("id", "receiptId", "userId", "phoneNumber", "amount", "currency", "status")
      VALUES (p_payment_id, p_receipt_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

      RETURN json_build_object('success', true, 'paymentId', p_payment_id);
    END;
    $inner$
  $func$;
  RAISE NOTICE 'Updated Receipt payment RPC';
END $$;

-- PurchaseOrder payment RPC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PurchaseOrderPayment') THEN
    RAISE NOTICE 'PurchaseOrderPayment table does not exist, skipping RPC update';
    RETURN;
  END IF;

  EXECUTE $func$
    CREATE OR REPLACE FUNCTION create_purchase_order_payment_if_unpaid(
      p_purchase_order_id TEXT,
      p_user_id TEXT,
      p_phone_number TEXT,
      p_amount NUMERIC,
      p_payment_id TEXT DEFAULT gen_random_uuid()::TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $inner$
    DECLARE
      v_po RECORD;
      v_active_payment RECORD;
      v_stale_cutoff TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
    BEGIN
      SELECT "id", "isPaid", "userId"
      INTO v_po
      FROM "PurchaseOrder"
      WHERE "id" = p_purchase_order_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN json_build_object('error', 'Purchase order not found', 'code', 'NOT_FOUND');
      END IF;

      IF v_po."isPaid" THEN
        RETURN json_build_object('error', 'Purchase order already paid', 'code', 'ALREADY_PAID');
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
        RETURN json_build_object(
          'error', 'Payment already in progress',
          'code', 'PAYMENT_IN_PROGRESS',
          'paymentId', v_active_payment."id"
        );
      END IF;

      INSERT INTO "PurchaseOrderPayment" ("id", "purchaseOrderId", "userId", "phoneNumber", "amount", "currency", "status")
      VALUES (p_payment_id, p_purchase_order_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

      RETURN json_build_object('success', true, 'paymentId', p_payment_id);
    END;
    $inner$
  $func$;
  RAISE NOTICE 'Updated PurchaseOrder payment RPC';
END $$;

-- Quotation payment RPC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'QuotationPayment') THEN
    RAISE NOTICE 'QuotationPayment table does not exist, skipping RPC update';
    RETURN;
  END IF;

  EXECUTE $func$
    CREATE OR REPLACE FUNCTION create_quotation_payment_if_unpaid(
      p_quotation_id TEXT,
      p_user_id TEXT,
      p_phone_number TEXT,
      p_amount NUMERIC,
      p_payment_id TEXT DEFAULT gen_random_uuid()::TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $inner$
    DECLARE
      v_quotation RECORD;
      v_active_payment RECORD;
      v_stale_cutoff TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
    BEGIN
      SELECT "id", "isPaid", "userId"
      INTO v_quotation
      FROM "Quotation"
      WHERE "id" = p_quotation_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN json_build_object('error', 'Quotation not found', 'code', 'NOT_FOUND');
      END IF;

      IF v_quotation."isPaid" THEN
        RETURN json_build_object('error', 'Quotation already paid', 'code', 'ALREADY_PAID');
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
        RETURN json_build_object(
          'error', 'Payment already in progress',
          'code', 'PAYMENT_IN_PROGRESS',
          'paymentId', v_active_payment."id"
        );
      END IF;

      INSERT INTO "QuotationPayment" ("id", "quotationId", "userId", "phoneNumber", "amount", "currency", "status")
      VALUES (p_payment_id, p_quotation_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

      RETURN json_build_object('success', true, 'paymentId', p_payment_id);
    END;
    $inner$
  $func$;
  RAISE NOTICE 'Updated Quotation payment RPC';
END $$;
