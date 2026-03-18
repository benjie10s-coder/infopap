// app/admin/page.tsx — Enhanced admin dashboard overview with KPIs + charts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { StatCard } from "@/components/admin/StatCard";
import { formatCurrency } from "@/lib/utils/format";
import dynamic from "next/dynamic";

// Lazy-load chart components to keep initial bundle small
const OverviewCharts = dynamic(() => import("./OverviewCharts"), { ssr: false });

interface PlatformStats {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalRevenue: number;
  failedPayments: number;
  cancelledPayments: number;
  activeUsers: number;
  guestInvoices: number;
  invoicesToday: number;
  paymentsToday: number;
  revenueToday: number;
  invoicesThisMonth: number;
  paymentsThisMonth: number;
}

type RefreshInterval = 15 | 30 | 60 | 0;

export default function AdminDashboardPage() {
  const { adminFetch } = useAdminAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(30);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        adminFetch("/api/admin/stats"),
        adminFetch("/api/admin/analytics"),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
        setLastRefreshed(new Date());
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch {
      // Silently fail on refresh — stats remain from last successful fetch
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;
    const interval = setInterval(fetchStats, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchStats]);

  // Reconcile payments action
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);

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
        setReconcileResult(`Reconciled ${data.summary?.reconciled || 0} of ${data.summary?.total || 0} payments`);
        fetchStats();
      } else {
        setReconcileResult(`Error: ${data.error || "Failed"}`);
      }
    } catch {
      setReconcileResult("Network error");
    } finally {
      setReconciling(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const conversionRate = stats.totalInvoices > 0
    ? ((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(1)
    : "0";

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Top bar with refresh controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            Platform Overview
          </h1>
          {lastRefreshed && (
            <p className="text-xs text-white/20 mt-1">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Auto</span>
            {([15, 30, 60, 0] as RefreshInterval[]).map((val) => (
              <button
                key={val}
                onClick={() => setRefreshInterval(val)}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  refreshInterval === val
                    ? "bg-lagoon/20 text-lagoon"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {val === 0 ? "Off" : `${val}s`}
              </button>
            ))}
          </div>

          <button
            onClick={fetchStats}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Today's highlights */}
      <div className="rounded-xl bg-lagoon/10 border border-lagoon/20 p-6">
        <h2 className="text-sm font-semibold text-lagoon uppercase tracking-wider mb-4">
          Today
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-3xl font-bold text-white">{stats.invoicesToday}</p>
            <p className="text-sm text-white/40">Documents created</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{stats.paymentsToday}</p>
            <p className="text-sm text-white/40">Downloads paid</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(stats.revenueToday, "KES")}
            </p>
            <p className="text-sm text-white/40">Revenue today</p>
          </div>
        </div>
      </div>

      {/* This month highlights */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          This Month
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-2xl font-bold text-white">{stats.invoicesThisMonth}</p>
            <p className="text-sm text-white/40">Documents created</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.paymentsThisMonth}</p>
            <p className="text-sm text-white/40">Payments completed</p>
          </div>
        </div>
      </div>

      {/* All-time stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={String(stats.totalInvoices)} />
        <StatCard label="Paid Downloads" value={String(stats.paidInvoices)} />
        <StatCard label="Unpaid Documents" value={String(stats.unpaidInvoices)} />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue, "KES")}
          accent="text-green-400"
        />
        <StatCard
          label="Failed Payments"
          value={String(stats.failedPayments)}
          accent={stats.failedPayments > 0 ? "text-red-400" : undefined}
        />
        <StatCard
          label="Cancelled Payments"
          value={String(stats.cancelledPayments)}
          accent={stats.cancelledPayments > 0 ? "text-yellow-400" : undefined}
        />
        <StatCard label="Active Users" value={String(stats.activeUsers)} />
        <StatCard
          label="Guest Documents"
          value={String(stats.guestInvoices)}
          sublabel={`${stats.totalInvoices > 0 ? ((stats.guestInvoices / stats.totalInvoices) * 100).toFixed(0) : 0}% of total`}
        />
        <StatCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          accent={Number(conversionRate) > 50 ? "text-green-400" : Number(conversionRate) > 20 ? "text-yellow-400" : "text-red-400"}
        />
      </div>

      {/* Revenue breakdown */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Revenue Breakdown
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">Gross revenue (all-time)</span>
            <span className="text-white font-medium">
              {formatCurrency(stats.totalRevenue, "KES")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Today&apos;s revenue</span>
            <span className="text-green-400 font-medium">
              {formatCurrency(stats.revenueToday, "KES")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Potential (unpaid documents × KSh 10)</span>
            <span className="text-white/40">
              {formatCurrency(stats.unpaidInvoices * 10, "KES")}
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-white/5">
            <span className="text-white/60">Lost to failures</span>
            <span className="text-red-400 font-medium">
              {formatCurrency(stats.failedPayments * 10, "KES")}
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <OverviewCharts analytics={analytics} />

      {/* Quick actions */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="rounded-lg bg-lagoon/15 border border-lagoon/20 px-4 py-2.5 text-sm text-lagoon font-medium hover:bg-lagoon/25 transition-colors disabled:opacity-50"
          >
            {reconciling ? "Reconciling..." : "Reconcile Payments"}
          </button>
        </div>
        {reconcileResult && (
          <p className={`mt-3 text-sm ${reconcileResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {reconcileResult}
          </p>
        )}
      </div>
    </div>
  );
}
