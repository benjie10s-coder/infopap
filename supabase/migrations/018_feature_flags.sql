-- 018_feature_flags.sql — Feature flag system for admin-managed capabilities
-- Stores feature toggles that can be scoped globally, per plan, or per user

CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key"         TEXT NOT NULL UNIQUE,
  "name"        TEXT NOT NULL,
  "description" TEXT DEFAULT '',
  "enabled"     BOOLEAN NOT NULL DEFAULT false,
  "scope"       TEXT NOT NULL DEFAULT 'global'
                CHECK ("scope" IN ('global', 'plan', 'user')),
  "metadata"    JSONB DEFAULT '{}'::jsonb,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default feature flags for upcoming capabilities
INSERT INTO "FeatureFlag" ("key", "name", "description", "enabled", "scope", "metadata") VALUES
  ('bulk_download',       'Bulk Download',        'Allow users to download multiple documents at once',            false, 'global', '{}'),
  ('email_delivery',      'Email Delivery',       'Send documents to recipients via email (Resend)',              true,  'global', '{}'),
  ('multi_currency',      'Multi-Currency',        'Support for multiple currencies (USD, EUR, GBP, TZS, UGX)',  true,  'global', '{}'),
  ('custom_branding',     'Custom Branding',       'Allow users to upload logos and signatures on documents',     true,  'global', '{}'),
  ('api_access',          'API Access',            'Programmatic API access for document creation and management', false, 'plan',   '{"requiredPlans": ["GROWTH", "SCALE"]}'),
  ('telegram_bot',        'Telegram Bot',          'Create and manage documents via Telegram bot',                false, 'global', '{}'),
  ('recurring_invoices',  'Recurring Invoices',    'Automatically generate recurring invoices on a schedule',     false, 'global', '{}'),
  ('document_templates',  'Document Templates',    'Save and reuse document templates',                           false, 'global', '{}'),
  ('advanced_analytics',  'Advanced Analytics',    'Detailed analytics and reporting for users',                  false, 'plan',   '{"requiredPlans": ["GROWTH", "SCALE"]}'),
  ('whatsapp_sharing',    'WhatsApp Sharing',      'Share documents directly via WhatsApp',                       false, 'global', '{}'),
  ('multi_user_accounts', 'Multi-User Accounts',   'Multiple team members under one business account',           false, 'plan',   '{"requiredPlans": ["SCALE"]}'),
  ('credit_notes',        'Credit Notes',          'Issue credit notes against existing invoices',                false, 'global', '{}')
ON CONFLICT ("key") DO NOTHING;

-- Index for quick flag lookups
CREATE INDEX IF NOT EXISTS "idx_feature_flag_key" ON "FeatureFlag" ("key");
CREATE INDEX IF NOT EXISTS "idx_feature_flag_enabled" ON "FeatureFlag" ("enabled");
