// components/PdfCanvasViewer.tsx — Canvas-based PDF viewer (client-only)
// Uses react-pdf to render PDF pages as <canvas> elements.
// Optimised for mobile: renders all pages in a scrollable column,
// supports swipe-to-navigate and pinch-to-zoom via CSS touch-action.
"use client";

import { useCallback, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Use CDN-hosted worker matching the bundled pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfCanvasViewerProps {
  /** Raw PDF bytes — avoids blob-URL fetch and CSP issues */
  data: Uint8Array;
  /** If true the viewer shows at reduced opacity (parent is re-rendering the blob) */
  dimmed?: boolean;
  /** Outer container width in px — passed down so we can size pages */
  containerWidth: number;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_IDX = 2; // 100 %

export default function PdfCanvasViewer({
  data,
  dimmed,
  containerWidth,
}: PdfCanvasViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Touch / swipe state ───────────────────────────────────
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current || !scrollRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;

      // Only handle horizontal swipes (|dx| > 60px and |dx| > |dy|)
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        const el = scrollRef.current;
        const pageHeight = el.scrollHeight / (numPages || 1);
        if (dx < 0) {
          // Swipe left → next page
          el.scrollBy({ top: pageHeight, behavior: "smooth" });
        } else {
          // Swipe right → previous page
          el.scrollBy({ top: -pageHeight, behavior: "smooth" });
        }
      }
    },
    [numPages]
  );

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
    },
    []
  );

  const zoom = ZOOM_STEPS[zoomIdx];
  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  // Page width fills container (minus small padding)
  const pageWidth = containerWidth ? Math.floor(containerWidth * zoom - 16) : undefined;

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-xs select-none">
        {/* Page count */}
        <span className="tabular-nums text-slate-500">
          {numPages ? `${numPages} page${numPages > 1 ? "s" : ""}` : "Loading…"}
        </span>

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5">
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
      </div>

      {/* ── Scrollable PDF area — renders ALL pages ── */}
      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`overflow-auto bg-slate-50 flex flex-col items-center transition-opacity${
          dimmed ? " opacity-40" : ""
        }`}
        style={{
          maxHeight: "calc(100vh - 180px)",
          WebkitOverflowScrolling: "touch", // smooth scrolling on iOS
        }}
      >
        <Document
          file={{ data }}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
            </div>
          }
          className="py-2"
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="mb-2 shadow-sm">
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div
                    className="flex items-center justify-center bg-white"
                    style={{
                      width: pageWidth,
                      height: pageWidth ? pageWidth * 1.414 : 400,
                    }}
                  >
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
                  </div>
                }
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
