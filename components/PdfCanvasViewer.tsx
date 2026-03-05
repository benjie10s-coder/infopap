// components/PdfCanvasViewer.tsx — Canvas-based PDF viewer (client-only)
// Loads pdf.js directly from CDN to render PDF pages as <canvas> elements.
// This avoids ALL webpack/worker bundling issues that plagued react-pdf.
// Optimised for mobile: renders all pages in a scrollable column,
// supports swipe-to-navigate and pinch-to-zoom via CSS touch-action.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Minimal pdf.js type definitions ──────────────────────────
interface PDFPageViewport {
  width: number;
  height: number;
}

interface PDFPageProxy {
  getViewport(params: { scale: number }): PDFPageViewport;
  render(params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFPageViewport;
  }): { promise: Promise<void> };
}

interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
  destroy(): void;
}

interface PDFJSLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(source: { data: Uint8Array }): {
    promise: Promise<PDFDocumentProxy>;
  };
}

// ─── Load pdf.js from CDN (completely bypasses webpack) ───────
const PDFJS_CDN = "https://unpkg.com/pdfjs-dist@4.9.124/build";

let _pdfjsPromise: Promise<PDFJSLib> | null = null;

function loadPdfJs(): Promise<PDFJSLib> {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = (
    import(
      /* webpackIgnore: true */
      "https://unpkg.com/pdfjs-dist@4.9.124/build/pdf.min.mjs"
    ) as Promise<PDFJSLib>
  ).then((mod: any) => {
    const lib: PDFJSLib = mod.default ?? mod;
    lib.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@4.9.124/build/pdf.worker.min.mjs";
    return lib;
  });
  return _pdfjsPromise;
}

// ─── Component ───────────────────────────────────────────────
interface PdfCanvasViewerProps {
  /** Raw PDF bytes */
  data: Uint8Array;
  /** If true the viewer shows at reduced opacity (parent is re-rendering the blob) */
  dimmed?: boolean;
  /** Outer container width in px */
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);

  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const pageRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const renderGen = useRef(0);
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
        el.scrollBy({
          top: dx < 0 ? pageHeight : -pageHeight,
          behavior: "smooth",
        });
      }
    },
    [numPages]
  );

  const zoom = ZOOM_STEPS[zoomIdx];
  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  // ─── Load PDF document from CDN-loaded pdf.js ──────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setNumPages(0);

    loadPdfJs()
      .then((pdfjs) => {
        if (cancelled) return;
        return pdfjs.getDocument({ data }).promise;
      })
      .then((doc) => {
        if (cancelled || !doc) return;
        pdfDocRef.current?.destroy();
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PdfCanvasViewer] Load error:", err);
        setLoadError(err?.message ?? "Failed to load PDF");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  // ─── Render all pages to canvases ──────────────────────────
  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || numPages === 0 || !containerWidth) return;

    const gen = ++renderGen.current;

    (async () => {
      for (let i = 1; i <= numPages; i++) {
        if (renderGen.current !== gen) return;
        const canvas = pageRefs.current[i];
        if (!canvas) continue;

        try {
          const page = await doc.getPage(i);
          if (renderGen.current !== gen) return;

          const baseVp = page.getViewport({ scale: 1 });
          const targetW = Math.max(containerWidth * zoom - 16, 100);
          const scale = targetW / baseVp.width;
          const vp = page.getViewport({ scale });

          // Use devicePixelRatio for sharp rendering on retina/mobile
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(vp.width * dpr);
          canvas.height = Math.floor(vp.height * dpr);
          canvas.style.width = `${Math.floor(vp.width)}px`;
          canvas.style.height = `${Math.floor(vp.height)}px`;

          const ctx = canvas.getContext("2d");
          if (!ctx || renderGen.current !== gen) return;
          ctx.scale(dpr, dpr);

          await page.render({ canvasContext: ctx, viewport: vp }).promise;
        } catch (err) {
          console.error(`[PdfCanvasViewer] Page ${i} render error:`, err);
        }
      }
    })();
  }, [numPages, containerWidth, zoom]);

  // ─── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-xs select-none">
        <span className="tabular-nums text-slate-500">
          {isLoading
            ? "Loading…"
            : `${numPages} page${numPages > 1 ? "s" : ""}`}
        </span>

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

      {/* ── Error display ── */}
      {loadError && (
        <div className="flex items-center justify-center py-12 px-4 text-center">
          <div>
            <p className="text-sm text-red-500 font-medium">Unable to render PDF</p>
            <p className="text-xs text-slate-400 mt-1">{loadError}</p>
          </div>
        </div>
      )}

      {/* ── Loading spinner ── */}
      {isLoading && !loadError && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        </div>
      )}

      {/* ── Scrollable PDF area — renders ALL pages ── */}
      {!loadError && !isLoading && numPages > 0 && (
        <div
          ref={scrollRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className={`overflow-auto bg-slate-50 flex flex-col items-center transition-opacity${
            dimmed ? " opacity-40" : ""
          }`}
          style={{
            maxHeight: "calc(100vh - 180px)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="py-2">
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="mb-2 shadow-sm bg-white">
                <canvas
                  ref={(el) => {
                    pageRefs.current[i + 1] = el;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
