-- Migration 008: Purchase Orders — separate tables for purchase order documents
-- Purchase orders have monetary columns (unitPrice, amount, subtotal, tax, total)
-- but NO discount fields. Arithmetic: subtotal + tax = total.
-- Includes three address sections: Company (buyer/from), Vendor (to), Ship To (optional).
-- Additional fields: expectedDeliveryDate, paymentTerms, orderNumber, authorizedBy.

-- =============================================================================
-- Table: "PurchaseOrder"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id"                      TEXT           NOT NULL,
  "userId"                  TEXT,
  "guestSessionId"          TEXT,
  "publicId"                TEXT           NOT NULL,
  "documentTitle"           TEXT           NOT NULL DEFAULT 'PURCHASE ORDER',
  "purchaseOrderNumber"     TEXT           NOT NULL,
  "issueDate"               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "expectedDeliveryDate"    TEXT,
  "paymentTerms"            TEXT,
  "orderNumber"             TEXT,

  -- Company / Buyer (from)
  "fromName"                TEXT           NOT NULL,
  "fromEmail"               TEXT,
  "fromPhone"               TEXT,
  "fromMobile"              TEXT,
  "fromFax"                 TEXT,
  "fromAddress"             TEXT,
  "fromCity"                TEXT,
  "fromZipCode"             TEXT,
  "fromBusinessNumber"      TEXT,
  "fromWebsite"             TEXT,

  -- Vendor (to)
  "toName"                  TEXT           NOT NULL,
  "toEmail"                 TEXT,
  "toPhone"                 TEXT,
  "toMobile"                TEXT,
  "toFax"                   TEXT,
  "toAddress"               TEXT,
  "toCity"                  TEXT,
  "toZipCode"               TEXT,
  "toBusinessNumber"        TEXT,

  -- Ship To (optional third-party address)
  "shipToEnabled"           BOOLEAN        NOT NULL DEFAULT false,
  "shipToName"              TEXT,
  "shipToCompanyName"       TEXT,
  "shipToAddress"           TEXT,
  "shipToCity"              TEXT,
  "shipToZipCode"           TEXT,
  "shipToPhone"             TEXT,

  -- Authorized by
  "authorizedByName"        TEXT,
  "authorizedByDesignation" TEXT,

  -- Financial (NO discount — PO arithmetic: subtotal + tax = total)
  "currency"                TEXT           NOT NULL DEFAULT 'KES',
  "taxRate"                 NUMERIC(5,2)   NOT NULL DEFAULT 0,
  "subtotal"                NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "taxAmount"               NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "total"                   NUMERIC(15,2)  NOT NULL DEFAULT 0,

  -- Style & attachments
  "accentColor"             TEXT           NOT NULL DEFAULT '#d97706',
  "logoDataUrl"             TEXT,
  "signatureDataUrl"        TEXT,
  "notes"                   TEXT,

  -- Platform payment status
  "isPaid"                  BOOLEAN        NOT NULL DEFAULT false,
  "paidAt"                  TIMESTAMPTZ,
  "pdfUrl"                  TEXT,
  "createdAt"               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrder_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "PurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "PurchaseOrder_tenant_required" CHECK ("userId" IS NOT NULL OR "guestSessionId" IS NOT NULL)
);

-- =============================================================================
-- Table: "PurchaseOrderLineItem" — with unitPrice and amount
-- =============================================================================
CREATE TABLE IF NOT EXISTS "PurchaseOrderLineItem" (
  "id"                TEXT           NOT NULL,
  "purchaseOrderId"   TEXT           NOT NULL,
  "description"       TEXT           NOT NULL,
  "additionalDetails" TEXT,
  "quantity"          NUMERIC(12,4)  NOT NULL,
  "unitPrice"         NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "amount"            NUMERIC(15,2)  NOT NULL DEFAULT 0,
  "sortOrder"         INTEGER        NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "PurchaseOrderLineItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrderLineItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "PurchaseOrderPhoto"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "PurchaseOrderPhoto" (
  "id"               TEXT        NOT NULL,
  "purchaseOrderId"  TEXT        NOT NULL,
  "url"              TEXT        NOT NULL,
  "filename"         TEXT,
  "sortOrder"        INTEGER     NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "PurchaseOrderPhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrderPhoto_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE
);

-- =============================================================================
-- Table: "PurchaseOrderPayment"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "PurchaseOrderPayment" (
  "id"                  TEXT           NOT NULL,
  "purchaseOrderId"     TEXT           NOT NULL,
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

  CONSTRAINT "PurchaseOrderPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrderPayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id"),
  CONSTRAINT "PurchaseOrderPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- =============================================================================
-- Enable RLS
-- =============================================================================
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderPayment" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Auto-update triggers for updatedAt
-- =============================================================================
CREATE OR REPLACE FUNCTION update_purchase_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PurchaseOrder_updatedAt"
  BEFORE UPDATE ON "PurchaseOrder"
  FOR EACH ROW EXECUTE FUNCTION update_purchase_order_updated_at();

CREATE TRIGGER "PurchaseOrderLineItem_updatedAt"
  BEFORE UPDATE ON "PurchaseOrderLineItem"
  FOR EACH ROW EXECUTE FUNCTION update_purchase_order_updated_at();

CREATE TRIGGER "PurchaseOrderPayment_updatedAt"
  BEFORE UPDATE ON "PurchaseOrderPayment"
  FOR EACH ROW EXECUTE FUNCTION update_purchase_order_updated_at();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS "PurchaseOrder_userId_idx" ON "PurchaseOrder"("userId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_guestSessionId_idx" ON "PurchaseOrder"("guestSessionId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_publicId_idx" ON "PurchaseOrder"("publicId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PurchaseOrder_userId_isPaid_idx" ON "PurchaseOrder"("userId", "isPaid");

CREATE INDEX IF NOT EXISTS "PurchaseOrderLineItem_purchaseOrderId_idx" ON "PurchaseOrderLineItem"("purchaseOrderId", "sortOrder");
CREATE INDEX IF NOT EXISTS "PurchaseOrderPhoto_purchaseOrderId_idx" ON "PurchaseOrderPhoto"("purchaseOrderId", "sortOrder");

CREATE INDEX IF NOT EXISTS "PurchaseOrderPayment_checkoutRequestId_idx" ON "PurchaseOrderPayment"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderPayment_purchaseOrderId_idx" ON "PurchaseOrderPayment"("purchaseOrderId");

-- =============================================================================
-- RPC: Atomic payment creation for purchase orders
-- =============================================================================
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
  -- Lock the purchase order row
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

  -- Check for in-progress payment
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

  -- Create the payment
  INSERT INTO "PurchaseOrderPayment" ("id", "purchaseOrderId", "userId", "phoneNumber", "amount")
  VALUES (p_payment_id, p_purchase_order_id, p_user_id, p_phone_number, p_amount);

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;
