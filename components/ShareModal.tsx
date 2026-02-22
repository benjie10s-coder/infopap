// components/ShareModal.tsx — Multi-channel document sharing modal
"use client";

import { useState, useCallback } from "react";

type ShareMethod = "download" | "email" | "whatsapp" | "copy";
type ModalState = "select" | "email" | "sending" | "success" | "error";

export type ShareableDocumentType =
  | "invoice"
  | "cash-sale"
  | "delivery-note"
  | "receipt"
  | "purchase-order"
  | "quotation";

interface ShareModalProps {
  publicId: string;
  documentNumber: string;
  documentType: ShareableDocumentType;
  downloadUrl: string;
  onClose: () => void;
  onDownloadComplete?: () => void;
  isGuest?: boolean;
}

// API-style document type to URL segment
const TYPE_URL_MAP: Record<ShareableDocumentType, string> = {
  invoice: "invoice",
  "cash-sale": "cash-sale",
  "delivery-note": "delivery-note",
  receipt: "receipt",
  "purchase-order": "purchase-order",
  quotation: "quotation",
};

const TYPE_LABELS: Record<ShareableDocumentType, string> = {
  invoice: "Invoice",
  "cash-sale": "Cash Sale",
  "delivery-note": "Delivery Note",
  receipt: "Receipt",
  "purchase-order": "Purchase Order",
  quotation: "Quotation",
};

