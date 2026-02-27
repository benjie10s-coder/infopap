// components/DeliveryNotePreview.tsx — Live PDF preview (pixel-identical to download)
"use client";

import { useMemo } from "react";
import { useDeliveryNoteStore } from "@/lib/store/deliveryNoteStore";
import { deliveryNoteStoreToRecord } from "@/lib/utils/store-to-pdf-adapter";
import { DeliveryNotePdf } from "@/lib/pdf-components/delivery-note";
import { PdfPreview } from "@/components/PdfPreview";

export function DeliveryNotePreview() {
  const store = useDeliveryNoteStore();
  const record = useMemo(() => deliveryNoteStoreToRecord(store), [store]);
  return <PdfPreview document={<DeliveryNotePdf deliveryNote={record} showWatermark />} />;
}