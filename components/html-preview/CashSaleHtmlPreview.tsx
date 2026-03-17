// components/html-preview/CashSaleHtmlPreview.tsx — Instant HTML preview for cash sales
"use client";

import { useCashSaleStore, PAYMENT_METHOD_LABELS } from "@/lib/store/cashSaleStore";
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
  PreviewPaymentBar,
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

export function CashSaleHtmlPreview() {
  const store = useCashSaleStore();
  const accentColor = store.accentColor || "#22c55e";
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
      color: "#16a34a",
    });
  }
  if (taxAmount > 0) {
    totalsLines.push({
      label: `Tax (${store.taxRate}%)`,
      value: formatCurrency(taxAmount, currency),
    });
  }

  const paymentValue =
    (PAYMENT_METHOD_LABELS[store.paymentMethod] || store.paymentMethod) +
    (store.transactionCode ? `  •  Ref: ${store.transactionCode}` : "");

  return (
    <>
      <PreviewHeader
        logoDataUrl={store.logoDataUrl}
        title={store.documentTitle || "CASH SALE"}
        number={store.cashSaleNumber}
        accentColor={accentColor}
      />

      <PreviewParties>
        <PartyColumn label="From" party={store.from} />
        <PartyColumn label="Sold To" party={store.to} />
      </PreviewParties>

      <PreviewInfoBar
        items={[
          { label: "Date", value: formatDate(store.issueDate) },
          { label: "Order No.", value: store.orderNumber || "—" },
          { label: "Invoice No.", value: store.referenceInvoiceNumber || "—" },
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

      <PreviewPaymentBar
        label="Payment Method"
        value={paymentValue}
        accentColor={accentColor}
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
