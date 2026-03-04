// components/PdfPreview.tsx — PDF preview with zoom controls
// Desktop: BlobProvider → blob URL → iframe (native PDF plugin).
// Mobile:  BlobProvider → Uint8Array → canvas via react-pdf (PdfCanvasViewer).
// This hybrid approach guarantees rendering on Android / iOS where iframes
// cannot display PDFs inline.
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

const BlobProvider = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.BlobProvider),
  { ssr: false }
);

const PdfCanvasViewer = dynamic(() => import("./PdfCanvasViewer"), {
  ssr: false,
});

interface PdfPreviewProps {
  document: ReactElement;
  className?: string;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_IDX = 2; // 100 %

export function PdfPreview({ document: doc, className }: PdfPreviewProps) {
  const isMobile = useIsMobile();

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

  // ─── Zoom (desktop only — mobile viewer has its own) ───────
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);
  const zoom = ZOOM_STEPS[zoomIdx];
  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  // ─── Container width for canvas viewer ─────────────────────
  const [containerWidth, setContainerWidth] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    // Clean up previous observer
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node) return;
    setContainerWidth(node.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);

  // ─── Convert blob to Uint8Array for canvas viewer ──────────
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [convertError, setConvertError] = useState(false);
  const convertingUrl = useRef<string | null>(null);

  /**
   * Called from BlobProvider render callback.
   * Uses ref guard — NO setState during render. The actual state
   * updates happen asynchronously inside the .then()/.catch().
   */
  const onBlobReady = useCallback(
    (url: string | null, loading: boolean) => {
      if (!url || loading || !isMobile) return;
      if (url === convertingUrl.current) return;
      convertingUrl.current = url;

      setConvertError(false);
      fetch(url)
        .then((resp) => resp.arrayBuffer())
        .then((buf) => {
          if (convertingUrl.current === url) {
            setPdfData(new Uint8Array(buf));
          }
        })
        .catch(() => {
          if (convertingUrl.current === url) {
            setConvertError(true);
          }
        });
    },
    [isMobile]
  );

  const containerClass =
    className ??
    "relative bg-white rounded-xl shadow-soft border border-mist overflow-hidden";

  return (
    <div className={containerClass} ref={measureRef}>
      {/* ── Zoom toolbar (desktop / iframe mode) ── */}
      {!isMobile && (
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
      )}

      <BlobProvider document={deferredDoc}>
        {({ url, loading, error }) => {
          // Trigger blob → Uint8Array conversion for mobile
          // (uses ref guard — no setState during render)
          onBlobReady(url, loading);

          return (
            <>
              {/* Loading overlay */}
              {(loading || isStale) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                  <span className="text-sm text-ink/40">
                    Generating preview…
                  </span>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
                  <span className="text-sm text-red-500">
                    Preview unavailable
                  </span>
                </div>
              )}

              {convertError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
                  <span className="text-sm text-red-500">
                    Failed to load preview
                  </span>
                </div>
              )}

              {/* ── MOBILE: canvas-based rendering ── */}
              {isMobile && pdfData && !convertError && (
                <PdfCanvasViewer
                  data={pdfData}
                  dimmed={loading || isStale}
                  containerWidth={containerWidth}
                />
              )}

              {/* ── MOBILE: loading while converting blob → canvas data ── */}
              {isMobile && url && !pdfData && !error && !convertError && (
                <div className="h-[600px] flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-mist border-t-lagoon" />
                </div>
              )}

              {/* ── DESKTOP: iframe-based rendering ── */}
              {!isMobile && url && (
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

              {/* Placeholder — initial state before blob is ready */}
              {!url && !error && !convertError && (
                <div className="h-[600px] sm:h-[1120px] flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-mist border-t-lagoon" />
                </div>
              )}
            </>
          );
        }}
      </BlobProvider>
    </div>
  );
}
