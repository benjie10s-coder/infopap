-- Migration 007: Official Receipts — separate tables for receipt documents
-- Receipts are payment acknowledgments with NO line items.
-- Financial fields: total_amount_owed, amount_received, outstanding_balance
-- Arithmetic is separate from invoices: outstanding_balance = total_amount_owed - amount_received

-- =============================================================================
-- Table: "Receipt"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Receipt" (
  "id"                  TEXT           NOT NULL,
  "userId"              TEXT,
  "guestSessionId"      TEXT,
  "publicId"            TEXT           NOT NULL,
  "documentTitle"       TEXT           NOT NULL DEFAULT 'OFFICIAL RECEIPT',
  "receiptNumber"       TEXT           NOT NULL,
  "issueDate"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "fromName"            TEXT           NOT NULL,
  "fromEmail"           TEXT,
  "fromPhone"           TEXT,
  "fromMobile"          TEXT,
  "fromFax"             TEXT,
  "fromAddress"         TEXT,
  "fromCity"            TEXT,
  "fromZipCode"         TEXT,
  "fromBusinessNumber"  TEXT,
  "toName"              TEXT           NOT NULL,
  "toEmail"             TEXT,
  "toPhone"             TEXT,
  "toMobile"            TEXT,
  "toFax"               TEXT,
  "toAddress"           TEXT,
  "toCity"              TEXT,
  "toZipCode"           TEXT,
  "toBusinessNumber"    TEXT,
  "currency"            TEXT           NOT NULL DEFAULT 'KES',
  "totalAmountOwed"     NUMERIC(12,2)  NOT NULL DEFAULT 0,
  "amountReceived"      NUMERIC(12,2)  NOT NULL DEFAULT 0,
  "outstandingBalance"  NUMERIC(12,2)  NOT NULL DEFAULT 0,
  "amountInWords"       TEXT,
  "beingPaymentOf"      TEXT,
  "paymentMethod"       TEXT           NOT NULL DEFAULT 'cash',
  "transactionCode"     TEXT,
  "accentColor"         TEXT           NOT NULL DEFAULT '#4c1d95',
  "logoDataUrl"         TEXT,
  "signatureDataUrl"    TEXT,
  "notes"               TEXT,
  "isPaid"              BOOLEAN        NOT NULL DEFAULT false,
  "paidAt"              TIMESTAMPTZ,
  "pdfUrl"              TEXT,
  "createdAt"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Receipt_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "Receipt_tenant_required" CHECK ("userId" IS NOT NULL OR "guestSessionId" IS NOT NULL),
  CONSTRAINT "Receipt_paymentMethod_check" CHECK ("paymentMethod" IN ('cash', 'mpesa', 'bank'))
);

-- =============================================================================
-- Table: "ReceiptPhoto"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ReceiptPhoto" (
  "id"              TEXT        NOT NULL,
  "receiptId"       TEXT        NOT NULL,
  "url"             TEXT        NOT NULL,
  "filename"        TEXT,
  "sortOrder"       INTEGER     NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "ReceiptPhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceiptPhoto_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "ReceiptPayment" — M-Pesa platform payment tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ReceiptPayment" (
  "id"                  TEXT           NOT NULL,
  "receiptId"           TEXT           NOT NULL,
  "userId"              TEXT,
  "phoneNumber"         TEXT           NOT NULL,
  "amount"              NUMERIC(15,2)  NOT NULL,
  "currency"            TEXT           NOT NULL DEFAULT 'KES',
  "merchantRequestId"   TEXT,
  "checkoutRequestId"   TEXT,
  "mpesaReceiptNumber"  TEXT,
  "transactionDate"     TIMESTAMPTZ,
  "status"              TEXT           NOT NULL DEFAULT 'PENDING',
  "resultCode"          TEXT,
  "resultDesc"          TEXT,
  "createdAt"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "completedAt"         TIMESTAMPTZ,

  CONSTRAINT "ReceiptPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceiptPayment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id"),
  CONSTRAINT "ReceiptPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- =============================================================================
-- Enable RLS
-- =============================================================================
ALTER TABLE "Receipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReceiptPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReceiptPayment" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Auto-update triggers for updatedAt
-- =============================================================================
CREATE OR REPLACE FUNCTION update_receipt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Receipt_updatedAt"
  BEFORE UPDATE ON "Receipt"
  FOR EACH ROW EXECUTE FUNCTION update_receipt_updated_at();

CREATE TRIGGER "ReceiptPayment_updatedAt"
  BEFORE UPDATE ON "ReceiptPayment"
  FOR EACH ROW EXECUTE FUNCTION update_receipt_updated_at();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS "Receipt_userId_idx" ON "Receipt"("userId");
CREATE INDEX IF NOT EXISTS "Receipt_guestSessionId_idx" ON "Receipt"("guestSessionId");
CREATE INDEX IF NOT EXISTS "Receipt_publicId_idx" ON "Receipt"("publicId");
CREATE INDEX IF NOT EXISTS "Receipt_createdAt_idx" ON "Receipt"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Receipt_userId_isPaid_idx" ON "Receipt"("userId", "isPaid");

CREATE INDEX IF NOT EXISTS "ReceiptPhoto_receiptId_idx" ON "ReceiptPhoto"("receiptId", "sortOrder");

CREATE INDEX IF NOT EXISTS "ReceiptPayment_checkoutRequestId_idx" ON "ReceiptPayment"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS "ReceiptPayment_receiptId_idx" ON "ReceiptPayment"("receiptId");

-- =============================================================================
-- RPC: Atomic payment creation for receipts
-- =============================================================================
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
  -- Lock the receipt row
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

  -- Check for in-progress payment
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

  -- Create the payment
  INSERT INTO "ReceiptPayment" ("id", "receiptId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_receipt_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;
