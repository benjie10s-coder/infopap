// components/PdfCanvasViewer.tsx — Canvas-based PDF viewer (client-only)
// Loads pdf.js via a <script> tag (NOT import()) to completely bypass webpack.
// Renders PDF pages as <canvas> elements in a scrollable column.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Load pdf.js via <script> tag ─────────────────────────────
const PDFJS_VERSION = "4.9.124";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadPdfJs(): Promise<any> {
  // Already loaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).pdfjsLib) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Promise.resolve((window as any).pdfjsLib);
  }

  return new Promise((resolve, reject) => {
    // Check if script is already being loaded
    const existing = document.querySelector(
      'script[data-pdfjs="true"]'
    ) as HTMLScriptElement | null;
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      existing.addEventListener("load", () => resolve((window as any).pdfjsLib));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = `${PDFJS_CDN}/pdf.min.mjs`;
    script.type = "module";
    script.dataset.pdfjs = "true";
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
        resolve(lib);
      } else {
        reject(new Error("pdfjsLib not found on window after script load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load pdf.js from CDN"));
    document.head.appendChild(script);
  });
}

// ─── Component ───────────────────────────────────────────────
interface PdfCanvasViewerProps {
  data: Uint8Array;
  dimmed?: boolean;
  containerWidth: number;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_IDX = 2;

export default function PdfCanvasViewer({
  data,
  dimmed,
  containerWidth,
}: PdfCanvasViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const renderGen = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Touch / swipe ─────────────────────────────────────────
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

  // ─── Load PDF document ─────────────────────────────────────
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((doc: any) => {
        if (cancelled || !doc) return;
        pdfDocRef.current?.destroy();
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setIsLoading(false);
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((err: any) => {
        if (cancelled) return;
        console.error("[PdfCanvasViewer] Load error:", err);
        setLoadError(err?.message ?? "Failed to load PDF");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  // ─── Render pages to canvases ──────────────────────────────
  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || numPages === 0 || !containerWidth) return;

    const gen = ++renderGen.current;

    (async () => {
      for (let i = 1; i <= numPages; i++) {
        if (renderGen.current !== gen) return;
        const canvas = canvasRefs.current[i];
        if (!canvas) continue;

        try {
          const page = await doc.getPage(i);
          if (renderGen.current !== gen) return;

          const baseVp = page.getViewport({ scale: 1 });
          const targetW = Math.max(containerWidth * zoom - 16, 100);
          const scale = targetW / baseVp.width;
          const vp = page.getViewport({ scale });

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

  // ─── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
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

      {/* Error */}
      {loadError && (
        <div className="flex items-center justify-center py-12 text-sm text-red-500">
          {loadError}
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && !loadError && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        </div>
      )}

      {/* Scrollable PDF pages */}
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
                    canvasRefs.current[i + 1] = el;
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
