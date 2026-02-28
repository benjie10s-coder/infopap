-- Migration 012: Fix overloaded payment functions
-- Drops duplicate function signatures and recreates with correct parameter order
-- Fixes "Could not choose the best candidate function" error

-- =============================================================================
-- Drop ALL overloaded versions of payment functions
-- =============================================================================

-- Invoice payment function - drop both possible signatures
DROP FUNCTION IF EXISTS create_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS create_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- CashSale payment function
DROP FUNCTION IF EXISTS create_cash_sale_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS create_cash_sale_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- DeliveryNote payment function
DROP FUNCTION IF EXISTS create_delivery_note_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS create_delivery_note_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- Receipt payment function
DROP FUNCTION IF EXISTS create_receipt_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS create_receipt_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- PurchaseOrder payment function
DROP FUNCTION IF EXISTS create_purchase_order_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS create_purchase_order_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- Quotation payment function
DROP FUNCTION IF EXISTS create_quotation_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS create_quotation_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- =============================================================================
-- Recreate Invoice payment function (correct signature: p_payment_id FIRST)
-- =============================================================================
CREATE OR REPLACE FUNCTION create_payment_if_unpaid(
  p_payment_id TEXT,
  p_invoice_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
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
    RETURN jsonb_build_object('error', 'Invoice not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_invoice."isPaid" THEN
    RETURN jsonb_build_object('error', 'Invoice already paid', 'code', 'ALREADY_PAID');
  END IF;

  -- Expire stale payments before checking
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

-- =============================================================================
-- Recreate CashSale payment function (if table exists)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashSalePayment') THEN
    RAISE NOTICE 'CashSalePayment table does not exist, skipping';
    RETURN;
  END IF;

  EXECUTE $func$
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
    $inner$
  $func$;
END $$;

-- =============================================================================
-- Recreate DeliveryNote payment function (if table exists)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DeliveryNotePayment') THEN
    RAISE NOTICE 'DeliveryNotePayment table does not exist, skipping';
    RETURN;
  END IF;

  EXECUTE $func$
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
    $inner$
  $func$;
END $$;

-- =============================================================================
-- Recreate Receipt payment function (if table exists)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ReceiptPayment') THEN
    RAISE NOTICE 'ReceiptPayment table does not exist, skipping';
    RETURN;
  END IF;

  EXECUTE $func$
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
    $inner$
  $func$;
END $$;

-- =============================================================================
-- Recreate PurchaseOrder payment function (if table exists)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PurchaseOrderPayment') THEN
    RAISE NOTICE 'PurchaseOrderPayment table does not exist, skipping';
    RETURN;
  END IF;

  EXECUTE $func$
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
    $inner$
  $func$;
END $$;

-- =============================================================================
-- Recreate Quotation payment function (if table exists)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'QuotationPayment') THEN
    RAISE NOTICE 'QuotationPayment table does not exist, skipping';
    RETURN;
  END IF;

  EXECUTE $func$
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
    $inner$
  $func$;
END $$;

-- =============================================================================
-- Expire any stale payments in existing tables
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    UPDATE "Payment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashSalePayment') THEN
    UPDATE "CashSalePayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ReceiptPayment') THEN
    UPDATE "ReceiptPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'QuotationPayment') THEN
    UPDATE "QuotationPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PurchaseOrderPayment') THEN
    UPDATE "PurchaseOrderPayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DeliveryNotePayment') THEN
    UPDATE "DeliveryNotePayment" SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
    WHERE "status" IN ('PENDING', 'PROCESSING') AND "createdAt" < NOW() - INTERVAL '5 minutes';
  END IF;
END $$;
