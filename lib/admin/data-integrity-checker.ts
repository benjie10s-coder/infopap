/**
 * lib/admin/data-integrity-checker.ts
 *
 * Automated data integrity checks for admin dashboard
 * Use this to validate payment/subscription data consistency
 *
 * Example usage:
 *   const report = await generateIntegrityReport();
 *   console.log(report);
 */

import { getAdminClient } from "@/lib/supabase/admin";
import { createRequestLogger } from "@/lib/logger";

const logger = createRequestLogger();

// ============================================================================
// Types
// ============================================================================

export interface IntegrityIssue {
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  count: number;
  affectedIds?: string[];
  remediation?: string;
}

export interface IntegrityReport {
  generatedAt: string;
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    infos: number;
    dataQualityScore: number; // 0-100
  };
  issues: IntegrityIssue[];
  metrics: {
    totalPayments: number;
    completedPayments: number;
    failedPayments: number;
    initiatedPayments: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    pendingSubscriptions: number;
    expiredSubscriptions: number;
    pendingOlderThan24h: number;
  };
  recommendations: string[];
}

// ============================================================================
// Checkers
// ============================================================================

async function checkDuplicateCheckoutIds(): Promise<IntegrityIssue | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("Subscription")
    .select("checkoutRequestId, count:*")
    .not("checkoutRequestId", "is", null);

  if (error) {
    logger.error("check_duplicate_checkout_ids_error", { error: error.message });
    return null;
  }

  const duplicates = (data || []).filter((row: any) => row.count > 1);
  if (duplicates.length === 0) return null;

  return {
    severity: "error",
    title: "Duplicate checkoutRequestIds",
    description: `Found ${duplicates.length} duplicate checkoutRequestIds in Subscription table. Each checkout ID should be unique.`,
    count: duplicates.length,
    remediation:
      "Investigate payment callback logs. Duplicate IDs may indicate mishandled idempotency or multiple callback deliveries.",
  };
}

async function checkActiveSubscriptionsWithoutPayment(): Promise<IntegrityIssue | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("Subscription")
    .select("id, userId, plan, checkoutRequestId")
    .eq("status", "ACTIVE")
    .is("checkoutRequestId", null);

  if (error || !data || data.length === 0) return null;

  return {
    severity: "error",
    title: "Active subscriptions without completed payment",
    description: `Found ${data.length} subscriptions marked ACTIVE but missing checkoutRequestId (payment not initiated).`,
    count: data.length,
    affectedIds: (data || []).map((row: any) => row.id),
    remediation:
      "Review these subscriptions. If legitimate, they should be reviewed manually. If errors, consider resetting to PENDING status.",
  };
}

async function checkCancelledSubscriptionsStillActive(): Promise<IntegrityIssue | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("Subscription")
    .select("id")
    .eq("status", "ACTIVE")
    .not("cancelledAt", "is", null);

  if (error || !data || data.length === 0) return null;

  return {
    severity: "error",
    title: "Cancelled subscriptions still marked ACTIVE",
    description: `Found ${data.length} subscriptions with a cancelledAt date but status = ACTIVE.`,
    count: data.length,
    affectedIds: data.map((row: any) => row.id),
    remediation:
      'Run: UPDATE Subscription SET status = "CANCELLED" WHERE status = "ACTIVE" AND cancelledAt IS NOT NULL;',
  };
}

async function checkStalePendingSubscriptions(): Promise<IntegrityIssue | null> {
  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("Subscription")
    .select("id")
    .eq("status", "PENDING")
    .lt("createdAt", cutoff);

  if (error || !data || data.length === 0) return null;

  return {
    severity: "warning",
    title: "Pending subscriptions older than 24 hours",
    description: `Found ${data.length} subscriptions still in PENDING status after 24+ hours. Payment likely failed.`,
    count: data.length,
    affectedIds: data.slice(0, 10).map((row: any) => row.id),
    remediation:
      'Consider marking as EXPIRED: UPDATE Subscription SET status = "EXPIRED" WHERE status = "PENDING" AND createdAt < NOW() - INTERVAL "24 hours";',
  };
}

async function checkInitiatedPaymentsOlderThan2Hours(): Promise<IntegrityIssue | null> {
  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Check all payment tables
  const tables = [
    "Payment",
    "CashSalePayment",
    "DeliveryNotePayment",
    "ReceiptPayment",
    "PurchaseOrderPayment",
    "QuotationPayment",
  ];

  let totalInitiated = 0;
  for (const table of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("status", "INITIATED")
      .lt("createdAt", cutoff);

    if (!error && data) {
      totalInitiated += data.length || 0;
    }
  }

  if (totalInitiated === 0) return null;

  return {
    severity: "info",
    title: "Initiated payments waiting for 2+ hours",
    description: `Found ${totalInitiated} payments still in INITIATED status after 2+ hours. Waiting for M-Pesa callback.`,
    count: totalInitiated,
    remediation: "These will be cleaned up by the reconciliation job or by the stale-payment cleanup task.",
  };
}

async function checkOrphanedPayments(): Promise<IntegrityIssue | null> {
  const admin = getAdminClient();
  
  // Check for subscriptions with invalid user references
  const { data, error } = await admin
    .from("Subscription")
    .select("id, userId")
    .is("userId", null);

  if (error || !data || data.length === 0) return null;

  return {
    severity: "error",
    title: "Orphaned subscription records",
    description: `Found ${data.length} subscriptions with no valid user reference.`,
    count: data.length,
    affectedIds: data.slice(0, 10).map((row: any) => row.id),
    remediation: "These subscription records should be deleted as they have no associated user.",
  };
}

