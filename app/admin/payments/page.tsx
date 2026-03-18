// app/admin/payments/page.tsx — Payment management page (unified across all doc types)
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ExportButton } from "@/components/admin/ExportButton";
import { formatCurrency } from "@/lib/utils/format";

interface Payment {
  id: string;
  documentType: string;
  userId: string | null;
  phoneNumber: string;
  amount: number;
  currency: string;
  status: string;
  mpesaReceiptNumber: string | null;
  resultDesc: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface StatusCount {
  count: number;
  amount: number;
}

export default function AdminPaymentsPage() {
  const { adminFetch } = useAdminAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, StatusCount>>({});
  const [pagination, setPagination] = useState({ page: 1, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);

  const fetchPayments = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      if (docTypeFilter) params.set("docType", docTypeFilter);
      const res = await adminFetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setPagination(data.pagination);
        setStatusCounts(data.statusCounts || {});
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch, statusFilter, docTypeFilter]);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await adminFetch("/api/admin/reconcile-payments", {
        method: "POST",
        headers: { "x-admin-secret": "bearer" },
      });
      const data = await res.json();
      if (res.ok) {
        setReconcileResult(`Reconciled ${data.summary?.reconciled || 0} of ${data.summary?.total || 0}`);
        fetchPayments(pagination.page);
      } else {
        setReconcileResult(`Error: ${data.error || "Failed"}`);
      }
    } catch {
      setReconcileResult("Network error");
    } finally {
      setReconciling(false);
    }
  };

  const completed = statusCounts["COMPLETED"] || { count: 0, amount: 0 };
  const failed = statusCounts["FAILED"] || { count: 0, amount: 0 };
  const pending = statusCounts["PENDING"] || { count: 0, amount: 0 };
  const cancelled = statusCounts["CANCELLED"] || { count: 0, amount: 0 };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Payments</h1>
          <p className="text-sm text-white/30 mt-1">
            {pagination.totalItems} transactions across all document types
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="rounded-lg bg-lagoon/15 border border-lagoon/20 px-3 py-1.5 text-xs text-lagoon font-medium hover:bg-lagoon/25 transition-colors disabled:opacity-50"
          >
            {reconciling ? "Reconciling..." : "Reconcile Payments"}
          </button>
          <ExportButton
            data={payments as unknown as Record<string, unknown>[]}
            filename="invosafi-payments"
          />
        </div>
      </div>

      {reconcileResult && (
        <p className={`text-sm ${reconcileResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
          {reconcileResult}
        </p>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Completed"
          value={String(completed.count)}
          sublabel={formatCurrency(completed.amount, "KES")}
          accent="text-green-400"
        />
        <StatCard
          label="Failed"
          value={String(failed.count)}
          sublabel={formatCurrency(failed.amount, "KES")}
          accent="text-red-400"
        />
        <StatCard
          label="Pending"
          value={String(pending.count)}
          sublabel={formatCurrency(pending.amount, "KES")}
          accent="text-yellow-400"
        />
        <StatCard
          label="Cancelled"
          value={String(cancelled.count)}
          sublabel={formatCurrency(cancelled.amount, "KES")}
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
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={docTypeFilter}
          onChange={(e) => setDocTypeFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-lagoon/50 focus:outline-none"
        >
          <option value="">All Document Types</option>
          <option value="Invoice">Invoice</option>
          <option value="Cash Sale">Cash Sale</option>
          <option value="Delivery Note">Delivery Note</option>
          <option value="Receipt">Receipt</option>
          <option value="Purchase Order">Purchase Order</option>
          <option value="Quotation">Quotation</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">M-Pesa Receipt</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-white/30">
                    <div className="h-4 w-4 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-white/20">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={`${p.documentType}-${p.id}`} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-lagoon bg-lagoon/10 rounded-full px-2 py-0.5">
                      {p.documentType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50 font-mono text-xs">{p.phoneNumber}</td>
                  <td className="px-4 py-3 text-white/70 font-medium">
                    {formatCurrency(p.amount, p.currency || "KES")}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">
                    {p.mpesaReceiptNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/30 text-xs truncate max-w-[200px]">
                    {p.resultDesc || "—"}
                  </td>
                </tr>
              ))
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
              onClick={() => fetchPayments(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded px-3 py-1.5 border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => fetchPayments(Math.min(pagination.totalPages, pagination.page + 1))}
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