export function ShareModal({
  publicId,
  documentNumber,
  documentType,
  downloadUrl,
  onClose,
  onDownloadComplete,
  isGuest = false,
}: ShareModalProps) {
  const [state, setState] = useState<ModalState>("select");
  const [email, setEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [error, setError] = useState("");
  const [successMethod, setSuccessMethod] = useState<ShareMethod | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const typeLabel = TYPE_LABELS[documentType];

  // Handle direct download
  const handleDownload = useCallback(() => {
    window.location.href = downloadUrl;
    setSuccessMethod("download");
    setState("success");
    onDownloadComplete?.();
  }, [downloadUrl, onDownloadComplete]);

  // Handle email send
  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        setError("Please enter a valid email address");
        return;
      }

      setState("sending");

      try {
        const res = await fetch(
          `/api/documents/email/${TYPE_URL_MAP[documentType]}/${publicId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientEmail: email,
              recipientName: recipientName || undefined,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setState("error");
          setError(data.error || "Failed to send email");
          return;
        }

        setSuccessMethod("email");
        setState("success");
      } catch {
        setState("error");
        setError("Network error. Please try again.");
      }
    },
    [email, recipientName, documentType, publicId]
  );

  // Generate share link and copy or share to WhatsApp
  const handleShareLink = useCallback(
    async (method: "copy" | "whatsapp") => {
      setError("");

      try {
        // Generate share token if not already have one
        let url = shareUrl;
        if (!url) {
          const res = await fetch(
            `/api/documents/share/${TYPE_URL_MAP[documentType]}/${publicId}`,
            { method: "POST" }
          );

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || "Failed to generate share link");
            return;
          }

          url = data.shareUrl;
          setShareUrl(url);
        }

        if (!url) {
          setError("Failed to get share link");
          return;
        }

        if (method === "copy") {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          setSuccessMethod("copy");
          setState("success");
        } else if (method === "whatsapp") {
          const text = encodeURIComponent(
            `Here's your ${typeLabel} ${documentNumber}: ${url}`
          );
          window.open(`https://wa.me/?text=${text}`, "_blank");
          setSuccessMethod("whatsapp");
          setState("success");
        }
      } catch {
        setError("Failed to share. Please try again.");
      }
    },
    [shareUrl, documentType, publicId, typeLabel, documentNumber]
  );

  // Success messages by method
  const getSuccessMessage = () => {
    switch (successMethod) {
      case "download":
        return "Your document is downloading now...";
      case "email":
        return `${typeLabel} sent to ${email}`;
      case "whatsapp":
        return "Opening WhatsApp...";
      case "copy":
        return "Link copied to clipboard!";
      default:
        return "Success!";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-soft w-full max-w-md mx-4 p-6 animate-fadeUp">
        {/* Close button */}
        {(state === "select" || state === "email" || state === "error") && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-ink/40 hover:text-ink transition-colors p-1 rounded-md hover:bg-mist/50"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-lagoon/10 mb-3">
            {state === "success" ? (
              <svg
                className="h-7 w-7 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : state === "error" ? (
              <svg
                className="h-7 w-7 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            ) : (
              <svg
                className="h-7 w-7 text-lagoon"
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
            )}
          </div>

          <h2 className="text-lg font-display font-bold text-ink">
            {state === "select" && "Share Your Document"}
            {state === "email" && "Send via Email"}
            {state === "sending" && "Sending Email..."}
            {state === "success" && "Success!"}
            {state === "error" && "Something Went Wrong"}
          </h2>

          <p className="text-sm text-ink/50 mt-1">
            {state === "select" &&
              `Choose how you'd like to receive your ${typeLabel.toLowerCase()}`}
            {state === "email" && "Enter the recipient's email address"}
            {state === "sending" && "Please wait while we send your document..."}
            {state === "success" && getSuccessMessage()}
            {state === "error" && error}
          </p>
        </div>

        {/* Select state - share method options */}
        {state === "select" && (
          <div className="space-y-3">
            {/* Download to device */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-mist hover:border-lagoon/30 hover:bg-lagoon/5 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-lagoon/10 flex items-center justify-center group-hover:bg-lagoon/20 transition-colors">
                <svg
                  className="h-5 w-5 text-lagoon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-ink">Download to Device</p>
                <p className="text-sm text-ink/50">Save PDF to your phone or computer</p>
              </div>
              <svg
                className="h-5 w-5 text-ink/30 group-hover:text-lagoon transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Send via Email */}
            <button
              onClick={() => setState("email")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-mist hover:border-lagoon/30 hover:bg-lagoon/5 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <svg
                  className="h-5 w-5 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-ink">Send via Email</p>
                <p className="text-sm text-ink/50">Email PDF to yourself or a client</p>
              </div>
              <svg
                className="h-5 w-5 text-ink/30 group-hover:text-lagoon transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Share via WhatsApp */}
            <button
              onClick={() => handleShareLink("whatsapp")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-mist hover:border-lagoon/30 hover:bg-lagoon/5 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg
                  className="h-5 w-5 text-green-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-ink">Share via WhatsApp</p>
                <p className="text-sm text-ink/50">Send a link via WhatsApp</p>
              </div>
              <svg
                className="h-5 w-5 text-ink/30 group-hover:text-lagoon transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Copy Link */}
            <button
              onClick={() => handleShareLink("copy")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-mist hover:border-lagoon/30 hover:bg-lagoon/5 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-ink">
                  {copied ? "Copied!" : "Copy Link"}
                </p>
                <p className="text-sm text-ink/50">Copy shareable link to clipboard</p>
              </div>
              <svg
                className="h-5 w-5 text-ink/30 group-hover:text-lagoon transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Guest warning - prominent */}
            {isGuest && (
              <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                <div className="flex gap-3">
                  <div className="shrink-0">
                    <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Important: One-Time Access</p>
                    <p className="text-sm text-amber-700 mt-1">
                      As a guest, this is your <strong>only chance</strong> to download or share this document. 
                      Once you close this window, you&apos;ll need to pay again to access it.
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      Tip: Create a free account to keep all your documents accessible anytime.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Logged-in user info */}
            {!isGuest && (
              <div className="mt-4 p-3 bg-lagoon/5 border border-lagoon/20 rounded-xl">
                <p className="text-xs text-lagoon text-center">
                  You can re-download or re-share this document anytime from your{" "}
                  <a href="/dashboard/documents" className="font-medium underline hover:no-underline">
                    Document Library
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Email input state */}
        {state === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full rounded-lg border border-mist px-4 py-3 text-base text-ink placeholder:text-ink/30 focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1">
                Recipient Name <span className="text-ink/30">(optional)</span>
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border border-mist px-4 py-3 text-base text-ink placeholder:text-ink/30 focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setState("select")}
                className="flex-1 rounded-lg border border-mist px-4 py-3 text-sm text-ink/60 hover:bg-mist/30 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-lagoon px-4 py-3 text-sm text-white font-medium hover:bg-lagoon/90 transition-colors"
              >
                Send Email
              </button>
            </div>
          </form>
        )}

        {/* Sending state */}
        {state === "sending" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full border-4 border-mist border-t-lagoon animate-spin" />
            <p className="text-sm text-ink/40">This may take a few seconds...</p>
          </div>
        )}

        {/* Success state */}
        {state === "success" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-mist px-6 py-2 text-sm text-ink/60 hover:bg-mist/30 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-mist px-4 py-3 text-sm text-ink/60 hover:bg-mist/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setState("select");
                setError("");
              }}
              className="flex-1 rounded-lg bg-lagoon px-4 py-3 text-sm text-white font-medium hover:bg-lagoon/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
