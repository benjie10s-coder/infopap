// components/PdfCanvasViewer.tsx — Inner canvas viewer (client-only, loaded via dynamic import)
// Isolates all react-pdf / pdfjs-dist imports so Next.js 14 webpack doesn't choke on the ESM module.
"use client";

import { useCallback, useState } from "react";
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
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setPageNumber(1);
    },
    []
  );

  const zoom = ZOOM_STEPS[zoomIdx];
  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-xs select-none">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="rounded px-1.5 py-0.5 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="tabular-nums text-slate-500">
            {pageNumber} / {numPages || "–"}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="rounded px-1.5 py-0.5 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            ›
          </button>
        </div>

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

      {/* ── Scrollable PDF area ── */}
      <div
        className={`overflow-auto bg-slate-50 flex justify-center transition-opacity${
          dimmed ? " opacity-40" : ""
        }`}
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        <Document
          file={{ data }}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={null}
          className="py-4"
        >
          <Page
            pageNumber={pageNumber}
            width={containerWidth ? containerWidth * zoom - 32 : undefined}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
}
