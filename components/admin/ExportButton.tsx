// components/admin/ExportButton.tsx — CSV/JSON export button for admin tables
"use client";

import { useState } from "react";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; label: string }[];
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(data: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (data.length === 0) return "";
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);
  const headers = columns ? columns.map((c) => c.label) : keys;

  const escapeField = (val: unknown): string => {
    const str = val == null ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((row) => keys.map((k) => escapeField(row[k])).join(","));
  return [headers.map(escapeField).join(","), ...rows].join("\n");
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 rounded-lg border border-white/10 bg-ink shadow-soft py-1 min-w-[100px]">
            <button
              onClick={() => {
                downloadFile(toCsv(data, columns), `${filename}.csv`, "text/csv");
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              CSV
            </button>
            <button
              onClick={() => {
                downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, "application/json");
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
