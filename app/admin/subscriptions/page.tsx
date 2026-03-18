// app/admin/subscriptions/page.tsx — Subscription management page
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ExportButton } from "@/components/admin/ExportButton";
import { formatCurrency } from "@/lib/utils/format";

interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  documentsLimit: number;
  documentsUsed: number;
  amountPaid: number;
  phoneNumber: string | null;
  purchasedAt: string;
  expiresAt: string;
  mpesaReceiptNumber: string | null;
  User: { name: string; email: string };
}

interface Aggregates {
  activeSubs: number;
  totalSubRevenue: number;
  expiringSoon: number;
}

interface Pagination {
  page: number;
  totalItems: number;
  totalPages: number;
}

export default function AdminSubscriptionsPage() {
  const { adminFetch } = useAdminAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates>({ activeSubs: 0, totalSubRevenue: 0, expiringSoon: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  const fetchSubs = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (planFilter) params.set("plan", planFilter);
      const res = await adminFetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions);
        setPagination(data.pagination);
        setAggregates(data.aggregates);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch, statusFilter, planFilter]);

  useEffect(() => {
    fetchSubs(1);
  }, [fetchSubs]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Subscriptions</h1>
          <p className="text-sm text-white/30 mt-1">
            {pagination.totalItems} total subscriptions
          </p>
        </div>
        <ExportButton
          data={subscriptions as unknown as Record<string, unknown>[]}
          filename="invosafi-subscriptions"
        />
      </div>

      {/* Aggregate cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Active Subscriptions" value={String(aggregates.activeSubs)} accent="text-green-400" />
        <StatCard label="Subscription Revenue" value={formatCurrency(aggregates.totalSubRevenue, "KES")} accent="text-green-400" />
        <StatCard
          label="Expiring Soon (30d)"
          value={String(aggregates.expiringSoon)}
          accent={aggregates.expiringSoon > 0 ? "text-yellow-400" : undefined}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-lagoon/50 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="EXHAUSTED">Exhausted</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-lagoon/50 focus:outline-none"
        >
          <option value="">All Plans</option>
          <option value="BASIC">Basic (KSh 500)</option>
          <option value="GROWTH">Growth (KSh 1,500)</option>
          <option value="SCALE">Scale (KSh 3,000)</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Usage</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">M-Pesa</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Purchased</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-white/30">
                    <div className="h-4 w-4 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-white/20">
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => {
                const utilization = sub.documentsLimit > 0
                  ? Math.round((sub.documentsUsed / sub.documentsLimit) * 100)
                  : 0;
                return (
                  <tr key={sub.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-white/70 font-medium truncate">{sub.User?.name || "Unknown"}</p>
                        <p className="text-[11px] text-white/30 truncate">{sub.User?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{sub.plan}</td>
                    <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className={`h-full rounded-full ${
                              utilization > 90
                                ? "bg-red-400"
                                : utilization > 70
                                ? "bg-yellow-400"
                                : "bg-green-400"
                            }`}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>
                        <span className="text-white/50 text-xs whitespace-nowrap">
                          {sub.documentsUsed}/{sub.documentsLimit}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatCurrency(sub.amountPaid, "KES")}
                    </td>
                    <td className="px-4 py-3 text-white/40 font-mono text-xs">
                      {sub.mpesaReceiptNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {new Date(sub.purchasedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {new Date(sub.expiresAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/30">
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)</span>
          <div className="flex gap-1">
            <button
              onClick={() => fetchSubs(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded px-3 py-1.5 border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => fetchSubs(Math.min(pagination.totalPages, pagination.page + 1))}
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
