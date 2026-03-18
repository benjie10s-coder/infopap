// app/admin/users/page.tsx — User management page
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { DataTable, Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ExportButton } from "@/components/admin/ExportButton";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  businessName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  documentsCreated: number;
  documentsPaid: number;
  subscription: {
    plan: string;
    status: string;
    documentsLimit: number;
    documentsUsed: number;
    expiresAt: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const { adminFetch } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async (page: number, searchQuery: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (searchQuery) params.set("search", searchQuery);
      const res = await adminFetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchUsers(1, "");
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      label: "User",
      render: (row) => (
        <Link href={`/admin/users/${row.id}`} className="group flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-lagoon/20 flex items-center justify-center text-xs font-bold text-lagoon shrink-0">
            {row.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium group-hover:text-lagoon transition-colors truncate">
              {row.name || "Unnamed"}
            </p>
            <p className="text-[11px] text-white/30 truncate">{row.email}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "businessName",
      label: "Business",
      render: (row) => (
        <span className="text-white/50 truncate block max-w-[200px]">
          {row.businessName || "—"}
        </span>
      ),
    },
    {
      key: "subscription",
      label: "Plan",
      render: (row) =>
        row.subscription ? (
          <StatusBadge status={row.subscription.plan} />
        ) : (
          <span className="text-white/20 text-xs">Pay-as-you-go</span>
        ),
    },
    {
      key: "documentsCreated",
      label: "Docs",
      sortable: true,
      render: (row) => (
        <span className="text-white/70">
          {row.documentsCreated}
          <span className="text-white/20 ml-1">
            ({row.documentsPaid} paid)
          </span>
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      sortable: true,
      render: (row) => (
        <span className="text-white/40 text-xs">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Users</h1>
          <p className="text-sm text-white/30 mt-1">
            {pagination.totalItems} registered users
          </p>
        </div>
        <ExportButton
          data={users as unknown as Record<string, unknown>[]}
          filename="invopap-users"
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "businessName", label: "Business" },
            { key: "documentsCreated", label: "Documents" },
            { key: "documentsPaid", label: "Paid" },
            { key: "createdAt", label: "Joined" },
          ]}
        />
      </div>

      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={users as unknown as Record<string, unknown>[]}
        keyField="id"
        searchable
        searchPlaceholder="Search by name, email, or business..."
        onSearch={setSearch}
        loading={loading}
        serverPagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.totalItems,
          onPageChange: (p) => fetchUsers(p, search),
        }}
        emptyMessage="No users found"
      />
    </div>
  );
}
