-- Migration 013: Drop the conflicting overloaded quotation payment function
-- Left behind by migration 011 which used CREATE OR REPLACE with a different
-- parameter order, creating a second overload instead of replacing the first.
-- Fixes: "Could not choose the best candidate function between:
--   public.create_quotation_payment_if_unpaid(p_payment_id => text, ...)
--   public.create_quotation_payment_if_unpaid(p_quotation_id => text, ...)"

-- Drop the 011 variant: (quotation_id, user_id, phone_number, amount, payment_id)
DROP FUNCTION IF EXISTS public.create_quotation_payment_if_unpaid(TEXT, TEXT, TEXT, NUMERIC, TEXT);

-- Drop the 009 variant as well: (payment_id, quotation_id, user_id, phone_number, amount)
-- so we can recreate a clean canonical version below.
DROP FUNCTION IF EXISTS public.create_quotation_payment_if_unpaid(TEXT, TEXT, TEXT, TEXT, NUMERIC);

-- Recreate the canonical version with p_payment_id first.
CREATE OR REPLACE FUNCTION public.create_quotation_payment_if_unpaid(
  p_payment_id    TEXT,
  p_quotation_id  TEXT,
  p_user_id       TEXT,
  p_phone_number  TEXT,
  p_amount        NUMERIC
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

  -- Expire stale in-progress payments
  UPDATE "QuotationPayment"
  SET "status" = 'FAILED', "resultDesc" = 'Expired - timed out'
  WHERE "quotationId" = p_quotation_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" < v_stale_cutoff;

  -- Check for a still-active payment
  SELECT "id", "status"
  INTO v_active_payment
  FROM "QuotationPayment"
  WHERE "quotationId" = p_quotation_id
    AND "status" IN ('PENDING', 'PROCESSING')
    AND "createdAt" >= v_stale_cutoff
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error',     'Payment already in progress',
      'code',      'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  INSERT INTO "QuotationPayment" ("id", "quotationId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_quotation_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;
