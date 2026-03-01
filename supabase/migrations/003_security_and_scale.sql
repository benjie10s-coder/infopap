-- Migration 003: Security & Scale
-- Indexes, RLS policies, RPCs, monetary precision, triggers

-- =============================================================================
-- Indexes for high-volume queries
-- =============================================================================

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoice_user_paid ON "Invoice"("userId", "isPaid");
CREATE INDEX IF NOT EXISTS idx_invoice_user_due ON "Invoice"("userId", "dueDate");
CREATE INDEX IF NOT EXISTS idx_invoice_guest ON "Invoice"("guestSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_public_id ON "Invoice"("publicId");
CREATE INDEX IF NOT EXISTS idx_invoice_created_at ON "Invoice"("createdAt" DESC);

-- Unique invoice number per user (partial index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_user_number
  ON "Invoice"("userId", "invoiceNumber")
  WHERE "userId" IS NOT NULL;

-- LineItem indexes
CREATE INDEX IF NOT EXISTS idx_lineitem_invoice ON "LineItem"("invoiceId", "sortOrder");

-- InvoicePhoto indexes
CREATE INDEX IF NOT EXISTS idx_invoicephoto_invoice ON "InvoicePhoto"("invoiceId", "sortOrder");

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payment_checkout ON "Payment"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON "Payment"("invoiceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_payment_stale
  ON "Payment"(status, "createdAt")
  WHERE status IN ('PENDING', 'PROCESSING');

-- =============================================================================
-- Auto-update trigger for updatedAt
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_updated_at ON "User";
CREATE TRIGGER trg_user_updated_at
  BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_invoice_updated_at ON "Invoice";
CREATE TRIGGER trg_invoice_updated_at
  BEFORE UPDATE ON "Invoice"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lineitem_updated_at ON "LineItem";
CREATE TRIGGER trg_lineitem_updated_at
  BEFORE UPDATE ON "LineItem"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_payment_updated_at ON "Payment";
CREATE TRIGGER trg_payment_updated_at
  BEFORE UPDATE ON "Payment"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS Policies for authenticated users
-- =============================================================================

-- User: users can read/update their own record
CREATE POLICY "Users can read own record"
  ON "User" FOR SELECT
  USING ("externalId" = auth.uid()::text);

CREATE POLICY "Users can update own record"
  ON "User" FOR UPDATE
  USING ("externalId" = auth.uid()::text);

-- Invoice: users can CRUD their own invoices
CREATE POLICY "Users can select own invoices"
  ON "Invoice" FOR SELECT
  USING ("userId" IN (
    SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
  ));

CREATE POLICY "Users can insert own invoices"
  ON "Invoice" FOR INSERT
  WITH CHECK ("userId" IN (
    SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
  ));

CREATE POLICY "Users can update own invoices"
  ON "Invoice" FOR UPDATE
  USING ("userId" IN (
    SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
  ));

CREATE POLICY "Users can delete own invoices"
  ON "Invoice" FOR DELETE
  USING ("userId" IN (
    SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
  ));

-- LineItem: users can manage line items for their own invoices
CREATE POLICY "Users can select own line items"
  ON "LineItem" FOR SELECT
  USING ("invoiceId" IN (
    SELECT "id" FROM "Invoice" WHERE "userId" IN (
      SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
    )
  ));

CREATE POLICY "Users can insert own line items"
  ON "LineItem" FOR INSERT
  WITH CHECK ("invoiceId" IN (
    SELECT "id" FROM "Invoice" WHERE "userId" IN (
      SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
    )
  ));

CREATE POLICY "Users can update own line items"
  ON "LineItem" FOR UPDATE
  USING ("invoiceId" IN (
    SELECT "id" FROM "Invoice" WHERE "userId" IN (
      SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
    )
  ));

CREATE POLICY "Users can delete own line items"
  ON "LineItem" FOR DELETE
  USING ("invoiceId" IN (
    SELECT "id" FROM "Invoice" WHERE "userId" IN (
      SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
    )
  ));

-- InvoicePhoto: same pattern as LineItem
CREATE POLICY "Users can select own photos"
  ON "InvoicePhoto" FOR SELECT
  USING ("invoiceId" IN (
    SELECT "id" FROM "Invoice" WHERE "userId" IN (
      SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
    )
  ));

CREATE POLICY "Users can insert own photos"
  ON "InvoicePhoto" FOR INSERT
  WITH CHECK ("invoiceId" IN (
    SELECT "id" FROM "Invoice" WHERE "userId" IN (
      SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
    )
  ));

CREATE POLICY "Users can delete own photos"
  ON "InvoicePhoto" FOR DELETE
  USING ("invoiceId" IN (
    SELECT "id" FROM "Invoice" WHERE "userId" IN (
      SELECT "id" FROM "User" WHERE "externalId" = auth.uid()::text
    )
  ));

-- =============================================================================
-- Dashboard Stats RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "userId" = p_user_id),
    'paidInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "userId" = p_user_id AND "isPaid" = true),
    'unpaidInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "userId" = p_user_id AND "isPaid" = false),
    'totalRevenue', COALESCE((SELECT SUM("total") FROM "Invoice" WHERE "userId" = p_user_id AND "isPaid" = true), 0),
    'overdueInvoices', (SELECT COUNT(*) FROM "Invoice" WHERE "userId" = p_user_id AND "isPaid" = false AND "dueDate" < NOW()),
    'recentInvoices', (
      SELECT COALESCE(json_agg(row_to_json(inv)), '[]'::json)
      FROM (
        SELECT "id", "publicId", "documentType", "invoiceNumber", "toName", "total", "currency", "isPaid", "createdAt", "dueDate"
        FROM "Invoice"
        WHERE "userId" = p_user_id
        ORDER BY "createdAt" DESC
        LIMIT 10
      ) inv
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- =============================================================================
-- Atomic Payment Creation RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION create_payment_if_unpaid(
  p_payment_id TEXT,
  p_invoice_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_amount NUMERIC(15,2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_active_payment RECORD;
  v_result JSON;
BEGIN
  -- Lock the invoice row
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

  -- Check for active payments
  SELECT "id", "status"
  INTO v_active_payment
  FROM "Payment"
  WHERE "invoiceId" = p_invoice_id
    AND status IN ('PENDING', 'PROCESSING')
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'error', 'Payment already in progress',
      'code', 'PAYMENT_IN_PROGRESS',
      'paymentId', v_active_payment."id"
    );
  END IF;

  -- Create the payment
  INSERT INTO "Payment" ("id", "invoiceId", "userId", "phoneNumber", "amount", "currency", "status")
  VALUES (p_payment_id, p_invoice_id, p_user_id, p_phone_number, p_amount, 'KES', 'PENDING');

  RETURN json_build_object(
    'success', true,
    'paymentId', p_payment_id
  );
END;
$$;
