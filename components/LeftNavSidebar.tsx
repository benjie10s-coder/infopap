// components/LeftNavSidebar.tsx — Global left navigation sidebar (overlay/drawer)
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarState } from "@/lib/hooks/useSidebarState";

export function LeftNavSidebar() {
  const { isOpen, close } = useSidebarState();
  const pathname = usePathname();

  // Close sidebar when navigating to a new page
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 sidebar-backdrop-enter"
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <nav className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white border-r border-mist shadow-soft sidebar-drawer-enter flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist">
          <Link
            href="/"
            className="text-xl font-display font-bold text-lagoon"
            onClick={close}
          >
            Invopap
          </Link>
          <button
            onClick={close}
            className="rounded-lg p-2 text-ink/30 hover:text-ink hover:bg-mist/50 transition-colors touch-target flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {/* Section label */}
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink/30">
            Actions
          </p>

          {/* Create New Document */}
          <Link
            href="/"
            onClick={close}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors touch-target ${
              pathname === "/"
                ? "bg-lagoon/10 text-lagoon"
                : "text-ink/70 hover:bg-mist/50 hover:text-ink"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember/10 text-ember shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <div>
              <span className="block">Create New Document</span>
              <span className="block text-[11px] text-ink/40 font-normal">Invoice, receipt, quotation…</span>
            </div>
          </Link>

          {/* View Documents */}
          <Link
            href="/dashboard/documents"
            onClick={close}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors touch-target ${
              pathname === "/dashboard/documents"
                ? "bg-lagoon/10 text-lagoon"
                : "text-ink/70 hover:bg-mist/50 hover:text-ink"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lagoon/10 text-lagoon shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <div>
              <span className="block">My Documents</span>
              <span className="block text-[11px] text-ink/40 font-normal">View, download &amp; share</span>
            </div>
          </Link>

          {/* Dashboard */}
          <Link
            href="/dashboard"
            onClick={close}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors touch-target ${
              pathname === "/dashboard"
                ? "bg-lagoon/10 text-lagoon"
                : "text-ink/70 hover:bg-mist/50 hover:text-ink"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mist text-ink/50 shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </span>
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Footer note */}
        <div className="px-5 py-4 border-t border-mist">
          <p className="text-[11px] text-ink/30 leading-relaxed">
            Documents are charged a flat rate of KSh 10 on first download via M-Pesa.
          </p>
        </div>
      </nav>
    </div>
  );
}

/** Hamburger toggle button — use in headers to open the sidebar */
export function SidebarToggleButton({ className }: { className?: string }) {
  const { toggle } = useSidebarState();

  return (
    <button
      onClick={toggle}
      className={`rounded-lg p-2 text-ink/50 hover:text-ink hover:bg-mist/50 transition-colors touch-target flex items-center justify-center ${className || ""}`}
      aria-label="Toggle navigation"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
