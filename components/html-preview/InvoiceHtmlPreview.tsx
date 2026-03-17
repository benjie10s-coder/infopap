// components/html-preview/InvoiceHtmlPreview.tsx — Instant HTML preview for invoices
"use client";

import { useInvoiceStore, PAYMENT_TERMS_LABELS } from "@/lib/store/invoiceStore";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  PreviewHeader,
  PreviewParties,
  PartyColumn,
  PreviewInfoBar,
  PreviewLineItemsTable,
  PreviewTotals,
  PreviewNotes,
  PreviewSignature,
  PreviewPhotos,
  PreviewFooter,
  PreviewWatermark,
  type LineItemColumn,
  type LineItemRow,
  type TotalsLine,
} from "./shared";

const COLUMNS: LineItemColumn[] = [
  { key: "num", label: "#", width: "5%" },
  { key: "description", label: "Description", width: "45%" },
  { key: "qty", label: "Qty", width: "15%", align: "right" },
  { key: "rate", label: "Rate", width: "15%", align: "right" },
  { key: "amount", label: "Amount", width: "20%", align: "right" },
];

export function InvoiceHtmlPreview() {
  const store = useInvoiceStore();
  const accentColor = store.accentColor || "#1f8ea3";
  const currency = store.currency.code;

  const rows: LineItemRow[] = store.items.map((item, i) => ({
    id: item.id,
    additionalDetails: item.additionalDetails || undefined,
    cells: {
      num: String(i + 1),
      description: item.description,
      qty: String(item.quantity),
      rate: formatCurrency(item.rate, currency),
      amount: formatCurrency(item.quantity * item.rate, currency),
    },
  }));

  // Calculate totals
  const subtotal = store.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const discountAmount =
    store.discountType === "percentage"
      ? subtotal * (store.discountValue / 100)
      : store.discountValue;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (store.taxRate / 100);
  const total = afterDiscount + taxAmount;

  const totalsLines: TotalsLine[] = [
    { label: "Subtotal", value: formatCurrency(subtotal, currency) },
  ];
  if (discountAmount > 0) {
    totalsLines.push({
      label: `Discount${store.discountType === "percentage" ? ` (${store.discountValue}%)` : ""}`,
      value: `-${formatCurrency(discountAmount, currency)}`,
      color: "#e53e3e",
    });
  }
  if (taxAmount > 0) {
    totalsLines.push({
      label: `Tax (${store.taxRate}%)`,
      value: formatCurrency(taxAmount, currency),
    });
  }

  const infoItems = [
    { label: "Issue Date", value: formatDate(store.issueDate) },
  ];
  if (store.dueDate) {
    infoItems.push({ label: "Due Date", value: formatDate(store.dueDate) });
  }
  if (store.paymentTerms) {
    infoItems.push({
      label: "Payment Terms",
      value: PAYMENT_TERMS_LABELS[store.paymentTerms] || store.paymentTerms,
    });
  }

  return (
    <>
      <PreviewHeader
        logoDataUrl={store.logoDataUrl}
        title={store.documentTitle || store.documentType}
        number={store.invoiceNumber}
        accentColor={accentColor}
      />

      <PreviewParties>
        <PartyColumn label="From" party={store.from} />
        <PartyColumn label="To" party={store.to} />
      </PreviewParties>

      <PreviewInfoBar items={infoItems} />

      <PreviewLineItemsTable
        columns={COLUMNS}
        rows={rows}
        accentColor={accentColor}
      />

      <PreviewTotals
        lines={totalsLines}
        finalLabel="Total"
        finalValue={formatCurrency(total, currency)}
        accentColor={accentColor}
      />

      {store.notes && <PreviewNotes label="Notes / Terms" text={store.notes} />}

      {store.signatureDataUrl && (
        <PreviewSignature signatureDataUrl={store.signatureDataUrl} />
      )}

      <PreviewPhotos photoDataUrls={store.photoDataUrls} />

      <PreviewFooter accentColor={accentColor} />

      <PreviewWatermark />
    </>
  );
}
