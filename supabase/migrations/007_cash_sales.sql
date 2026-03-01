-- Migration 007: Cash Sales — separate tables for cash sale documents
-- Cash sales have FULL monetary columns (rate, amount, subtotal, tax, total)
-- Line items have quantity, rate, and computed amount
-- Includes paymentMethod and transactionCode fields

-- =============================================================================
-- Table: "CashSale"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "CashSale" (
  "id"                      TEXT           NOT NULL,
  "userId"                  TEXT,
  "guestSessionId"          TEXT,
  "publicId"                TEXT           NOT NULL,
  "documentTitle"           TEXT           NOT NULL DEFAULT 'CASH SALE',
  "cashSaleNumber"          TEXT           NOT NULL,
  "issueDate"               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "orderNumber"             TEXT,
  "referenceInvoiceNumber"  TEXT,
  "paymentMethod"           TEXT           NOT NULL DEFAULT 'cash',
  "transactionCode"         TEXT,
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
  "taxRate"                 NUMERIC(5,2)   NOT NULL DEFAULT 0,
  "discountType"            TEXT           NOT NULL DEFAULT 'PERCENTAGE',
  "discountValue"           NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "subtotal"                NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "taxAmount"               NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "discountAmount"          NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "total"                   NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "accentColor"             TEXT           NOT NULL DEFAULT '#22c55e',
  "logoDataUrl"             TEXT,
  "signatureDataUrl"        TEXT,
  "notes"                   TEXT,
  "isPaid"                  BOOLEAN        NOT NULL DEFAULT false,
  "paidAt"                  TIMESTAMPTZ,
  "pdfUrl"                  TEXT,
  "createdAt"               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "CashSale_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashSale_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "CashSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "CashSale_tenant_required" CHECK ("userId" IS NOT NULL OR "guestSessionId" IS NOT NULL)
);

-- =============================================================================
-- Table: "CashSaleLineItem" — with rate and amount (like invoices)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "CashSaleLineItem" (
  "id"                TEXT           NOT NULL,
  "cashSaleId"        TEXT           NOT NULL,
  "description"       TEXT           NOT NULL,
  "additionalDetails" TEXT,
  "quantity"          NUMERIC(12,4)  NOT NULL,
  "rate"              NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "amount"            NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "sortOrder"         INTEGER        NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "CashSaleLineItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashSaleLineItem_cashSaleId_fkey" FOREIGN KEY ("cashSaleId") REFERENCES "CashSale"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "CashSalePhoto"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "CashSalePhoto" (
  "id"            TEXT        NOT NULL,
  "cashSaleId"    TEXT        NOT NULL,
  "url"           TEXT        NOT NULL,
  "filename"      TEXT,
  "sortOrder"     INTEGER     NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "CashSalePhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashSalePhoto_cashSaleId_fkey" FOREIGN KEY ("cashSaleId") REFERENCES "CashSale"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "CashSalePayment"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "CashSalePayment" (
  "id"                  TEXT           NOT NULL,
  "cashSaleId"          TEXT           NOT NULL,
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

  CONSTRAINT "CashSalePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashSalePayment_cashSaleId_fkey" FOREIGN KEY ("cashSaleId") REFERENCES "CashSale"("id"),
  CONSTRAINT "CashSalePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- =============================================================================
-- Enable RLS
-- =============================================================================
ALTER TABLE "CashSale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashSaleLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashSalePhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashSalePayment" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Auto-update triggers for updatedAt
-- =============================================================================
CREATE OR REPLACE FUNCTION update_cash_sale_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "CashSale_updatedAt" ON "CashSale";
CREATE TRIGGER "CashSale_updatedAt"
  BEFORE UPDATE ON "CashSale"
  FOR EACH ROW EXECUTE FUNCTION update_cash_sale_updated_at();

DROP TRIGGER IF EXISTS "CashSaleLineItem_updatedAt" ON "CashSaleLineItem";
CREATE TRIGGER "CashSaleLineItem_updatedAt"
  BEFORE UPDATE ON "CashSaleLineItem"
  FOR EACH ROW EXECUTE FUNCTION update_cash_sale_updated_at();

DROP TRIGGER IF EXISTS "CashSalePayment_updatedAt" ON "CashSalePayment";
CREATE TRIGGER "CashSalePayment_updatedAt"
  BEFORE UPDATE ON "CashSalePayment"
  FOR EACH ROW EXECUTE FUNCTION update_cash_sale_updated_at();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS "CashSale_userId_idx" ON "CashSale"("userId");
CREATE INDEX IF NOT EXISTS "CashSale_guestSessionId_idx" ON "CashSale"("guestSessionId");
CREATE INDEX IF NOT EXISTS "CashSale_publicId_idx" ON "CashSale"("publicId");
CREATE INDEX IF NOT EXISTS "CashSale_createdAt_idx" ON "CashSale"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CashSale_userId_isPaid_idx" ON "CashSale"("userId", "isPaid");

CREATE INDEX IF NOT EXISTS "CashSaleLineItem_cashSaleId_idx" ON "CashSaleLineItem"("cashSaleId", "sortOrder");
CREATE INDEX IF NOT EXISTS "CashSalePhoto_cashSaleId_idx" ON "CashSalePhoto"("cashSaleId", "sortOrder");

CREATE INDEX IF NOT EXISTS "CashSalePayment_checkoutRequestId_idx" ON "CashSalePayment"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS "CashSalePayment_cashSaleId_idx" ON "CashSalePayment"("cashSaleId");

-- =============================================================================
-- RPC: Atomic payment creation for cash sales
-- =============================================================================
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
  -- Lock the cash sale row
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

  -- Check for in-progress payment
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

  -- Create the payment
  INSERT INTO "CashSalePayment" ("id", "cashSaleId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_cash_sale_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;
