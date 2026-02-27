// components/QuotationPreview.tsx — Live PDF preview (pixel-identical to download)
"use client";

import { useMemo } from "react";
import { useQuotationStore } from "@/lib/store/quotationStore";
import { quotationStoreToRecord } from "@/lib/utils/store-to-pdf-adapter";
import { QuotationPdf } from "@/lib/pdf-components/quotation";
import { PdfPreview } from "@/components/PdfPreview";

export function QuotationPreview() {
  const store = useQuotationStore();
  const record = useMemo(() => quotationStoreToRecord(store), [store]);
  return <PdfPreview document={<QuotationPdf quotation={record} showWatermark />} />;
}
