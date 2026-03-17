// components/html-preview/PurchaseOrderHtmlPreview.tsx — Instant HTML preview for purchase orders
"use client";

import { usePurchaseOrderStore } from "@/lib/store/purchaseOrderStore";
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
  { key: "rate", label: "Unit Price", width: "15%", align: "right" },
  { key: "amount", label: "Amount", width: "20%", align: "right" },
];

export function PurchaseOrderHtmlPreview() {
  const store = usePurchaseOrderStore();
  const accentColor = store.accentColor || "#d97706";
  const currency = store.currency.code;

  const rows: LineItemRow[] = store.items.map((item, i) => ({
    id: item.id,
    additionalDetails: item.additionalDetails || undefined,
    cells: {
      num: String(i + 1),
      description: item.description,
      qty: String(item.quantity),
      rate: formatCurrency(item.unitPrice, currency),
      amount: formatCurrency(item.quantity * item.unitPrice, currency),
    },
  }));

  const subtotal = store.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (store.taxRate / 100);
  const total = subtotal + taxAmount;

  const totalsLines: TotalsLine[] = [
    { label: "Subtotal", value: formatCurrency(subtotal, currency) },
  ];
  if (taxAmount > 0) {
    totalsLines.push({
      label: `Tax (${store.taxRate}%)`,
      value: formatCurrency(taxAmount, currency),
    });
  }

  // Build info bar items
  const infoItems = [
    { label: "Issue Date", value: formatDate(store.issueDate) },
  ];
  if (store.expectedDeliveryDate) {
    infoItems.push({ label: "Expected Delivery", value: formatDate(store.expectedDeliveryDate) });
  }
  if (store.orderNumber) {
    infoItems.push({ label: "Order / Ref No.", value: store.orderNumber });
  }
  if (store.paymentTerms) {
    infoItems.push({ label: "Payment Terms", value: store.paymentTerms });
  }

  const colWidth = store.shipToEnabled ? "31%" : "48%";

  return (
    <>
      <PreviewHeader
        logoDataUrl={store.logoDataUrl}
        title={store.documentTitle || "PURCHASE ORDER"}
        number={store.purchaseOrderNumber}
        accentColor={accentColor}
      />

      <PreviewParties>
        <PartyColumn label="From" party={store.from} width={colWidth} />
        <PartyColumn label="Vendor / Supplier" party={store.to} width={colWidth} />
        {store.shipToEnabled && (
          <div style={{ width: colWidth }}>
            <div
              className="font-bold uppercase"
              style={{ fontSize: 8, color: "#888", marginBottom: 6, letterSpacing: 1 }}
            >
              Ship To
            </div>
            {store.shipTo.name && (
              <div className="font-bold" style={{ fontSize: 12, marginBottom: 4 }}>
                {store.shipTo.name}
              </div>
            )}
            {store.shipTo.companyName && (
              <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>
                {store.shipTo.companyName}
              </div>
            )}
            {store.shipTo.address && (
              <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>
                {store.shipTo.address}
              </div>
            )}
            {(store.shipTo.city || store.shipTo.zipCode) && (
              <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>
                {[store.shipTo.city, store.shipTo.zipCode].filter(Boolean).join(", ")}
              </div>
            )}
            {store.shipTo.phone && (
              <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>
                {store.shipTo.phone}
              </div>
            )}
          </div>
        )}
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

      {store.notes && <PreviewNotes label="Notes" text={store.notes} />}

      {(store.signatureDataUrl || store.authorizedByName) && (
        <PreviewSignature
          signatureDataUrl={store.signatureDataUrl || ""}
          label={store.authorizedByName || "Authorized Signature"}
          sublabel={store.authorizedByDesignation || undefined}
        />
      )}

      <PreviewPhotos photoDataUrls={store.photoDataUrls} />

      <PreviewFooter accentColor={accentColor} />

      <PreviewWatermark />
    </>
  );
}
