-- Migration 006: Delivery Notes — separate tables for delivery note documents
-- Delivery notes have NO monetary columns (no rate, amount, subtotal, tax, total)
-- Line items only have quantity + description

-- =============================================================================
-- Table: "DeliveryNote"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "DeliveryNote" (
  "id"                  TEXT           NOT NULL,
  "userId"              TEXT,
  "guestSessionId"      TEXT,
  "publicId"            TEXT           NOT NULL,
  "documentTitle"       TEXT           NOT NULL DEFAULT 'DELIVERY NOTE',
  "deliveryNoteNumber"  TEXT           NOT NULL,
  "issueDate"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "orderNumber"         TEXT,
  "referenceInvoiceNumber" TEXT,
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
  "acknowledgmentText"  TEXT           NOT NULL DEFAULT 'Goods received in good order',
  "accentColor"         TEXT           NOT NULL DEFAULT '#0d9488',
  "logoDataUrl"         TEXT,
  "signatureDataUrl"    TEXT,
  "notes"               TEXT,
  "isPaid"              BOOLEAN        NOT NULL DEFAULT false,
  "paidAt"              TIMESTAMPTZ,
  "pdfUrl"              TEXT,
  "createdAt"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "DeliveryNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryNote_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "DeliveryNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "DeliveryNote_tenant_required" CHECK ("userId" IS NOT NULL OR "guestSessionId" IS NOT NULL)
);

-- =============================================================================
-- Table: "DeliveryNoteLineItem" — simplified: no rate, no amount
-- =============================================================================
CREATE TABLE IF NOT EXISTS "DeliveryNoteLineItem" (
  "id"                TEXT           NOT NULL,
  "deliveryNoteId"    TEXT           NOT NULL,
  "description"       TEXT           NOT NULL,
  "additionalDetails" TEXT,
  "quantity"          NUMERIC(12,4)  NOT NULL,
  "sortOrder"         INTEGER        NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "DeliveryNoteLineItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryNoteLineItem_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "DeliveryNotePhoto"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "DeliveryNotePhoto" (
  "id"              TEXT        NOT NULL,
  "deliveryNoteId"  TEXT        NOT NULL,
  "url"             TEXT        NOT NULL,
  "filename"        TEXT,
  "sortOrder"       INTEGER     NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "DeliveryNotePhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryNotePhoto_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "DeliveryNotePayment"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "DeliveryNotePayment" (
  "id"                  TEXT           NOT NULL,
  "deliveryNoteId"      TEXT           NOT NULL,
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

  CONSTRAINT "DeliveryNotePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryNotePayment_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id"),
  CONSTRAINT "DeliveryNotePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- =============================================================================
-- Enable RLS
-- =============================================================================
ALTER TABLE "DeliveryNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliveryNoteLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliveryNotePhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliveryNotePayment" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Auto-update triggers for updatedAt
-- =============================================================================
CREATE OR REPLACE FUNCTION update_delivery_note_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "DeliveryNote_updatedAt" ON "DeliveryNote";
CREATE TRIGGER "DeliveryNote_updatedAt"
  BEFORE UPDATE ON "DeliveryNote"
  FOR EACH ROW EXECUTE FUNCTION update_delivery_note_updated_at();

DROP TRIGGER IF EXISTS "DeliveryNoteLineItem_updatedAt" ON "DeliveryNoteLineItem";
CREATE TRIGGER "DeliveryNoteLineItem_updatedAt"
  BEFORE UPDATE ON "DeliveryNoteLineItem"
  FOR EACH ROW EXECUTE FUNCTION update_delivery_note_updated_at();

DROP TRIGGER IF EXISTS "DeliveryNotePayment_updatedAt" ON "DeliveryNotePayment";
CREATE TRIGGER "DeliveryNotePayment_updatedAt"
  BEFORE UPDATE ON "DeliveryNotePayment"
  FOR EACH ROW EXECUTE FUNCTION update_delivery_note_updated_at();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS "DeliveryNote_userId_idx" ON "DeliveryNote"("userId");
CREATE INDEX IF NOT EXISTS "DeliveryNote_guestSessionId_idx" ON "DeliveryNote"("guestSessionId");
CREATE INDEX IF NOT EXISTS "DeliveryNote_publicId_idx" ON "DeliveryNote"("publicId");
CREATE INDEX IF NOT EXISTS "DeliveryNote_createdAt_idx" ON "DeliveryNote"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DeliveryNote_userId_isPaid_idx" ON "DeliveryNote"("userId", "isPaid");

CREATE INDEX IF NOT EXISTS "DeliveryNoteLineItem_deliveryNoteId_idx" ON "DeliveryNoteLineItem"("deliveryNoteId", "sortOrder");
CREATE INDEX IF NOT EXISTS "DeliveryNotePhoto_deliveryNoteId_idx" ON "DeliveryNotePhoto"("deliveryNoteId", "sortOrder");

CREATE INDEX IF NOT EXISTS "DeliveryNotePayment_checkoutRequestId_idx" ON "DeliveryNotePayment"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS "DeliveryNotePayment_deliveryNoteId_idx" ON "DeliveryNotePayment"("deliveryNoteId");

-- =============================================================================
-- RPC: Atomic payment creation for delivery notes
-- =============================================================================
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
  -- Lock the delivery note row
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

  -- Check for in-progress payment
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

  -- Create the payment
  INSERT INTO "DeliveryNotePayment" ("id", "deliveryNoteId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_delivery_note_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;
