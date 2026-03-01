-- Migration 009: Quotations — standalone document type with NO tax
-- Quotation arithmetic: subtotal → discount → total (NO tax at all)
-- Includes termsAndConditions separate from notes, and validUntil date

-- =============================================================================
-- Table: "Quotation"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Quotation" (
  "id"                      TEXT           NOT NULL,
  "userId"                  TEXT,
  "guestSessionId"          TEXT,
  "publicId"                TEXT           NOT NULL,
  "documentTitle"           TEXT           NOT NULL DEFAULT 'QUOTATION',
  "quotationNumber"         TEXT           NOT NULL,
  "quotationDate"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "validUntil"              TIMESTAMPTZ,
  "fromName"                TEXT           NOT NULL,
  "fromEmail"               TEXT,
  "fromPhone"               TEXT,
  "fromMobile"              TEXT,
  "fromFax"                 TEXT,
  "fromAddress"             TEXT,
  "fromCity"                TEXT,
  "fromZipCode"             TEXT,
  "fromBusinessNumber"      TEXT,
  "toName"                  TEXT           NOT NULL,
  "toEmail"                 TEXT,
  "toPhone"                 TEXT,
  "toMobile"                TEXT,
  "toFax"                   TEXT,
  "toAddress"               TEXT,
  "toCity"                  TEXT,
  "toZipCode"               TEXT,
  "toBusinessNumber"        TEXT,
  "currency"                TEXT           NOT NULL DEFAULT 'KES',
  "discountType"            TEXT           NOT NULL DEFAULT 'PERCENTAGE',
  "discountValue"           NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "subtotal"                NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "discountAmount"          NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "total"                   NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "accentColor"             TEXT           NOT NULL DEFAULT '#f97316',
  "logoDataUrl"             TEXT,
  "signatureDataUrl"        TEXT,
  "termsAndConditions"      TEXT,
  "notes"                   TEXT,
  "isPaid"                  BOOLEAN        NOT NULL DEFAULT false,
  "paidAt"                  TIMESTAMPTZ,
  "pdfUrl"                  TEXT,
  "createdAt"               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Quotation_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "Quotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "Quotation_tenant_required" CHECK ("userId" IS NOT NULL OR "guestSessionId" IS NOT NULL)
);

-- =============================================================================
-- Table: "QuotationLineItem" — with rate and amount (qty × rate)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "QuotationLineItem" (
  "id"                TEXT           NOT NULL,
  "quotationId"       TEXT           NOT NULL,
  "description"       TEXT           NOT NULL,
  "additionalDetails" TEXT,
  "quantity"          NUMERIC(12,4)  NOT NULL,
  "rate"              NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "amount"            NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "sortOrder"         INTEGER        NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "QuotationLineItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "QuotationPhoto"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "QuotationPhoto" (
  "id"            TEXT        NOT NULL,
  "quotationId"   TEXT        NOT NULL,
  "url"           TEXT        NOT NULL,
  "filename"      TEXT,
  "sortOrder"     INTEGER     NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "QuotationPhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuotationPhoto_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "QuotationPayment"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "QuotationPayment" (
  "id"                  TEXT           NOT NULL,
  "quotationId"         TEXT           NOT NULL,
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

  CONSTRAINT "QuotationPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuotationPayment_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id"),
  CONSTRAINT "QuotationPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- =============================================================================
-- Enable RLS
-- =============================================================================
ALTER TABLE "Quotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuotationLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuotationPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuotationPayment" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Auto-update triggers for updatedAt
-- =============================================================================
CREATE OR REPLACE FUNCTION update_quotation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Quotation_updatedAt"
  BEFORE UPDATE ON "Quotation"
  FOR EACH ROW EXECUTE FUNCTION update_quotation_updated_at();

CREATE TRIGGER "QuotationLineItem_updatedAt"
  BEFORE UPDATE ON "QuotationLineItem"
  FOR EACH ROW EXECUTE FUNCTION update_quotation_updated_at();

CREATE TRIGGER "QuotationPayment_updatedAt"
  BEFORE UPDATE ON "QuotationPayment"
  FOR EACH ROW EXECUTE FUNCTION update_quotation_updated_at();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS "Quotation_userId_idx" ON "Quotation"("userId");
CREATE INDEX IF NOT EXISTS "Quotation_guestSessionId_idx" ON "Quotation"("guestSessionId");
CREATE INDEX IF NOT EXISTS "Quotation_publicId_idx" ON "Quotation"("publicId");
CREATE INDEX IF NOT EXISTS "Quotation_createdAt_idx" ON "Quotation"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Quotation_userId_isPaid_idx" ON "Quotation"("userId", "isPaid");

CREATE INDEX IF NOT EXISTS "QuotationLineItem_quotationId_idx" ON "QuotationLineItem"("quotationId", "sortOrder");
CREATE INDEX IF NOT EXISTS "QuotationPhoto_quotationId_idx" ON "QuotationPhoto"("quotationId", "sortOrder");

CREATE INDEX IF NOT EXISTS "QuotationPayment_checkoutRequestId_idx" ON "QuotationPayment"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS "QuotationPayment_quotationId_idx" ON "QuotationPayment"("quotationId");

-- =============================================================================
-- RPC: Atomic payment creation for quotations
-- =============================================================================
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
  -- Lock the quotation row
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

  -- Check for in-progress payment
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

  -- Create the payment
  INSERT INTO "QuotationPayment" ("id", "quotationId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_quotation_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;
