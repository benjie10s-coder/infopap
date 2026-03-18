// lib/audit.ts — Audit logging helper for admin actions
import { getAdminClient } from "@/lib/supabase/admin";

interface AuditEntry {
  actor?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an admin action to the AuditLog table.
 * Non-blocking — errors are silently caught to avoid disrupting admin operations.
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const admin = getAdminClient();
    await admin.from("AuditLog").insert({
      actor: entry.actor || "admin",
      action: entry.action,
      targetType: entry.targetType || null,
      targetId: entry.targetId || null,
      details: entry.details || {},
      ipAddress: entry.ipAddress || null,
    });
  } catch {
    // Non-blocking — don't let audit failures break admin operations
    console.error("[audit] Failed to log action:", entry.action);
  }
}
