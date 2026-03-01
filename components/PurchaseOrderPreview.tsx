// components/PurchaseOrderPreview.tsx — Live PDF preview (pixel-identical to download)
"use client";

import { useMemo } from "react";
import { usePurchaseOrderStore } from "@/lib/store/purchaseOrderStore";
import { purchaseOrderStoreToRecord } from "@/lib/utils/store-to-pdf-adapter";
import { PurchaseOrderPdf } from "@/lib/pdf-components/purchase-order";
import { PdfPreview } from "@/components/PdfPreview";

export function PurchaseOrderPreview() {
  const store = usePurchaseOrderStore();
  const record = useMemo(() => purchaseOrderStoreToRecord(store), [store]);
  return <PdfPreview document={<PurchaseOrderPdf purchaseOrder={record} showWatermark />} />;
}