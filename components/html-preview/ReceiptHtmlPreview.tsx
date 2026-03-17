// components/html-preview/ReceiptHtmlPreview.tsx — Instant HTML preview for receipts
"use client";

import { useReceiptStore } from "@/lib/store/receiptStore";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  PreviewHeader,
  PreviewParties,
  PartyColumn,
  PreviewInfoBar,
  PreviewSummaryTable,
  PreviewTotals,
  PreviewNotes,
  PreviewSignature,
  PreviewPhotos,
  PreviewFooter,
  PreviewWatermark,
  type TotalsLine,
  type SummaryRow,
} from "./shared";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank: "Bank Transfer",
  card: "Card",
  "": "—",
};

export function ReceiptHtmlPreview() {
  const store = useReceiptStore();
  const accentColor = store.accentColor || "#8b5cf6";
  const currency = store.currency.code;
  const outstandingBalance = store.outstandingBalance ?? 0;

  // Info bar items
  const infoItems = [
    { label: "Date", value: formatDate(store.issueDate) },
    {
      label: "Payment Method",
      value: PAYMENT_METHOD_LABELS[store.paymentMethod] || store.paymentMethod || "—",
    },
  ];
  if (store.transactionCode) {
    infoItems.push({ label: "Transaction Ref", value: store.transactionCode });
  }

  // Summary table rows
  const summaryRows: SummaryRow[] = [
    { label: "Total Amount Owed", value: formatCurrency(store.totalAmountOwed, currency) },
  ];
  if (store.beingPaymentOf) {
    summaryRows.push({ label: "Being Payment Of", value: store.beingPaymentOf, small: true });
  }
  if (store.amountInWords) {
    summaryRows.push({ label: "Amount in Words", value: store.amountInWords, small: true });
  }

  // Totals lines
  const totalsLines: TotalsLine[] = [
    { label: "Total Owed", value: formatCurrency(store.totalAmountOwed, currency) },
  ];

  // Extra lines below the main total
  const extraLines: TotalsLine[] = [];
  if (outstandingBalance > 0) {
    extraLines.push({
      label: "Outstanding Balance",
      value: formatCurrency(outstandingBalance, currency),
      color: "#b45309",
      bold: true,
    });
  } else {
    extraLines.push({
      label: "Outstanding Balance",
      value: "Nil",
      color: "#15803d",
      bold: true,
    });
  }

  return (
    <>
      <PreviewHeader
        logoDataUrl={store.logoDataUrl}
        title={store.documentTitle || "RECEIPT"}
        number={store.receiptNumber}
        accentColor={accentColor}
      />

      <PreviewParties>
        <PartyColumn label="From" party={store.from} />
        <PartyColumn label="Received From" party={store.to} />
      </PreviewParties>

      <PreviewInfoBar items={infoItems} />

      <PreviewSummaryTable rows={summaryRows} accentColor={accentColor} />

      <PreviewTotals
        lines={totalsLines}
        finalLabel="Amount Received"
        finalValue={formatCurrency(store.amountReceived, currency)}
        accentColor={accentColor}
        extraLines={extraLines}
      />

      {store.notes && <PreviewNotes label="Notes" text={store.notes} />}

      {store.signatureDataUrl && (
        <PreviewSignature signatureDataUrl={store.signatureDataUrl} />
      )}

      <PreviewPhotos photoDataUrls={store.photoDataUrls} />

      <PreviewFooter accentColor={accentColor} />

      <PreviewWatermark />
    </>
  );
}
