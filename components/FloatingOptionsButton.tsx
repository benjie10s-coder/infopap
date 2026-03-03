// components/FloatingOptionsButton.tsx — Floating action button for mobile options drawer
"use client";

interface FloatingOptionsButtonProps {
  onToggle: () => void;
  visible?: boolean;
}

export function FloatingOptionsButton({
  onToggle,
  visible = true,
}: FloatingOptionsButtonProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onToggle}
      className="fixed bottom-6 right-4 z-40 lg:hidden flex items-center justify-center w-14 h-14 rounded-full bg-lagoon text-white shadow-lg hover:bg-lagoon/90 active:scale-95 transition-all touch-target animate-[fadeIn_0.2s_ease-out]"
      aria-label="Options"
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
    </button>
  );
}
