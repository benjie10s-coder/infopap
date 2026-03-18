// components/PrefillPrompt.tsx — Modal asking whether to prefill "From" with saved business details
"use client";

import { useState } from "react";
import Link from "next/link";
import type { PrefillPreference } from "@/lib/hooks/usePrefillPreference";

interface PrefillPromptProps {
  onAccept: () => void;
  onDecline: () => void;
  /** Called with the chosen preference when "Remember my choice" is checked */
  onRemember?: (preference: PrefillPreference) => void;
  /** Whether the user has any saved business details */
  hasProfile: boolean;
}

export function PrefillPrompt({
  onAccept,
  onDecline,
  onRemember,
  hasProfile,
}: PrefillPromptProps) {
  const [remember, setRemember] = useState(false);

  const handleAccept = () => {
    if (remember && onRemember) onRemember("always");
    onAccept();
  };

  const handleDecline = () => {
    if (remember && onRemember) onRemember("never");
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={handleDecline}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 flex flex-col gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lagoon/10">
          <svg
            className="h-6 w-6 text-lagoon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h2 className="text-base font-semibold text-ink">
            Prefill your business details?
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            {hasProfile
              ? "Fill the \"From\" section with your saved business details to save time."
              : "You haven't saved business details yet. Add them in Settings to use this feature."}
          </p>
        </div>

        {!hasProfile && (
          <Link
            href="/dashboard/settings"
            className="text-sm font-medium text-lagoon hover:underline"
          >
            Go to Business Profile settings →
          </Link>
        )}

        {/* Remember checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-mist accent-lagoon"
          />
          <span className="text-sm text-ink/70">Remember my choice</span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleDecline}
            className="flex-1 rounded-lg border border-mist px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-mist/50 transition-colors"
          >
            No, start blank
          </button>
          <button
            onClick={handleAccept}
            disabled={!hasProfile}
            className="flex-1 rounded-lg bg-lagoon px-4 py-2.5 text-sm font-semibold text-white hover:bg-lagoon/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Yes, prefill
          </button>
        </div>
      </div>
    </div>
  );
}
