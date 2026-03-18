// app/(legal)/layout.tsx — Legal pages layout
import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-mist">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-xl font-display font-bold text-lagoon"
          >
            InvoSafi
          </Link>
          <div className="flex items-center gap-4 text-sm text-ink/50">
            <Link href="/terms" className="hover:text-ink transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-ink transition-colors">
              Privacy
            </Link>
            <Link href="/refund" className="hover:text-ink transition-colors">
              Refunds
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12">{children}</main>
      <footer className="border-t border-mist text-center py-6 text-xs text-ink/30">
        © {new Date().getFullYear()} InvoSafi. All rights reserved.
      </footer>
    </div>
  );
}
