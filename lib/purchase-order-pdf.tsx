// lib/purchase-order-pdf.tsx — Server-side purchase order PDF renderer
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { PurchaseOrderWithItems } from "@/lib/db/types";
import { PurchaseOrderPdf } from "@/lib/pdf-components/purchase-order";

export { PurchaseOrderPdf };

let activePdfRenders = 0;
const MAX_CONCURRENT_PDF = 5;

export async function renderPurchaseOrderPdf(
  purchaseOrder: PurchaseOrderWithItems,
  options: { showWatermark?: boolean } = {}
): Promise<Buffer> {
  if (activePdfRenders >= MAX_CONCURRENT_PDF) {
    throw new Error("PDF_BUSY");
  }

  activePdfRenders++;
  try {
    const buffer = await renderToBuffer(
      <PurchaseOrderPdf
        purchaseOrder={purchaseOrder}
        showWatermark={options.showWatermark ?? false}
      />
    );
    return Buffer.from(buffer);
  } finally {
    activePdfRenders--;
  }
}
