// components/html-preview/DeliveryNoteHtmlPreview.tsx — Instant HTML preview for delivery notes
"use client";

import { useDeliveryNoteStore } from "@/lib/store/deliveryNoteStore";
import { formatDate } from "@/lib/utils/format";
import {
  PreviewHeader,
  PreviewParties,
  PartyColumn,
  PreviewInfoBar,
  PreviewLineItemsTable,
  PreviewNotes,
  PreviewSignature,
  PreviewPhotos,
  PreviewFooter,
  PreviewWatermark,
  PreviewPaymentBar,
  type LineItemColumn,
  type LineItemRow,
} from "./shared";

const COLUMNS: LineItemColumn[] = [
  { key: "num", label: "#", width: "8%" },
  { key: "description", label: "Description", width: "72%" },
  { key: "qty", label: "Qty", width: "20%", align: "right" },
];

export function DeliveryNoteHtmlPreview() {
  const store = useDeliveryNoteStore();
  const accentColor = store.accentColor || "#0d9488";

  const rows: LineItemRow[] = store.items.map((item, i) => ({
    id: item.id,
    additionalDetails: item.additionalDetails || undefined,
    cells: {
      num: String(i + 1),
      description: item.description,
      qty: String(item.quantity),
    },
  }));

  return (
    <>
      <PreviewHeader
        logoDataUrl={store.logoDataUrl}
        title={store.documentTitle || "DELIVERY NOTE"}
        number={store.deliveryNoteNumber}
        accentColor={accentColor}
      />

      <PreviewParties>
        <PartyColumn label="From" party={store.from} />
        <PartyColumn label="Deliver To" party={store.to} />
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

      <PreviewPaymentBar
        label={store.acknowledgmentText || "Received By: ________________________________  Date: ______________"}
        value=""
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
