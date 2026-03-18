// app/admin/documents/page.tsx — Document analytics dashboard
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ExportButton } from "@/components/admin/ExportButton";
import { formatCurrency } from "@/lib/utils/format";
import dynamic from "next/dynamic";

const DocumentCharts = dynamic(() => import("./DocumentCharts"), { ssr: false });

interface TypeStat {
  type: string;
  total: number;
  paid: number;
  unpaid: number;
  guest: number;
  authenticated: number;
  totalRevenue: number;
}

interface RecentDoc {
  id: string;
  publicId: string;
  docType: string;
  number: string;
  toName: string;
  total: number | null;
  currency: string;
  isPaid: boolean;
  createdAt: string;
}

interface TopGenerator {
  userId: string;
  name: string;
  email: string;
  docCount: number;
}

export default function AdminDocumentsPage() {
  const { adminFetch } = useAdminAuth();
  const [typeStats, setTypeStats] = useState<TypeStat[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [topGenerators, setTopGenerators] = useState<TopGenerator[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/documents");
      if (res.ok) {
        const data = await res.json();
        setTypeStats(data.typeStats || []);
        setRecentDocs(data.recentDocuments || []);
        setTopGenerators(data.topGenerators || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const grandTotal = typeStats.reduce((s, t) => s + t.total, 0);
  const grandPaid = typeStats.reduce((s, t) => s + t.paid, 0);
  const grandUnpaid = typeStats.reduce((s, t) => s + t.unpaid, 0);
  const grandGuest = typeStats.reduce((s, t) => s + t.guest, 0);
  const grandRevenue = typeStats.reduce((s, t) => s + t.totalRevenue, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Documents</h1>
          <p className="text-sm text-white/30 mt-1">
            Analytics across all {typeStats.length} document types
          </p>
        </div>
        <ExportButton
          data={typeStats as unknown as Record<string, unknown>[]}
          filename="invosafi-document-stats"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Documents" value={grandTotal.toLocaleString()} />
        <StatCard label="Paid" value={grandPaid.toLocaleString()} accent="text-green-400" />
        <StatCard label="Unpaid" value={grandUnpaid.toLocaleString()} accent="text-yellow-400" />
        <StatCard
          label="Guest Docs"
          value={grandGuest.toLocaleString()}
          sublabel={grandTotal > 0 ? `${((grandGuest / grandTotal) * 100).toFixed(0)}% of total` : "0%"}
        />
        <StatCard label="Document Revenue" value={formatCurrency(grandRevenue, "KES")} accent="text-green-400" />
      </div>

      {/* Per-type breakdown table */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Breakdown by Type
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/30">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/30">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/30">Unpaid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/30">Guest</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/30">Auth</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/30">Revenue</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {typeStats.map((stat) => (
                <tr key={stat.type} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-lagoon bg-lagoon/10 rounded-full px-2.5 py-0.5">
                      {stat.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white/70 font-medium">{stat.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-400">{stat.paid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">{stat.unpaid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-white/40">{stat.guest.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-white/40">{stat.authenticated.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-white/70">
                    {stat.totalRevenue > 0 ? formatCurrency(stat.totalRevenue, "KES") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/documents/${encodeURIComponent(stat.type)}`}
                      className="text-xs text-lagoon hover:text-lagoon/80 transition-colors"
                    >
                      Browse →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <DocumentCharts typeStats={typeStats} />

      {/* Top document generators */}
      {topGenerators.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
            Top Document Generators
          </h2>
          <div className="space-y-2">
            {topGenerators.map((gen, i) => (
              <div key={gen.userId} className="flex items-center gap-4 py-2">
                <span className="text-xs font-bold text-white/20 w-5 text-right">{i + 1}</span>
                <Link
                  href={`/admin/users/${gen.userId}`}
                  className="flex-1 min-w-0 group"
                >
                  <p className="text-sm text-white/70 group-hover:text-lagoon transition-colors truncate">
                    {gen.name}
                  </p>
                  <p className="text-[11px] text-white/30 truncate">{gen.email}</p>
                </Link>
                <span className="text-sm font-medium text-white/70">{gen.docCount} docs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent documents feed */}
      {recentDocs.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
            Recent Documents
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Number</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white/30">To</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentDocs.map((doc) => (
                  <tr key={`${doc.docType}-${doc.id}`} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-2">
                      <span className="text-xs font-medium text-lagoon bg-lagoon/10 rounded-full px-2 py-0.5">
                        {doc.docType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-white/70 font-mono text-xs">{doc.number || "—"}</td>
                    <td className="px-4 py-2 text-white/50 truncate max-w-[200px]">{doc.toName || "—"}</td>
                    <td className="px-4 py-2 text-white/70">
                      {doc.total !== null ? formatCurrency(doc.total, doc.currency || "KES") : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={doc.isPaid ? "PAID" : "UNPAID"} />
                    </td>
                    <td className="px-4 py-2 text-white/40 text-xs">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
