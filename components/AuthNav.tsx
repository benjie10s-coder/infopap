// components/AuthNav.tsx — Navigation bar for auth pages
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AuthNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-mist/50">
      <Link href="/" className="flex items-center gap-2 text-ink font-display text-xl font-bold">
        <span className="text-lagoon">InvoSafi</span>
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link
          href="/pricing"
          className="text-ink/60 hover:text-ink transition-colors"
        >
          Pricing
        </Link>
        {pathname !== "/auth/login" && (
          <Link
            href="/auth/login"
            className="text-ink/60 hover:text-ink transition-colors"
          >
            Sign In
          </Link>
        )}
        {pathname !== "/auth/signup" && (
          <Link
            href="/auth/signup"
            className="rounded-lg bg-lagoon px-4 py-2 text-white hover:bg-lagoon/90 transition-colors"
          >
            Sign Up
          </Link>
        )}
      </div>
    </nav>
  );
}
