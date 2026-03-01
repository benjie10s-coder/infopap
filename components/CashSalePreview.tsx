// components/CashSalePreview.tsx — Live PDF preview (pixel-identical to download)
"use client";

import { useMemo } from "react";
import { useCashSaleStore } from "@/lib/store/cashSaleStore";
import { cashSaleStoreToRecord } from "@/lib/utils/store-to-pdf-adapter";
import { CashSalePdf } from "@/lib/pdf-components/cash-sale";
import { PdfPreview } from "@/components/PdfPreview";

export function CashSalePreview() {
  const store = useCashSaleStore();
  const record = useMemo(() => cashSaleStoreToRecord(store), [store]);
  return <PdfPreview document={<CashSalePdf cashSale={record} showWatermark />} />;
}