// app/dashboard/DashboardClient.tsx — Client-side dashboard interactions
"use client";

import { UserNav } from "@/components/UserNav";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";

interface DocRow {
  id: string;
  publicId: string;
  docType: string;
  docNumber: string;
  toName: string;
  amount: number;
  currency: string;
  isPaid: boolean;
  createdAt: string;
  viewUrl: string;
}

interface DashboardClientProps {
  user: { displayName: string; email: string; avatarUrl: string | null };
  documents: DocRow[];
}

const DOC_TYPE_BADGE: Record<string, string> = {
  Invoice: "bg-lagoon/10 text-lagoon",
  "Cash Sale": "bg-green-100 text-green-700",
  "Delivery Note": "bg-teal-100 text-teal-700",
  Receipt: "bg-purple-100 text-purple-700",
  "Purchase Order": "bg-orange-100 text-orange-700",
  Quotation: "bg-blue-100 text-blue-700",
};

export function DashboardClient({
  user,
  documents,
}: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-mist/30">
      {/* Full-width top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-mist">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link
            href="/"
            className="text-xl font-display font-bold text-lagoon"
          >
            Invopap
          </Link>
          <UserNav user={user} />
        </div>
      </header>

      {/* Narrow icon rail sidebar (below navbar) */}
      <NarrowSidebarRail />

      {/* Main content offset by rail width */}
      <div className="pl-14">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">
            Hello, {user.displayName.split(" ")[0]}
          </h1>
          <p className="text-sm text-ink/50 mt-1">
            Your documents
          </p>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-xl border border-mist">
          <div className="px-6 py-4 border-b border-mist flex items-center justify-between">
            <h2 className="font-semibold text-ink">Recent Documents</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink/40">
                {documents.length} shown
              </span>
              <Link
                href="/dashboard/documents"
                className="text-xs text-lagoon hover:underline"
              >
                View Library →
              </Link>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-ink/30 text-sm">No documents yet</p>
              <Link
                href="/"
                className="text-sm text-lagoon hover:underline mt-2 inline-block"
              >
                Create your first document →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-mist">
              {documents.map((doc) => (
                <div
                  key={`${doc.docType}-${doc.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-mist/20 transition-colors"
                >
                  {/* Type badge */}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap ${
                      DOC_TYPE_BADGE[doc.docType] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {doc.docType}
                  </span>

                  {/* Number */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">
                      {doc.docNumber || "—"}
                    </p>
                    <p className="text-xs text-ink/40 truncate">
                      {doc.toName || "No recipient"} •{" "}
                      {formatDate(doc.createdAt)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    {doc.amount > 0 ? (
                      <p className="text-sm font-medium text-ink">
                        {formatCurrency(doc.amount, doc.currency)}
                      </p>
                    ) : (
                      <p className="text-sm text-ink/30">—</p>
                    )}
                    <span
                      className={`text-[10px] ${
                        doc.isPaid
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {doc.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Link
                      href={doc.viewUrl}
                      className="rounded p-2 text-ink/30 hover:text-lagoon hover:bg-lagoon/5 transition-colors"
                      title="View"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-ink/30 py-4">
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/refund" className="hover:underline">
            Refunds
          </Link>
        </footer>
        </div>
        </div>
    </div>
  );
}
