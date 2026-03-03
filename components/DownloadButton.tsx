// components/DownloadButton.tsx — Inline download button for end-of-document quick access
"use client";

interface DownloadButtonProps {
  onDownload: () => void;
  saving: boolean;
  label?: string;
}

export function DownloadButton({
  onDownload,
  saving,
  label = "Download PDF",
}: DownloadButtonProps) {
  return (
    <button
      onClick={onDownload}
      disabled={saving}
      className="w-full rounded-lg bg-ember px-4 py-3 text-sm font-medium text-white hover:bg-ember/90 transition-colors flex items-center justify-center gap-2 touch-target"
    >
      {saving ? (
        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}
      {label}
    </button>
  );
}
