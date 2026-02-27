// lib/receipt-pdf.tsx — Server-side receipt PDF renderer
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReceiptWithPhotos } from "@/lib/db/types";
import { ReceiptPdf } from "@/lib/pdf-components/receipt";

export { ReceiptPdf };

let activePdfRenders = 0;
const MAX_CONCURRENT_PDF = 5;

export async function renderReceiptPdf(
  receipt: ReceiptWithPhotos,
  options: { showWatermark?: boolean } = {}
): Promise<Buffer> {
  if (activePdfRenders >= MAX_CONCURRENT_PDF) {
    throw new Error("PDF_BUSY");
  }

  activePdfRenders++;
  try {
    const buffer = await renderToBuffer(
      <ReceiptPdf
        receipt={receipt}
        showWatermark={options.showWatermark ?? false}
      />
    );
    return Buffer.from(buffer);
  } finally {
    activePdfRenders--;
  }
}
