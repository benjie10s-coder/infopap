// components/InvoicePreview.tsx — Live PDF preview (pixel-identical to download)
"use client";

import { useMemo } from "react";
import { useInvoiceStore } from "@/lib/store/invoiceStore";
import { invoiceStoreToRecord } from "@/lib/utils/store-to-pdf-adapter";
import { InvoicePdf } from "@/lib/pdf-components/invoice";
import { PdfPreview } from "@/components/PdfPreview";

export function InvoicePreview() {
  const store = useInvoiceStore();
  const record = useMemo(() => invoiceStoreToRecord(store), [store]);
  return <PdfPreview document={<InvoicePdf invoice={record} showWatermark />} />;
}

