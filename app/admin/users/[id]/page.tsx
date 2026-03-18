// app/admin/users/[id]/page.tsx — User detail page
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatCurrency } from "@/lib/utils/format";

interface UserDetail {
  user: Record<string, string | null>;
  documents: Array<{
    id: string;
    publicId: string;
    docType: string;
    number: string;
    toName: string;
    total: number;
    currency: string;
    isPaid: boolean;
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    plan: string;
    status: string;
    documentsLimit: number;
    documentsUsed: number;
    amountPaid: number;
    purchasedAt: string;
    expiresAt: string;
    mpesaReceiptNumber: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    phoneNumber: string;
    mpesaReceiptNumber: string | null;
    createdAt: string;
  }>;
  stats: {
    totalDocuments: number;
    paidDocuments: number;
    totalRevenue: number;
  };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const { adminFetch } = useAdminAuth();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"documents" | "subscriptions" | "payments">("documents");

  const userId = params.id as string;

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch, userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-white/30">
        User not found
      </div>
    );
  }

  const { user, documents, subscriptions, payments, stats } = data;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Back link */}
      <Link href="/admin/users" className="text-sm text-white/30 hover:text-white transition-colors">
        ← Back to Users
      </Link>

      {/* User header */}
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-full bg-lagoon/20 flex items-center justify-center text-xl font-bold text-lagoon shrink-0">
          {user.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {user.name || "Unnamed User"}
          </h1>
          <p className="text-sm text-white/40">{user.email}</p>
          {user.businessName && (
            <p className="text-sm text-white/30 mt-1">{user.businessName}</p>
          )}
          <p className="text-xs text-white/20 mt-1">
            Joined {new Date(user.createdAt || "").toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* User stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={String(stats.totalDocuments)} />
        <StatCard label="Paid Documents" value={String(stats.paidDocuments)} />
        <StatCard
          label="Revenue Generated"
          value={formatCurrency(stats.totalRevenue, "KES")}
          accent="text-green-400"
        />
        <StatCard
          label="Active Plan"
          value={subscriptions.find((s) => s.status === "ACTIVE")?.plan || "None"}
        />
      </div>

      {/* Business details */}
      {(user.businessName || user.businessEmail || user.businessPhone || user.businessAddress) && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
            Business Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {user.businessName && (
              <div>
                <span className="text-white/30">Company</span>
                <p className="text-white/70">{user.businessName}</p>
              </div>
            )}
            {user.businessEmail && (
              <div>
                <span className="text-white/30">Email</span>
                <p className="text-white/70">{user.businessEmail}</p>
              </div>
            )}
            {user.businessPhone && (
              <div>
                <span className="text-white/30">Phone</span>
                <p className="text-white/70">{user.businessPhone}</p>
              </div>
            )}
            {user.businessAddress && (
              <div>
                <span className="text-white/30">Address</span>
                <p className="text-white/70">
                  {user.businessAddress}
                  {user.businessCity && `, ${user.businessCity}`}
                </p>
              </div>
            )}
            {user.businessNumber && (
              <div>
                <span className="text-white/30">Business Number</span>
                <p className="text-white/70">{user.businessNumber}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex gap-6">
          {(["documents", "subscriptions", "payments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-lagoon text-lagoon"
                  : "border-transparent text-white/30 hover:text-white/60"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1.5 text-xs text-white/20">
                ({tab === "documents"
                  ? documents.length
                  : tab === "subscriptions"
                  ? subscriptions.length
                  : payments.length})
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "documents" && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/20">
                    No documents
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-lagoon bg-lagoon/10 rounded-full px-2 py-0.5">
                        {doc.docType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70 font-mono text-xs">{doc.number}</td>
                    <td className="px-4 py-3 text-white/50 truncate max-w-[200px]">{doc.toName || "—"}</td>
                    <td className="px-4 py-3 text-white/70">
                      {doc.total ? formatCurrency(doc.total, doc.currency || "KES") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.isPaid ? "PAID" : "UNPAID"} />
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
      )}

      {activeTab === "subscriptions" && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
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
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/20">
                    No subscriptions
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white font-medium">{sub.plan}</td>
                    <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                    <td className="px-4 py-3 text-white/70">
                      {sub.documentsUsed}/{sub.documentsLimit}
                      <span className="text-white/20 ml-1">
                        ({sub.documentsLimit > 0 ? Math.round((sub.documentsUsed / sub.documentsLimit) * 100) : 0}%)
                      </span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30">M-Pesa Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-white/20">
                    No payments
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatCurrency(p.amount, p.currency || "KES")}
                    </td>
                    <td className="px-4 py-3 text-white/40 font-mono text-xs">{p.phoneNumber}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-white/40 font-mono text-xs">
                      {p.mpesaReceiptNumber || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
