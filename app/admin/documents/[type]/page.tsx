// app/admin/documents/[type]/page.tsx — Per-type document browser
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ExportButton } from "@/components/admin/ExportButton";
import { formatCurrency } from "@/lib/utils/format";

interface Document {
  id: string;
  publicId: string;
  docType: string;
  number: string;
  toName: string;
  total: number | null;
  currency: string;
  isPaid: boolean;
  isGuest: boolean;
  createdAt: string;
}

export default function AdminDocumentTypePage() {
  const params = useParams();
  const { adminFetch } = useAdminAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const docType = decodeURIComponent(params.type as string);

  const fetchDocs = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: docType, page: String(page) });
      const res = await adminFetch(`/api/admin/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setPagination(data.pagination);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch, docType]);

  useEffect(() => {
    fetchDocs(1);
  }, [fetchDocs]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/documents" className="text-sm text-white/30 hover:text-white transition-colors">
            ← Back to Documents
          </Link>
          <h1 className="text-2xl font-display font-bold text-white mt-2">{docType}s</h1>
          <p className="text-sm text-white/30 mt-1">
            {pagination.totalItems} documents
          </p>
        </div>
        <ExportButton
          data={documents as unknown as Record<string, unknown>[]}
          filename={`invopap-${docType.toLowerCase().replace(/\s+/g, "-")}s`}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Number</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-white/30">
                    <div className="h-4 w-4 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-white/20">
                  No {docType.toLowerCase()}s found
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-white/70 font-mono text-xs">
                    {doc.number || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/50 truncate max-w-[250px]">
                    {doc.toName || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/70 font-medium">
                    {doc.total !== null ? formatCurrency(doc.total, doc.currency) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.isPaid ? "PAID" : "UNPAID"} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      doc.isGuest
                        ? "bg-orange-500/10 text-orange-400"
                        : "bg-lagoon/10 text-lagoon"
                    }`}>
                      {doc.isGuest ? "Guest" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {new Date(doc.createdAt).toLocaleDateString()}
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
              onClick={() => fetchDocs(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded px-3 py-1.5 border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => fetchDocs(Math.min(pagination.totalPages, pagination.page + 1))}
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
