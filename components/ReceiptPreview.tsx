// components/ReceiptPreview.tsx — Live PDF preview (pixel-identical to download)
"use client";

import { useMemo } from "react";
import { useReceiptStore } from "@/lib/store/receiptStore";
import { receiptStoreToRecord } from "@/lib/utils/store-to-pdf-adapter";
import { ReceiptPdf } from "@/lib/pdf-components/receipt";
import { PdfPreview } from "@/components/PdfPreview";

export function ReceiptPreview() {
  const store = useReceiptStore();
  const record = useMemo(() => receiptStoreToRecord(store), [store]);
  return <PdfPreview document={<ReceiptPdf receipt={record} showWatermark />} />;
}