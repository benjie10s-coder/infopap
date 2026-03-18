// components/AdminSidebar.tsx — Admin sidebar: narrow icon rail + expanded overlay
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";

/* ── SVG Icons ─────────────────────────────────────────────────────────────── */

const DashboardIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm-10 9a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zm10-2a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const SubscriptionIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const PaymentIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const HeartbeatIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const FlagIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

const AuditIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const MenuIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

/* ── Navigation items ─────────────────────────────────────────────────────── */

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType;
  badge?: number;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        sublabel: "KPIs & analytics",
        icon: DashboardIcon,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        sublabel: "Accounts & profiles",
        icon: UsersIcon,
      },
      {
        href: "/admin/subscriptions",
        label: "Subscriptions",
        sublabel: "Plans & billing",
        icon: SubscriptionIcon,
      },
      {
        href: "/admin/payments",
        label: "Payments",
        sublabel: "Transactions & M-Pesa",
        icon: PaymentIcon,
      },
      {
        href: "/admin/documents",
        label: "Documents",
        sublabel: "All document types",
        icon: DocumentIcon,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/admin/system",
        label: "System Health",
        sublabel: "Monitoring & uptime",
        icon: HeartbeatIcon,
      },
      {
        href: "/admin/features",
        label: "Feature Flags",
        sublabel: "Toggle capabilities",
        icon: FlagIcon,
      },
      {
        href: "/admin/audit",
        label: "Audit Log",
        sublabel: "Admin activity trail",
        icon: AuditIcon,
      },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

/* ── Badge data hook ─────────────────────────────────────────────────────── */

function useBadges() {
  const { adminFetch } = useAdminAuth();
  const [badges, setBadges] = useState<Record<string, number>>({});

  const fetchBadges = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/badges");
      if (res.ok) {
        const data = await res.json();
        setBadges({
          "/admin/payments": data.payments || 0,
          "/admin/subscriptions": data.subscriptions || 0,
        });
      }
    } catch {
      // Silently fail
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 60_000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [fetchBadges]);

  return badges;
}

/* ── Narrow icon rail ─────────────────────────────────────────────────────── */

export function AdminSidebarRail({
  onExpand,
}: {
  onExpand: () => void;
}) {
  const pathname = usePathname();
  const badges = useBadges();

  return (
    <div className="fixed left-0 top-14 bottom-0 z-40 w-14 bg-ink border-r border-white/10 flex flex-col items-center py-4 gap-1">
      <button
        onClick={onExpand}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors mb-4"
        aria-label="Expand navigation"
        title="Expand navigation"
      >
        <MenuIcon />
      </button>

      {ALL_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const badge = badges[item.href] || 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? "bg-lagoon/20 text-lagoon"
                : "text-white/40 hover:text-white hover:bg-white/10"
            }`}
            title={item.label}
          >
            <item.icon />
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/* ── Expanded overlay sidebar ─────────────────────────────────────────────── */

export function AdminSidebarOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();

  // Close on navigation
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll
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
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 sidebar-backdrop-enter"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <nav className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-ink border-r border-white/10 shadow-soft sidebar-drawer-enter flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <Link href="/admin" className="text-xl font-display font-bold text-lagoon" onClick={onClose}>
            Invopap Admin
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/30 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navigation sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-lagoon/15 text-lagoon"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        isActive ? "bg-lagoon/20 text-lagoon" : "bg-white/5 text-white/40"
                      }`}>
                        <item.icon />
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">{item.label}</span>
                        <span className="block text-[11px] text-white/30 font-normal truncate">
                          {item.sublabel}
                        </span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/20 px-1.5 text-[10px] font-bold text-red-400">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <LogoutIcon />
            </span>
            Sign Out
          </button>
        </div>
      </nav>
    </div>
  );
}
