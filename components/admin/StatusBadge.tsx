// components/admin/StatusBadge.tsx — Status indicator badge for admin tables
"use client";

const STATUS_STYLES: Record<string, string> = {
  // Payment statuses
  COMPLETED: "bg-green-500/15 text-green-400 border-green-500/20",
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/20",
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  PROCESSING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/20",
  CANCELLED: "bg-white/5 text-white/40 border-white/10",
  // Subscription statuses
  EXHAUSTED: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  EXPIRED: "bg-white/5 text-white/30 border-white/10",
  // Health statuses
  HEALTHY: "bg-green-500/15 text-green-400 border-green-500/20",
  DEGRADED: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  DOWN: "bg-red-500/15 text-red-400 border-red-500/20",
  // Generic
  PAID: "bg-green-500/15 text-green-400 border-green-500/20",
  UNPAID: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  true: "bg-green-500/15 text-green-400 border-green-500/20",
  false: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
};

const DEFAULT_STYLE = "bg-white/5 text-white/40 border-white/10";

export function StatusBadge({ status }: { status: string }) {
  const styles = STATUS_STYLES[status] || DEFAULT_STYLE;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${styles}`}>
      {status}
    </span>
  );
}
