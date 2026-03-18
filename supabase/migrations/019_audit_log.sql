-- 019_audit_log.sql — Admin audit trail for tracking administrative actions

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "actor"       TEXT NOT NULL DEFAULT 'admin',
  "action"      TEXT NOT NULL,
  "targetType"  TEXT,
  "targetId"    TEXT,
  "details"     JSONB DEFAULT '{}'::jsonb,
  "ipAddress"   TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_audit_log_created" ON "AuditLog" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_log_actor" ON "AuditLog" ("actor");
CREATE INDEX IF NOT EXISTS "idx_audit_log_action" ON "AuditLog" ("action");
CREATE INDEX IF NOT EXISTS "idx_audit_log_target" ON "AuditLog" ("targetType", "targetId");
