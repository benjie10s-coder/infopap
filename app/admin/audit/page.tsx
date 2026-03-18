// app/admin/audit/page.tsx — Audit log viewer
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { ExportButton } from "@/components/admin/ExportButton";

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  feature_flag_created: "text-green-400 bg-green-500/10",
  feature_flag_updated: "text-lagoon bg-lagoon/10",
  user_deactivated: "text-red-400 bg-red-500/10",
  subscription_extended: "text-yellow-400 bg-yellow-500/10",
  payment_reconciled: "text-blue-400 bg-blue-500/10",
};

const DEFAULT_ACTION_STYLE = "text-white/60 bg-white/5";

function getTargetLink(targetType: string | null, targetId: string | null): string | null {
  if (!targetType || !targetId) return null;
  switch (targetType) {
    case "user":
      return `/admin/users/${targetId}`;
    case "feature_flag":
      return "/admin/features";
    case "subscription":
      return "/admin/subscriptions";
    default:
      return null;
  }
}

export default function AdminAuditPage() {
  const { adminFetch } = useAdminAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");

  const fetchEntries = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (actionFilter) params.set("action", actionFilter);
      if (targetTypeFilter) params.set("targetType", targetTypeFilter);
      const res = await adminFetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setPagination(data.pagination);
        if (data.actionTypes) setActionTypes(data.actionTypes);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch, actionFilter, targetTypeFilter]);

  useEffect(() => {
    fetchEntries(1);
  }, [fetchEntries]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Audit Log</h1>
          <p className="text-sm text-white/30 mt-1">
            {pagination.totalItems} events recorded
          </p>
        </div>
        <ExportButton
          data={entries as unknown as Record<string, unknown>[]}
          filename="invosafi-audit-log"
          columns={[
            { key: "createdAt", label: "Date" },
            { key: "actor", label: "Actor" },
            { key: "action", label: "Action" },
            { key: "targetType", label: "Target Type" },
            { key: "targetId", label: "Target ID" },
            { key: "ipAddress", label: "IP Address" },
          ]}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-lagoon/50 focus:outline-none"
        >
          <option value="">All Actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>

        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-lagoon/50 focus:outline-none"
        >
          <option value="">All Targets</option>
          <option value="user">Users</option>
          <option value="feature_flag">Feature Flags</option>
          <option value="subscription">Subscriptions</option>
          <option value="payment">Payments</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center text-white/20">
            No audit entries found.
            {actionFilter || targetTypeFilter ? " Try adjusting filters." : " Actions will appear here as you manage the platform."}
          </div>
        ) : (
          entries.map((entry) => {
            const actionStyle = ACTION_COLORS[entry.action] || DEFAULT_ACTION_STYLE;
            const link = getTargetLink(entry.targetType, entry.targetId);

            return (
              <div
                key={entry.id}
                className="flex items-start gap-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-transparent hover:border-white/5 px-5 py-3.5 transition-colors"
              >
                {/* Timestamp */}
                <div className="flex flex-col items-end shrink-0 w-24">
                  <span className="text-[11px] text-white/40 font-mono">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-[10px] text-white/20 font-mono">
                    {new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1.5">
                  <div className="h-2 w-2 rounded-full bg-white/20" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${actionStyle}`}>
                      {entry.action.replace(/_/g, " ")}
                    </span>
                    {entry.targetType && (
                      <span className="text-xs text-white/30">
                        on {entry.targetType}
                        {entry.targetId && link ? (
                          <Link
                            href={link}
                            className="ml-1 text-lagoon hover:text-lagoon/80 transition-colors font-mono"
                          >
                            {entry.targetId.slice(0, 8)}...
                          </Link>
                        ) : entry.targetId ? (
                          <span className="ml-1 font-mono text-white/20">{entry.targetId.slice(0, 8)}...</span>
                        ) : null}
                      </span>
                    )}
                  </div>
                  {/* Details */}
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <div className="mt-1.5">
                      <pre className="text-[10px] text-white/20 font-mono bg-white/[0.03] rounded px-2 py-1 overflow-x-auto max-w-full">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-white/20">by {entry.actor}</span>
                    {entry.ipAddress && (
                      <span className="text-[10px] text-white/15 font-mono">{entry.ipAddress}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/30">
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)</span>
          <div className="flex gap-1">
            <button
              onClick={() => fetchEntries(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded px-3 py-1.5 border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => fetchEntries(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded px-3 py-1.5 border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
