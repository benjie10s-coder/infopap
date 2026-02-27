// components/PdfPreview.tsx — PDF preview with zoom controls
// Uses BlobProvider to generate a blob URL, rendered in an iframe.
// Zoom is handled via CSS transform on the iframe wrapper.
"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import dynamic from "next/dynamic";

const BlobProvider = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.BlobProvider),
  { ssr: false }
);

interface PdfPreviewProps {
  document: ReactElement;
  className?: string;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_IDX = 2; // 100 %

export function PdfPreview({ document: doc, className }: PdfPreviewProps) {
  // ─── Debounced document (800 ms) ────────────────────────────
  const [deferredDoc, setDeferredDoc] = useState<ReactElement>(doc);
  const [isStale, setIsStale] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setIsStale(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDeferredDoc(doc);
      setIsStale(false);
    }, 800);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // ─── Zoom ──────────────────────────────────────────────
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);
  const zoom = ZOOM_STEPS[zoomIdx];
  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  const containerClass =
    className ??
    "relative bg-white rounded-xl shadow-soft border border-mist overflow-hidden";

  return (
    <div className={containerClass}>
      {/* ── Zoom toolbar ── */}
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

      <BlobProvider document={deferredDoc}>
        {({ url, loading, error }) => (
          <>
            {/* Loading overlay */}
            {(loading || isStale) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                <span className="text-sm text-ink/40">Generating preview…</span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
                <span className="text-sm text-red-500">Preview unavailable</span>
              </div>
            )}

            {/* PDF iframe with CSS zoom */}
            {url && (
              <div
                className="overflow-auto"
                style={{ maxHeight: "calc(100vh - 180px)" }}
              >
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                    width: `${100 / zoom}%`,
                  }}
                >
                  <iframe
                    src={`${url}#toolbar=0`}
                    title="Document preview"
                    className={`w-full border-0 transition-opacity${
                      loading || isStale ? " opacity-40" : ""
                    }`}
                    style={{ height: `${1120 / zoom}px` }}
                  />
                </div>
              </div>
            )}

            {/* Placeholder */}
            {!url && !error && (
              <div className="h-[800px] sm:h-[1120px] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-mist border-t-lagoon" />
              </div>
            )}
          </>
        )}
      </BlobProvider>
    </div>
  );
}
