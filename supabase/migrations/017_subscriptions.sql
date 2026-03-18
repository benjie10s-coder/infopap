-- Migration 017: Subscription Plans
-- Adds prepaid subscription system (Basic/Growth/Scale) alongside existing pay-as-you-go

-- =============================================================================
-- Table: "Subscription"
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"                  TEXT           NOT NULL,
  "userId"              TEXT           NOT NULL,
  "plan"                TEXT           NOT NULL,
  "status"              TEXT           NOT NULL DEFAULT 'PENDING',
  "documentsLimit"      INTEGER        NOT NULL,
  "documentsUsed"       INTEGER        NOT NULL DEFAULT 0,
  "amountPaid"          INTEGER        NOT NULL,
  "phoneNumber"         TEXT,
  "purchasedAt"         TIMESTAMPTZ,
  "expiresAt"           TIMESTAMPTZ,
  "renewedFromId"       TEXT,
  "merchantRequestId"   TEXT,
  "checkoutRequestId"   TEXT,
  "mpesaReceiptNumber"  TEXT,
  "createdAt"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Subscription_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "Subscription"("id") ON DELETE SET NULL,
  CONSTRAINT "Subscription_plan_check" CHECK ("plan" IN ('BASIC', 'GROWTH', 'SCALE')),
  CONSTRAINT "Subscription_status_check" CHECK ("status" IN ('PENDING', 'ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELLED'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS "idx_subscription_user_status" ON "Subscription" ("userId", "status");
CREATE INDEX IF NOT EXISTS "idx_subscription_checkout" ON "Subscription" ("checkoutRequestId");

-- =============================================================================
-- RPC: use_subscription_document
-- Atomically consumes one document from a user's active subscription.
-- Returns the subscription row on success, NULL if no valid subscription.
-- =============================================================================
CREATE OR REPLACE FUNCTION use_subscription_document(p_user_id TEXT)
RETURNS TABLE (
  sub_id TEXT,
  sub_plan TEXT,
  documents_limit INTEGER,
  documents_used INTEGER,
  documents_remaining INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
  v_sub RECORD;
BEGIN
  -- Lock the active subscription row to prevent race conditions
  SELECT * INTO v_sub
  FROM "Subscription"
  WHERE "userId" = p_user_id
    AND "status" = 'ACTIVE'
  ORDER BY "createdAt" DESC
  LIMIT 1
  FOR UPDATE;

  -- No active subscription
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check expiry
  IF v_sub."expiresAt" IS NOT NULL AND v_sub."expiresAt" < NOW() THEN
    UPDATE "Subscription"
    SET "status" = 'EXPIRED', "updatedAt" = NOW()
    WHERE "id" = v_sub."id";
    RETURN;
  END IF;

  -- Check quota
  IF v_sub."documentsUsed" >= v_sub."documentsLimit" THEN
    UPDATE "Subscription"
    SET "status" = 'EXHAUSTED', "updatedAt" = NOW()
    WHERE "id" = v_sub."id";
    RETURN;
  END IF;

  -- Consume one document
  UPDATE "Subscription"
  SET "documentsUsed" = "documentsUsed" + 1,
      "updatedAt" = NOW()
  WHERE "id" = v_sub."id";

  -- Check if this consumption exhausted the quota
  IF (v_sub."documentsUsed" + 1) >= v_sub."documentsLimit" THEN
    UPDATE "Subscription"
    SET "status" = 'EXHAUSTED', "updatedAt" = NOW()
    WHERE "id" = v_sub."id";
  END IF;

  sub_id := v_sub."id";
  sub_plan := v_sub."plan";
  documents_limit := v_sub."documentsLimit";
  documents_used := v_sub."documentsUsed" + 1;
  documents_remaining := v_sub."documentsLimit" - (v_sub."documentsUsed" + 1);
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- RPC: activate_subscription
-- Transitions a PENDING subscription to ACTIVE after M-Pesa payment confirms.
-- =============================================================================
CREATE OR REPLACE FUNCTION activate_subscription(
  p_checkout_request_id TEXT,
  p_receipt TEXT
)
RETURNS TABLE (
  sub_id TEXT,
  sub_plan TEXT,
  sub_status TEXT,
  documents_limit INTEGER,
  expires_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
DECLARE
  v_sub RECORD;
BEGIN
  -- Find and lock the pending subscription
  SELECT * INTO v_sub
  FROM "Subscription"
  WHERE "checkoutRequestId" = p_checkout_request_id
    AND "status" = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Deactivate any existing ACTIVE subscription for this user
  UPDATE "Subscription"
  SET "status" = 'EXPIRED', "updatedAt" = NOW()
  WHERE "userId" = v_sub."userId"
    AND "status" = 'ACTIVE'
    AND "id" != v_sub."id";

  -- Activate the new subscription
  UPDATE "Subscription"
  SET "status" = 'ACTIVE',
      "purchasedAt" = NOW(),
      "expiresAt" = NOW() + INTERVAL '1 year',
      "mpesaReceiptNumber" = p_receipt,
      "updatedAt" = NOW()
  WHERE "id" = v_sub."id";

  sub_id := v_sub."id";
  sub_plan := v_sub."plan";
  sub_status := 'ACTIVE';
  documents_limit := v_sub."documentsLimit";
  expires_at := NOW() + INTERVAL '1 year';
  RETURN NEXT;
END;
$$;
