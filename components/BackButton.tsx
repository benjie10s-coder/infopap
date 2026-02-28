// components/BackButton.tsx — Client-side back navigation button
"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm text-ink/50 hover:text-ink transition-colors rounded-lg px-2 py-1.5 hover:bg-mist/50"
      aria-label="Go back"
      title="Go back"
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
          d="M15 19l-7-7 7-7"
        />
      </svg>
      <span className="hidden sm:inline text-sm">Back</span>
    </button>
  );
}
