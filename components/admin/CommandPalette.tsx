// components/admin/CommandPalette.tsx — Cmd+K quick navigation palette
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Command {
  id: string;
  label: string;
  sublabel: string;
  section: string;
  href: string;
  shortcut?: string;
}

const COMMANDS: Command[] = [
  { id: "dashboard", label: "Dashboard", sublabel: "KPIs & analytics overview", section: "Overview", href: "/admin" },
  { id: "users", label: "Users", sublabel: "Accounts & profiles management", section: "Management", href: "/admin/users" },
  { id: "subscriptions", label: "Subscriptions", sublabel: "Plans & billing management", section: "Management", href: "/admin/subscriptions" },
  { id: "payments", label: "Payments", sublabel: "Transactions & M-Pesa reconciliation", section: "Management", href: "/admin/payments" },
  { id: "documents", label: "Documents", sublabel: "Document analytics & browsing", section: "Management", href: "/admin/documents" },
  { id: "system", label: "System Health", sublabel: "Monitoring, uptime & latency", section: "System", href: "/admin/system" },
  { id: "features", label: "Feature Flags", sublabel: "Toggle platform capabilities", section: "System", href: "/admin/features" },
  { id: "audit", label: "Audit Log", sublabel: "Admin activity trail", section: "System", href: "/admin/audit" },
  { id: "doc-invoices", label: "Invoices", sublabel: "Browse all invoices", section: "Documents", href: "/admin/documents/Invoice" },
  { id: "doc-receipts", label: "Receipts", sublabel: "Browse all receipts", section: "Documents", href: "/admin/documents/Receipt" },
  { id: "doc-quotations", label: "Quotations", sublabel: "Browse all quotations", section: "Documents", href: "/admin/documents/Quotation" },
  { id: "doc-cashsales", label: "Cash Sales", sublabel: "Browse all cash sales", section: "Documents", href: "/admin/documents/CashSale" },
  { id: "doc-delivery", label: "Delivery Notes", sublabel: "Browse all delivery notes", section: "Documents", href: "/admin/documents/DeliveryNote" },
  { id: "doc-po", label: "Purchase Orders", sublabel: "Browse all purchase orders", section: "Documents", href: "/admin/documents/PurchaseOrder" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.sublabel.toLowerCase().includes(query.toLowerCase()) ||
          c.section.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  // Group by section
  const sections = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.section]) acc[cmd.section] = [];
    acc[cmd.section].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(sections).flat();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatFiltered[selectedIndex]) {
      navigate(flatFiltered[selectedIndex].href);
    }
  };

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Dialog */}
      <div className="relative mx-auto mt-[15vh] w-full max-w-lg">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-ink shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-white/10 px-4">
            <svg className="h-4 w-4 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search pages..."
              className="flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            <kbd className="hidden sm:flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {flatFiltered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/30">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              Object.entries(sections).map(([section, commands]) => (
                <div key={section}>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/20">
                    {section}
                  </p>
                  {commands.map((cmd) => {
                    const idx = flatIndex++;
                    return (
                      <button
                        key={cmd.id}
                        data-index={idx}
                        onClick={() => navigate(cmd.href)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          idx === selectedIndex
                            ? "bg-lagoon/15 text-lagoon"
                            : "text-white/60 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="block font-medium truncate">{cmd.label}</span>
                          <span className="block text-[11px] text-white/30 truncate">{cmd.sublabel}</span>
                        </div>
                        <svg className="h-3 w-3 text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 text-[10px] text-white/20">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1">↵</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
