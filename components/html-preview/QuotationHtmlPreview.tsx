// components/html-preview/QuotationHtmlPreview.tsx — Instant HTML preview for quotations
"use client";

import { useQuotationStore } from "@/lib/store/quotationStore";
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
  { key: "description", label: "Item description", width: "45%" },
  { key: "qty", label: "Qty", width: "15%", align: "right" },
  { key: "rate", label: "Rate", width: "15%", align: "right" },
  { key: "amount", label: "Amount", width: "20%", align: "right" },
];

export function QuotationHtmlPreview() {
  const store = useQuotationStore();
  const accentColor = store.accentColor || "#f97316";
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

  const subtotal = store.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const discountAmount =
    store.discountType === "percentage"
      ? subtotal * (store.discountValue / 100)
      : store.discountValue;
  const total = subtotal - discountAmount;

  const totalsLines: TotalsLine[] = [
    { label: "Sub Total", value: formatCurrency(subtotal, currency) },
  ];
  if (discountAmount > 0) {
    totalsLines.push({
      label: `Discount${store.discountType === "percentage" ? ` (${store.discountValue}%)` : ""}`,
      value: `-${formatCurrency(discountAmount, currency)}`,
      color: "#16a34a",
    });
  }

  return (
    <>
      <PreviewHeader
        logoDataUrl={store.logoDataUrl}
        title={store.documentTitle || "QUOTATION"}
        number={store.quotationNumber}
        accentColor={accentColor}
      />

      <PreviewParties>
        <PartyColumn label="Quotation by" party={store.from} />
        <PartyColumn label="Quotation to" party={store.to} />
      </PreviewParties>

      <PreviewInfoBar
        items={[
          { label: "Quotation Date", value: formatDate(store.quotationDate) },
          { label: "Valid Until", value: store.validUntil ? formatDate(store.validUntil) : "—" },
        ]}
      />

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

      {store.termsAndConditions && (
        <PreviewNotes label="Terms and Conditions" text={store.termsAndConditions} />
      )}

      {store.notes && <PreviewNotes label="Additional Notes" text={store.notes} />}

      {store.signatureDataUrl && (
        <PreviewSignature signatureDataUrl={store.signatureDataUrl} />
      )}

      <PreviewPhotos photoDataUrls={store.photoDataUrls} />

      <PreviewFooter accentColor={accentColor} />

      <PreviewWatermark />
    </>
  );
}
