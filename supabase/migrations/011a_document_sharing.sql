-- Migration 010: Document Sharing — share tokens, email logs, auth-aware consumption
-- Enables multi-channel delivery (download, email, share link) with:
-- - Share tokens for shareable links
-- - Email delivery logging
-- - Auth-aware payment consumption (guests consume, authenticated users retain access)
--
-- DEPENDENCY: Requires migrations 001, 006, 007 (both), 008, 009 to be applied first.

-- =============================================================================
-- Add share token columns to all document tables (defensive - checks table exists)
-- =============================================================================

-- Invoice (from 001_schema.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Invoice') THEN
    ALTER TABLE "Invoice"
      ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
      ADD COLUMN IF NOT EXISTS "shareTokenCreatedAt" TIMESTAMPTZ;
    
    CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_shareToken_key" ON "Invoice"("shareToken") WHERE "shareToken" IS NOT NULL;
  END IF;
END $$;

-- CashSale (from 007_cash_sales.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CashSale') THEN
    ALTER TABLE "CashSale"
      ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
      ADD COLUMN IF NOT EXISTS "shareTokenCreatedAt" TIMESTAMPTZ;
    
    CREATE UNIQUE INDEX IF NOT EXISTS "CashSale_shareToken_key" ON "CashSale"("shareToken") WHERE "shareToken" IS NOT NULL;
  END IF;
END $$;

-- DeliveryNote (from 006_delivery_notes.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DeliveryNote') THEN
    ALTER TABLE "DeliveryNote"
      ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
      ADD COLUMN IF NOT EXISTS "shareTokenCreatedAt" TIMESTAMPTZ;
    
    CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryNote_shareToken_key" ON "DeliveryNote"("shareToken") WHERE "shareToken" IS NOT NULL;
  END IF;
END $$;

-- Receipt (from 007_receipts.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Receipt') THEN
    ALTER TABLE "Receipt"
      ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
      ADD COLUMN IF NOT EXISTS "shareTokenCreatedAt" TIMESTAMPTZ;
    
    CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_shareToken_key" ON "Receipt"("shareToken") WHERE "shareToken" IS NOT NULL;
  END IF;
END $$;

-- PurchaseOrder (from 008_purchase_orders.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PurchaseOrder') THEN
    ALTER TABLE "PurchaseOrder"
      ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
      ADD COLUMN IF NOT EXISTS "shareTokenCreatedAt" TIMESTAMPTZ;
    
    CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_shareToken_key" ON "PurchaseOrder"("shareToken") WHERE "shareToken" IS NOT NULL;
  END IF;
END $$;

-- Quotation (from 009_quotations.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Quotation') THEN
    ALTER TABLE "Quotation"
      ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
      ADD COLUMN IF NOT EXISTS "shareTokenCreatedAt" TIMESTAMPTZ;
    
    CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_shareToken_key" ON "Quotation"("shareToken") WHERE "shareToken" IS NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- Table: "DocumentEmailLog" — tracks email deliveries for audit & rate limiting
-- =============================================================================
CREATE TABLE IF NOT EXISTS "DocumentEmailLog" (
  "id"              TEXT           NOT NULL DEFAULT gen_random_uuid()::text,
  "documentType"    TEXT           NOT NULL,  -- 'invoice', 'cash-sale', 'delivery-note', 'receipt', 'purchase-order', 'quotation'
  "documentId"      TEXT           NOT NULL,
  "publicId"        TEXT           NOT NULL,
  "userId"          TEXT,
  "guestSessionId"  TEXT,
  "recipientEmail"  TEXT           NOT NULL,
  "recipientName"   TEXT,
  "senderEmail"     TEXT,
  "subject"         TEXT,
  "status"          TEXT           NOT NULL DEFAULT 'sent',  -- 'sent', 'delivered', 'bounced', 'failed'
  "resendId"        TEXT,         -- Resend message ID for tracking
  "errorMessage"    TEXT,
  "createdAt"       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "DocumentEmailLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentEmailLog_tenant_check" CHECK ("userId" IS NOT NULL OR "guestSessionId" IS NOT NULL)
);

-- Index for rate limiting queries (emails per user/guest per hour)
CREATE INDEX IF NOT EXISTS "DocumentEmailLog_userId_createdAt_idx" 
  ON "DocumentEmailLog"("userId", "createdAt") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "DocumentEmailLog_guestSessionId_createdAt_idx" 
  ON "DocumentEmailLog"("guestSessionId", "createdAt") WHERE "guestSessionId" IS NOT NULL;

-- Index for document history lookup
CREATE INDEX IF NOT EXISTS "DocumentEmailLog_documentType_documentId_idx" 
  ON "DocumentEmailLog"("documentType", "documentId");

-- =============================================================================
-- Enable RLS on DocumentEmailLog
-- =============================================================================
ALTER TABLE "DocumentEmailLog" ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "DocumentEmailLog_service_all" ON "DocumentEmailLog"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read their own email logs
CREATE POLICY "DocumentEmailLog_auth_read" ON "DocumentEmailLog"
  FOR SELECT TO authenticated
  USING (
    "userId" IN (
      SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
    )
  );

-- =============================================================================
-- RPC: Look up document by share token (searches all document types)
-- Returns document type, ID, and publicId for routing
-- =============================================================================
CREATE OR REPLACE FUNCTION find_document_by_share_token(p_token TEXT)
RETURNS TABLE(
  document_type TEXT,
  document_id TEXT,
  public_id TEXT,
  user_id TEXT,
  guest_session_id TEXT,
  is_paid BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try Invoice
  RETURN QUERY
  SELECT 'invoice'::TEXT, i."id", i."publicId", i."userId", i."guestSessionId", i."isPaid"
  FROM "Invoice" i WHERE i."shareToken" = p_token;
  IF FOUND THEN RETURN; END IF;

  -- Try CashSale
  RETURN QUERY
  SELECT 'cash-sale'::TEXT, c."id", c."publicId", c."userId", c."guestSessionId", c."isPaid"
  FROM "CashSale" c WHERE c."shareToken" = p_token;
  IF FOUND THEN RETURN; END IF;

  -- Try DeliveryNote
  RETURN QUERY
  SELECT 'delivery-note'::TEXT, d."id", d."publicId", d."userId", d."guestSessionId", d."isPaid"
  FROM "DeliveryNote" d WHERE d."shareToken" = p_token;
  IF FOUND THEN RETURN; END IF;

  -- Try Receipt
  RETURN QUERY
  SELECT 'receipt'::TEXT, r."id", r."publicId", r."userId", r."guestSessionId", r."isPaid"
  FROM "Receipt" r WHERE r."shareToken" = p_token;
  IF FOUND THEN RETURN; END IF;

  -- Try PurchaseOrder
  RETURN QUERY
  SELECT 'purchase-order'::TEXT, p."id", p."publicId", p."userId", p."guestSessionId", p."isPaid"
  FROM "PurchaseOrder" p WHERE p."shareToken" = p_token;
  IF FOUND THEN RETURN; END IF;

  -- Try Quotation
  RETURN QUERY
  SELECT 'quotation'::TEXT, q."id", q."publicId", q."userId", q."guestSessionId", q."isPaid"
  FROM "Quotation" q WHERE q."shareToken" = p_token;
  IF FOUND THEN RETURN; END IF;

  -- Not found
  RETURN;
END;
$$;

-- =============================================================================
-- RPC: Consume share token for guest documents (single-use)
-- =============================================================================
CREATE OR REPLACE FUNCTION consume_guest_share_token(p_token TEXT, p_document_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_session_id TEXT;
BEGIN
  -- Only consume token if document belongs to guest (userId IS NULL)
  CASE p_document_type
    WHEN 'invoice' THEN
      UPDATE "Invoice" SET "shareToken" = NULL, "shareTokenCreatedAt" = NULL
      WHERE "shareToken" = p_token AND "userId" IS NULL
      RETURNING "guestSessionId" INTO v_guest_session_id;
    WHEN 'cash-sale' THEN
      UPDATE "CashSale" SET "shareToken" = NULL, "shareTokenCreatedAt" = NULL
      WHERE "shareToken" = p_token AND "userId" IS NULL
      RETURNING "guestSessionId" INTO v_guest_session_id;
    WHEN 'delivery-note' THEN
      UPDATE "DeliveryNote" SET "shareToken" = NULL, "shareTokenCreatedAt" = NULL
      WHERE "shareToken" = p_token AND "userId" IS NULL
      RETURNING "guestSessionId" INTO v_guest_session_id;
    WHEN 'receipt' THEN
      UPDATE "Receipt" SET "shareToken" = NULL, "shareTokenCreatedAt" = NULL
      WHERE "shareToken" = p_token AND "userId" IS NULL
      RETURNING "guestSessionId" INTO v_guest_session_id;
    WHEN 'purchase-order' THEN
      UPDATE "PurchaseOrder" SET "shareToken" = NULL, "shareTokenCreatedAt" = NULL
      WHERE "shareToken" = p_token AND "userId" IS NULL
      RETURNING "guestSessionId" INTO v_guest_session_id;
    WHEN 'quotation' THEN
      UPDATE "Quotation" SET "shareToken" = NULL, "shareTokenCreatedAt" = NULL
      WHERE "shareToken" = p_token AND "userId" IS NULL
      RETURNING "guestSessionId" INTO v_guest_session_id;
    ELSE
      RETURN FALSE;
  END CASE;

  RETURN v_guest_session_id IS NOT NULL;
END;
$$;

-- Note: shareToken indexes already created above with _key suffix
