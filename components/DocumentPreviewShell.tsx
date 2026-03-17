// components/DocumentPreviewShell.tsx — Paper-like container with zoom controls
"use client";

import { useState, type ReactNode } from "react";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_IDX = 2; // 100%

interface DocumentPreviewShellProps {
  children: ReactNode;
  className?: string;
}

export function DocumentPreviewShell({
  children,
  className,
}: DocumentPreviewShellProps) {
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);
  const zoom = ZOOM_STEPS[zoomIdx];
  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  const containerClass =
    className ??
    "relative bg-white rounded-xl shadow-soft border border-mist overflow-hidden";

  return (
    <div className={containerClass}>
      {/* Zoom toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-end gap-2 bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-xs select-none">
        <button
          onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
          disabled={!canZoomOut}
          className="rounded px-1.5 py-0.5 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="tabular-nums text-slate-500 w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() =>
            setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
          }
          disabled={!canZoomIn}
          className="rounded px-1.5 py-0.5 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      {/* Scrollable content area */}
      <div
        className="overflow-auto bg-slate-50"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            width: `${100 / zoom}%`,
          }}
        >
          {/* A4 paper */}
          <div className="mx-auto my-6 bg-white shadow-lg" style={{ width: 595, minHeight: 842 }}>
            <div className="relative p-10 text-[#1a1a1a]" style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 10 }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