async function checkPaymentMetrics(): Promise<{
  totalPayments: number;
  completedPayments: number;
  failedPayments: number;
  initiatedPayments: number;
}> {
  const admin = getAdminClient();

  const tables = [
    "Payment",
    "CashSalePayment",
    "DeliveryNotePayment",
    "ReceiptPayment",
    "PurchaseOrderPayment",
    "QuotationPayment",
  ];

  const metrics = {
    totalPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    initiatedPayments: 0,
  };

  for (const table of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from(table)
      .select("status", { count: "exact" });

    if (data) {
      const completed = data.filter((r: any) => r.status === "COMPLETED").length;
      const failed = data.filter((r: any) => r.status === "FAILED").length;
      const initiated = data.filter((r: any) => r.status === "INITIATED").length;

      metrics.totalPayments += data.length || 0;
      metrics.completedPayments += completed;
      metrics.failedPayments += failed;
      metrics.initiatedPayments += initiated;
    }
  }

  return metrics;
}

async function checkSubscriptionMetrics(): Promise<{
  totalSubscriptions: number;
  activeSubscriptions: number;
  pendingSubscriptions: number;
  expiredSubscriptions: number;
  pendingOlderThan24h: number;
}> {
  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await admin.from("Subscription").select("id, status, createdAt");

  const metrics = {
    totalSubscriptions: data?.length || 0,
    activeSubscriptions: data?.filter((s: any) => s.status === "ACTIVE").length || 0,
    pendingSubscriptions: data?.filter((s: any) => s.status === "PENDING").length || 0,
    expiredSubscriptions: data?.filter((s: any) => s.status === "EXPIRED").length || 0,
    pendingOlderThan24h:
      data?.filter((s: any) => s.status === "PENDING" && s.createdAt < cutoff).length || 0,
  };

  return metrics;
}

function calculateDataQualityScore(issues: IntegrityIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 10;
    else if (issue.severity === "warning") score -= 5;
    else if (issue.severity === "info") score -= 1;
  }
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// Main Report Generator
// ============================================================================

export async function generateIntegrityReport(): Promise<IntegrityReport> {
  const startTime = Date.now();
  const issues: IntegrityIssue[] = [];

  logger.info("integrity_check_started");

  // Run all checks
  const checks = [
    checkDuplicateCheckoutIds(),
    checkActiveSubscriptionsWithoutPayment(),
    checkCancelledSubscriptionsStillActive(),
    checkStalePendingSubscriptions(),
    checkInitiatedPaymentsOlderThan2Hours(),
    checkOrphanedPayments(),
  ];

  const results = await Promise.all(checks);
  for (const result of results) {
    if (result) issues.push(result);
  }

  // Get metrics
  const paymentMetrics = await checkPaymentMetrics();
  const subscriptionMetrics = await checkSubscriptionMetrics();

  // Build recommendations
  const recommendations: string[] = [];
  if (paymentMetrics.initiatedPayments > 10) {
    recommendations.push(
      "⚠️ Many INITIATED payments waiting. Consider running reconciliation job."
    );
  }
  if (subscriptionMetrics.pendingOlderThan24h > 5) {
    recommendations.push(
      "⚠️ Multiple stale PENDING subscriptions. Consider batch expiring them."
    );
  }
  if (issues.length === 0) {
    recommendations.push("✅ Data integrity looks good!");
  } else {
    const errorCount = issues.filter((i) => i.severity === "error").length;
    if (errorCount > 0) {
      recommendations.push(
        `🔴 Found ${errorCount} critical issues. Review and remediate immediately.`
      );
    }
  }

  const report: IntegrityReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalIssues: issues.length,
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      infos: issues.filter((i) => i.severity === "info").length,
      dataQualityScore: calculateDataQualityScore(issues),
    },
    issues: issues.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    metrics: {
      ...paymentMetrics,
      ...subscriptionMetrics,
    },
    recommendations,
  };

  const elapsed = Date.now() - startTime;
  logger.info("integrity_check_completed", {
    issueCount: issues.length,
    qualityScore: report.summary.dataQualityScore,
    elapsedMs: elapsed,
  });

  return report;
}

// Export function to easily log report
export async function logIntegrityReport(): Promise<void> {
  const report = await generateIntegrityReport();

  console.log("\n========== ADMIN DATA INTEGRITY REPORT ==========\n");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Quality Score: ${report.summary.dataQualityScore}/100`);
  console.log(`Issues Found: ${report.summary.totalIssues} (${report.summary.errors} errors, ${report.summary.warnings} warnings)`);
  console.log("\n--- Metrics ---");
  console.log(`Total Payments: ${report.metrics.totalPayments}`);
  console.log(`  ✅ Completed: ${report.metrics.completedPayments}`);
  console.log(`  ❌ Failed: ${report.metrics.failedPayments}`);
  console.log(`  ⏳ Initiated: ${report.metrics.initiatedPayments}`);
  console.log(`\nTotal Subscriptions: ${report.metrics.totalSubscriptions}`);
  console.log(`  ✅ Active: ${report.metrics.activeSubscriptions}`);
  console.log(`  ⏳ Pending: ${report.metrics.pendingSubscriptions}`);
  console.log(`  ⏹️  Expired: ${report.metrics.expiredSubscriptions}`);

  if (report.issues.length > 0) {
    console.log("\n--- Issues ---");
    for (const issue of report.issues) {
      const icon = issue.severity === "error" ? "🔴" : issue.severity === "warning" ? "🟡" : "🔵";
      console.log(`${icon} ${issue.title} (${issue.count})`);
      console.log(`   ${issue.description}`);
      if (issue.remediation) {
        console.log(`   Fix: ${issue.remediation}`);
      }
    }
  }

  console.log("\n--- Recommendations ---");
  for (const rec of report.recommendations) {
    console.log(`${rec}`);
  }
  console.log("\n================================================\n");
}
