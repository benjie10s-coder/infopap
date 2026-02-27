// app/dashboard/documents/DocumentLibraryClient.tsx — Client-side document library
"use client";

import { useState } from "react";
import { UserNav } from "@/components/UserNav";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";
import { ShareModal } from "@/components/ShareModal";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";

interface PaidDocRow {
  id: string;
  publicId: string;
  docType: "invoice" | "cash-sale" | "delivery-note" | "receipt" | "purchase-order" | "quotation";
  docTypeLabel: string;
  docNumber: string;
  toName: string;
  amount: number;
  currency: string;
  createdAt: string;
  viewUrl: string;
}

interface DocumentLibraryClientProps {
  user: { displayName: string; email: string; avatarUrl: string | null };
  documents: PaidDocRow[];
}

const DOC_TYPE_BADGE: Record<string, string> = {
  Invoice: "bg-lagoon/10 text-lagoon",
  "Cash Sale": "bg-green-100 text-green-700",
  "Delivery Note": "bg-teal-100 text-teal-700",
  Receipt: "bg-purple-100 text-purple-700",
  "Purchase Order": "bg-orange-100 text-orange-700",
  Quotation: "bg-blue-100 text-blue-700",
};

// Map document type to download URL
function getDownloadUrl(docType: PaidDocRow["docType"], publicId: string): string {
  const paths: Record<PaidDocRow["docType"], string> = {
    invoice: `/api/invoices/download/${publicId}`,
    "cash-sale": `/api/cash-sales/download-cs/${publicId}`,
    "delivery-note": `/api/delivery-notes/download-dn/${publicId}`,
    receipt: `/api/receipts/download-receipt/${publicId}`,
    "purchase-order": `/api/purchase-orders/download-po/${publicId}`,
    quotation: `/api/quotations/download-quotation/${publicId}`,
  };
  return paths[docType];
}

type FilterType = "all" | PaidDocRow["docType"];

export function DocumentLibraryClient({
  user,
  documents,
}: DocumentLibraryClientProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [shareDoc, setShareDoc] = useState<PaidDocRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and search
  const filteredDocs = documents.filter((doc) => {
    const matchesFilter = filter === "all" || doc.docType === filter;
    const matchesSearch =
      searchQuery === "" ||
      doc.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.toName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Stats by type
  const statsByType = documents.reduce((acc, doc) => {
    acc[doc.docType] = (acc[doc.docType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-mist/30">
      {/* Full-width top bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-mist">
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
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">
              Document Library
            </h1>
            <p className="text-sm text-ink/50 mt-1">
              {documents.length} document{documents.length !== 1 ? "s" : ""} available for download and sharing
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`p-4 rounded-xl border text-left transition-all ${
              filter === "all"
                ? "border-lagoon bg-lagoon/5"
                : "border-mist bg-white hover:border-lagoon/30"
            }`}
          >
            <p className="text-2xl font-bold text-ink">{documents.length}</p>
            <p className="text-xs text-ink/50">All Documents</p>
          </button>
          {[
            { type: "invoice" as const, label: "Invoices" },
            { type: "cash-sale" as const, label: "Cash Sales" },
            { type: "delivery-note" as const, label: "Delivery Notes" },
            { type: "receipt" as const, label: "Receipts" },
            { type: "purchase-order" as const, label: "Purchase Orders" },
            { type: "quotation" as const, label: "Quotations" },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`p-4 rounded-xl border text-left transition-all ${
                filter === type
                  ? "border-lagoon bg-lagoon/5"
                  : "border-mist bg-white hover:border-lagoon/30"
              }`}
            >
              <p className="text-2xl font-bold text-ink">{statsByType[type] || 0}</p>
              <p className="text-xs text-ink/50">{label}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by document number or recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 rounded-xl border border-mist bg-white text-sm focus:outline-none focus:border-lagoon transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-xl border border-mist overflow-hidden">
          {filteredDocs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-mist/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-ink/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-ink/50 text-sm">
                {searchQuery ? "No documents match your search" : "No documents yet"}
              </p>
              {!searchQuery && (
                <Link
                  href="/"
                  className="text-sm text-lagoon hover:underline mt-2 inline-block"
                >
                  Create your first document
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-mist">
              {filteredDocs.map((doc) => (
                <li
                  key={`${doc.docType}-${doc.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-mist/20 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Document type badge */}
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                        DOC_TYPE_BADGE[doc.docTypeLabel] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {doc.docTypeLabel}
                    </span>

                    {/* Document info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={doc.viewUrl}
                          className="font-medium text-ink hover:text-lagoon transition-colors truncate"
                        >
                          {doc.docNumber || "—"}
                        </Link>
                      </div>
                      <p className="text-sm text-ink/50 truncate">
                        {doc.toName || "No recipient"} · {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Amount */}
                  {doc.amount > 0 && (
                    <p className="shrink-0 font-medium text-ink text-sm hidden sm:block">
                      {formatCurrency(doc.amount, doc.currency)}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={doc.viewUrl}
                      className="px-3 py-1.5 rounded-lg text-sm text-lagoon border border-lagoon/30 hover:bg-lagoon/5 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => setShareDoc(doc)}
                      className="px-3 py-1.5 rounded-lg text-sm text-white bg-ember hover:bg-ember/90 transition-colors flex items-center gap-1.5"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-ink/40">
          As a registered user, you can download and share your paid documents unlimited times.
        </p>
        </div>
        </div>

      {/* Share Modal */}
      {shareDoc && (
        <ShareModal
          onClose={() => setShareDoc(null)}
          documentType={shareDoc.docType}
          publicId={shareDoc.publicId}
          documentNumber={shareDoc.docNumber}
          downloadUrl={getDownloadUrl(shareDoc.docType, shareDoc.publicId)}
          isGuest={false}
        />
      )}
    </div>
  );
}
