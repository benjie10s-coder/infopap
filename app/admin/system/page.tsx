// app/admin/system/page.tsx — System health monitoring dashboard
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface ServiceHealth {
  service: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs: number;
  message: string;
}

interface HealthData {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  checkedAt: string;
  services: ServiceHealth[];
  metrics: {
    users: number;
    invoices: number;
    payments: number;
    subscriptions: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  HEALTHY: "text-green-400",
  DEGRADED: "text-yellow-400",
  DOWN: "text-red-400",
};

const STATUS_BG: Record<string, string> = {
  HEALTHY: "bg-green-400",
  DEGRADED: "bg-yellow-400",
  DOWN: "bg-red-400",
};

function LatencyBar({ ms }: { ms: number }) {
  const pct = Math.min(100, (ms / 3000) * 100);
  const color =
    ms < 500 ? "bg-green-400" : ms < 1500 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/40 font-mono w-12 text-right">{ms}ms</span>
    </div>
  );
}

export default function AdminSystemPage() {
  const { adminFetch } = useAdminAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [history, setHistory] = useState<
    Array<{ checkedAt: string; status: string; avgLatency: number }>
  >([]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/health");
      if (res.ok) {
        const data: HealthData = await res.json();
        setHealth(data);
        // Add to history (keep last 20)
        setHistory((prev) => {
          const avgLatency = data.services.reduce((s, sv) => s + sv.latencyMs, 0) / data.services.length;
          const entry = { checkedAt: data.checkedAt, status: data.status, avgLatency: Math.round(avgLatency) };
          return [...prev.slice(-19), entry];
        });
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-display font-bold text-white">System Health</h1>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${STATUS_BG[health.status]} animate-pulse`} />
            <span className={`text-sm font-semibold ${STATUS_COLORS[health.status]}`}>
              {health.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-white/30">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-lagoon focus:ring-lagoon/30"
            />
            Auto-refresh (60s)
          </label>
          <button
            onClick={fetchHealth}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            Check Now
          </button>
        </div>
      </div>

      {/* Last checked */}
      <p className="text-xs text-white/20">
        Last checked: {new Date(health.checkedAt).toLocaleString()}
      </p>

      {/* Service status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {health.services.map((service) => (
          <div
            key={service.service}
            className="rounded-xl bg-white/5 border border-white/10 p-5 hover:bg-white/[0.07] transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">{service.service}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{service.message}</p>
              </div>
              <StatusBadge status={service.status} />
            </div>
            <LatencyBar ms={service.latencyMs} />
          </div>
        ))}
      </div>

      {/* Database metrics */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Database Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-white">{health.metrics.users.toLocaleString()}</p>
            <p className="text-sm text-white/40">Users</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{health.metrics.invoices.toLocaleString()}</p>
            <p className="text-sm text-white/40">Invoices</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{health.metrics.payments.toLocaleString()}</p>
            <p className="text-sm text-white/40">Payments</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{health.metrics.subscriptions.toLocaleString()}</p>
            <p className="text-sm text-white/40">Subscriptions</p>
          </div>
        </div>
      </div>

      {/* Health check history */}
      {history.length > 1 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
            Recent Health Checks
          </h2>
          <div className="space-y-2">
            {[...history].reverse().map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${STATUS_BG[entry.status]}`} />
                  <span className="text-xs text-white/40">
                    {new Date(entry.checkedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium ${STATUS_COLORS[entry.status]}`}>
                    {entry.status}
                  </span>
                  <span className="text-xs text-white/30 font-mono">{entry.avgLatency}ms avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scalability notes */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Scalability Insights
        </h2>
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-lg leading-none mt-0.5">✓</span>
            <div>
              <p className="text-white/70 font-medium">Database Connection Pooling</p>
              <p className="text-white/30 text-xs">Supabase handles connection pooling via PgBouncer. Scales to thousands of concurrent connections.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-lg leading-none mt-0.5">✓</span>
            <div>
              <p className="text-white/70 font-medium">Serverless Architecture</p>
              <p className="text-white/30 text-xs">Next.js API routes on Railway/Vercel auto-scale horizontally. No fixed server capacity limits.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-lg leading-none mt-0.5">✓</span>
            <div>
              <p className="text-white/70 font-medium">Edge Caching</p>
              <p className="text-white/30 text-xs">Static assets and public document views leverage CDN caching. Admin stats cached for 30s.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className={`text-lg leading-none mt-0.5 ${
              health.services.find((s) => s.service === "Rate Limiter")?.status === "HEALTHY"
                ? "text-green-400"
                : "text-yellow-400"
            }`}>
              {health.services.find((s) => s.service === "Rate Limiter")?.status === "HEALTHY" ? "✓" : "⚠"}
            </span>
            <div>
              <p className="text-white/70 font-medium">Rate Limiting</p>
              <p className="text-white/30 text-xs">
                {health.services.find((s) => s.service === "Rate Limiter")?.status === "HEALTHY"
                  ? "Redis-backed rate limiting active. Protects against abuse."
                  : "Using in-memory fallback. Consider configuring Upstash Redis for distributed rate limiting."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg leading-none mt-0.5">⚠</span>
            <div>
              <p className="text-white/70 font-medium">Payment Processing</p>
              <p className="text-white/30 text-xs">
                M-Pesa STK Push is synchronous — max ~50 concurrent transactions.
                At high scale, consider queue-based payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
