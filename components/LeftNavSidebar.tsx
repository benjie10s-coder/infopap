// components/LeftNavSidebar.tsx — Narrow icon rail + expanded overlay sidebar
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarState } from "@/lib/hooks/useSidebarState";

/* ── SVG Icons ── */
const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const DocsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const HomeIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

/* ── Navigation items ── */
const NAV_ITEMS = [
  {
    href: "/",
    label: "Create New",
    sublabel: "Invoice, receipt, quotation…",
    icon: PlusIcon,
    iconBg: "bg-ember/10 text-ember",
  },
  {
    href: "/dashboard/documents",
    label: "My Documents",
    sublabel: "View, download & share",
    icon: DocsIcon,
    iconBg: "bg-lagoon/10 text-lagoon",
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    sublabel: "",
    icon: HomeIcon,
    iconBg: "bg-mist text-ink/50",
  },
  {
    href: "/dashboard/settings",
    label: "Business Profile",
    sublabel: "Your business details",
    icon: BuildingIcon,
    iconBg: "bg-ember/10 text-ember",
  },
  {
    href: "/dashboard/subscription",
    label: "My Plan",
    sublabel: "Subscription & billing",
    icon: CreditCardIcon,
    iconBg: "bg-lagoon/10 text-lagoon",
  },
];

/**
 * Narrow icon rail — visible on dashboard & documents pages.
 * Icons navigate directly; the top hamburger opens the full overlay.
 */
export function NarrowSidebarRail() {
  const { open } = useSidebarState();
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-14 bottom-0 z-40 w-14 bg-white border-r border-mist flex flex-col items-center py-4 gap-1">
      {/* Expand button */}
      <button
        onClick={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink/40 hover:text-ink hover:bg-mist/50 transition-colors mb-4"
        aria-label="Expand navigation"
        title="Expand navigation"
      >
        <MenuIcon />
      </button>

      {/* Icon links */}
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? "bg-lagoon/10 text-lagoon"
                : "text-ink/40 hover:text-ink hover:bg-mist/50"
            }`}
            title={item.label}
          >
            <item.icon />
          </Link>
        );
      })}

    </div>
  );
}

/**
 * Expanded overlay sidebar — slides in from the left over the page.
 */
export function ExpandedSidebarOverlay() {
  const { isOpen, close } = useSidebarState();
  const pathname = usePathname();

  // Close sidebar when navigating
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Lock body scroll when open
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
            InvoSafi
          </Link>
          <button
            onClick={close}
            className="rounded-lg p-2 text-ink/30 hover:text-ink hover:bg-mist/50 transition-colors touch-target flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink/30">
            Actions
          </p>

          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors touch-target ${
                  isActive
                    ? "bg-lagoon/10 text-lagoon"
                    : "text-ink/70 hover:bg-mist/50 hover:text-ink"
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${item.iconBg}`}>
                  <item.icon />
                </span>
                <div>
                  <span className="block">{item.label}</span>
                  {item.sublabel && (
                    <span className="block text-[11px] text-ink/40 font-normal">{item.sublabel}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-mist">
          <p className="text-[11px] text-ink/30 leading-relaxed">
            Pay KSh 10 per download, or{" "}
            <Link
              href="/dashboard/subscription"
              onClick={close}
              className="text-lagoon hover:underline"
            >
              subscribe to a plan
            </Link>{" "}
            to save up to 57%.
          </p>
        </div>
      </nav>
    </div>
  );
}

