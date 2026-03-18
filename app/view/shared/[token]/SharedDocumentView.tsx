// app/view/shared/[token]/SharedDocumentView.tsx — Client component for shared document viewer
"use client";

import { useState, useCallback } from "react";

interface Props {
  token: string;
  documentType: string;
  documentId: string;
  publicId: string;
  isGuestDocument: boolean;
  isPaid: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  "cash-sale": "Cash Sale",
  "delivery-note": "Delivery Note",
  receipt: "Receipt",
  "purchase-order": "Purchase Order",
  quotation: "Quotation",
};

const DOCUMENT_TYPE_ICONS: Record<string, string> = {
  invoice: "📄",
  "cash-sale": "💵",
  "delivery-note": "📦",
  receipt: "🧾",
  "purchase-order": "📋",
  quotation: "📝",
};

export function SharedDocumentView({
  token,
  documentType,
  documentId: _documentId,
  publicId,
  isGuestDocument,
  isPaid,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const typeLabel = DOCUMENT_TYPE_LABELS[documentType] || "Document";
  const typeIcon = DOCUMENT_TYPE_ICONS[documentType] || "📄";

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    
    setDownloading(true);
    setError(null);

    try {
      // Download via the shared token endpoint
      const response = await fetch(`/api/documents/shared/${token}`, {
        method: "GET",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Download failed");
      }

      // Get filename from Content-Disposition header or default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${typeLabel}-${publicId}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloaded(true);

      // For guest documents, show notice that link is consumed
      if (isGuestDocument) {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [token, typeLabel, publicId, isGuestDocument, downloading]);

  // If document is not paid (shouldn't happen with valid share token)
  if (!isPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Document Unavailable
          </h1>
          <p className="text-slate-600">
            This share link is no longer valid. The document may have been
            modified since the link was created.
          </p>
        </div>
      </div>
    );
  }

  // Already used (guest document, token consumed)
  if (downloaded && isGuestDocument) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Download Complete
          </h1>
          <p className="text-slate-600 mb-4">
            Your {typeLabel.toLowerCase()} has been downloaded successfully.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Note:</strong> This was a one-time share link. For future
            access, please keep your downloaded file safe.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{typeIcon}</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Shared {typeLabel}
          </h1>
          <p className="text-slate-600">
            You&apos;ve received a {typeLabel.toLowerCase()}. Click below to
            download.
          </p>
        </div>

        {/* Download Section */}
        <div className="space-y-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {downloading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Preparing download...
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download {typeLabel}
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {isGuestDocument && !downloaded && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>Note:</strong> This is a one-time download link. After
              downloading, please save the file safely.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <a
            href="https://invosafi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-teal-600 transition-colors"
          >
            Powered by <span className="font-semibold">InvoSafi</span>
          </a>
        </div>
      </div>
    </div>
  );
}
