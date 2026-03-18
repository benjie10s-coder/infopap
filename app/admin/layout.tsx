// app/admin/layout.tsx — Admin layout with sidebar, auth gate, and dark theme
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminAuthContext, useAdminAuthProvider, useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { AdminSidebarRail, AdminSidebarOverlay } from "@/components/AdminSidebar";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { ToastProvider } from "@/components/admin/Toast";

/* ── Auth gate (login form) ────────────────────────────────────────────────── */

function AdminLoginGate() {
  const { login, loading, error } = useAdminAuth();
  const [secret, setSecret] = useState("");

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-white">
            Admin Dashboard
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Enter your admin secret to continue
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await login(secret);
          }}
          className="space-y-4"
        >
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin Secret"
            className="w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lagoon focus:outline-none focus:ring-1 focus:ring-lagoon/30"
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full rounded-lg bg-lagoon px-4 py-3 text-white font-medium hover:bg-lagoon/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Access Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Admin header ──────────────────────────────────────────────────────────── */

function AdminHeader({ onRefresh }: { onRefresh?: () => void }) {
  const { logout } = useAdminAuth();
  const pathname = usePathname();

  // Build breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur-sm">
      <div className="flex items-center justify-between pl-16 pr-6 h-14">
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((b) =>
            b.isLast ? (
              <span key={b.href} className="text-white font-medium">
                {b.label}
              </span>
            ) : (
              <span key={b.href} className="flex items-center gap-2">
                <Link
                  href={b.href}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  {b.label}
                </Link>
                <span className="text-white/20">/</span>
              </span>
            )
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Cmd+K hint */}
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/30 hover:text-white/50 hover:border-white/20 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="ml-1 rounded border border-white/10 bg-white/5 px-1 text-[10px]">
              {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘" : "Ctrl+"}K
            </kbd>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors"
            >
              Refresh
            </button>
          )}
          <button
            onClick={logout}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

/* ── Authenticated admin shell ─────────────────────────────────────────────── */

function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-ink text-white">
        <AdminSidebarRail onExpand={openSidebar} />
        <AdminSidebarOverlay isOpen={sidebarOpen} onClose={closeSidebar} />
        <AdminHeader />
        <CommandPalette />
        <main className="pl-14">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}

/* ── Layout root ───────────────────────────────────────────────────────────── */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAdminAuthProvider();

  return (
    <AdminAuthContext.Provider value={auth}>
      {auth.loading ? (
        <div className="min-h-screen bg-ink flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
        </div>
      ) : auth.isAuthenticated ? (
        <AdminShell>{children}</AdminShell>
      ) : (
        <AdminLoginGate />
      )}
    </AdminAuthContext.Provider>
  );
}
