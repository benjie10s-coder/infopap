// components/ViewActionsSidebar.tsx — Right-side action panel for document view pages
"use client";

interface ViewActionsSidebarProps {
  isPaid: boolean;
  onPay: () => void;
  onShare: () => void;
}

export function ViewActionsSidebar({
  isPaid,
  onPay,
  onShare,
}: ViewActionsSidebarProps) {
  return (
    <aside className="hidden lg:flex fixed right-0 top-14 bottom-0 z-40 w-64 bg-white border-l border-mist flex-col p-5 gap-5 overflow-y-auto">
      {/* Payment status */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/40 mb-3">
          Status
        </p>
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
            isPaid
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isPaid ? "bg-green-500" : "bg-amber-500"
            }`}
          />
          {isPaid ? "Paid" : "Unpaid"}
        </span>
        {!isPaid && (
          <p className="text-xs text-ink/40 mt-2 leading-relaxed">
            Pay KSh 10 to download a clean PDF without watermarks.
          </p>
        )}
      </div>

      <hr className="border-mist" />

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
          Actions
        </p>
        {isPaid ? (
          <>
            {/* Download */}
            <button
              onClick={onShare}
              className="rounded-lg bg-ember px-4 py-3 text-sm font-medium text-white hover:bg-ember/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="h-4 w-4"
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
              Download PDF
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="rounded-lg border border-mist px-4 py-2.5 text-sm text-ink/60 hover:bg-mist/50 transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
          </>
        ) : (
          <button
            onClick={onPay}
            className="rounded-lg bg-ember px-4 py-3 text-sm font-medium text-white hover:bg-ember/90 transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="h-4 w-4"
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
            Download PDF — KSh 10
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-mist">
        <p className="text-xs text-ink/30 text-center">
          Powered by{" "}
          <a href="/" className="text-lagoon hover:underline">
            InvoSafi
          </a>
        </p>
      </div>
    </aside>
  );
}
