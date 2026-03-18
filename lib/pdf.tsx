// lib/pdf.tsx — PDF document template using @react-pdf/renderer
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { InvoiceWithItems } from "@/lib/db/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";

// =============================================================================
// Font Registration (use built-in Helvetica for reliability)
// =============================================================================

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerLeft: {
    flexDirection: "column",
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: "contain",
    marginBottom: 10,
  },
  documentTitle: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  documentNumber: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  // Parties section
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  partyColumn: {
    width: "48%",
  },
  partyLabel: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#888",
    marginBottom: 6,
    letterSpacing: 1,
  },
  partyName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 9,
    color: "#444",
    marginBottom: 2,
  },
  // Dates section
  datesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 4,
  },
  dateItem: {
    flexDirection: "column",
  },
  dateLabel: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#888",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  // Table
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  colNum: { width: "5%" },
  colDesc: { width: "45%" },
  colQty: { width: "15%", textAlign: "right" },
  colRate: { width: "15%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  headerText: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#fff",
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 9,
  },
  cellDetail: {
    fontSize: 7,
    color: "#888",
    marginTop: 2,
  },
  // Totals
  totalsContainer: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  totalsTable: {
    width: "40%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: "#666",
  },
  totalsValue: {
    fontSize: 9,
    textAlign: "right",
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    marginTop: 4,
  },
  totalsFinalLabel: {
    fontSize: 13,
    fontWeight: "bold",
  },
  totalsFinalValue: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "right",
  },
  // Notes
  notesSection: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#888",
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  // Signature
  signatureSection: {
    marginBottom: 24,
  },
  signatureImage: {
    width: 150,
    height: 60,
    objectFit: "contain",
  },
  signatureLabel: {
    fontSize: 8,
    color: "#888",
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 4,
    width: 150,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
  },
  footerBar: {
    height: 3,
    marginBottom: 8,
    borderRadius: 2,
  },
  footerText: {
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
  // Watermark
  watermark: {
    position: "absolute",
    top: "35%",
    left: "10%",
    transform: "rotate(-30deg)",
    fontSize: 60,
    color: "rgba(200, 200, 200, 0.3)",
    fontWeight: "bold",
    letterSpacing: 8,
  },
});

// =============================================================================
// Payment Terms Labels
// =============================================================================

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  DUE_ON_RECEIPT: "Due on Receipt",
  NET_7: "Net 7",
  NET_15: "Net 15",
  NET_30: "Net 30",
  NET_60: "Net 60",
  CUSTOM: "Custom",
};

// =============================================================================
// PDF Document Component
// =============================================================================

interface InvoicePdfProps {
  invoice: InvoiceWithItems;
  showWatermark?: boolean;
}

function InvoicePdf({ invoice, showWatermark = false }: InvoicePdfProps) {
  const accentColor = invoice.accentColor || "#1f8ea3";
  const currency = invoice.currency || "KES";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        {showWatermark && (
          <Text style={styles.watermark}>INVOSAFI — PREVIEW</Text>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {invoice.logoDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={invoice.logoDataUrl} style={styles.logo} />
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.documentTitle, { color: accentColor }]}>
              {invoice.documentTitle || invoice.documentType}
            </Text>
            <Text style={styles.documentNumber}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.partiesRow}>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{invoice.fromName}</Text>
            {invoice.fromEmail && (
              <Text style={styles.partyDetail}>{invoice.fromEmail}</Text>
            )}
            {invoice.fromPhone && (
              <Text style={styles.partyDetail}>{invoice.fromPhone}</Text>
            )}
            {invoice.fromAddress && (
              <Text style={styles.partyDetail}>{invoice.fromAddress}</Text>
            )}
            {(invoice.fromCity || invoice.fromZipCode) && (
              <Text style={styles.partyDetail}>
                {[invoice.fromCity, invoice.fromZipCode].filter(Boolean).join(", ")}
              </Text>
            )}
            {invoice.fromBusinessNumber && (
              <Text style={styles.partyDetail}>
                KRA PIN: {invoice.fromBusinessNumber}
              </Text>
            )}
          </View>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>To</Text>
            <Text style={styles.partyName}>{invoice.toName}</Text>
            {invoice.toEmail && (
              <Text style={styles.partyDetail}>{invoice.toEmail}</Text>
            )}
            {invoice.toPhone && (
              <Text style={styles.partyDetail}>{invoice.toPhone}</Text>
            )}
            {invoice.toAddress && (
              <Text style={styles.partyDetail}>{invoice.toAddress}</Text>
            )}
            {(invoice.toCity || invoice.toZipCode) && (
              <Text style={styles.partyDetail}>
                {[invoice.toCity, invoice.toZipCode].filter(Boolean).join(", ")}
              </Text>
            )}
            {invoice.toBusinessNumber && (
              <Text style={styles.partyDetail}>
                KRA PIN: {invoice.toBusinessNumber}
              </Text>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Issue Date</Text>
            <Text style={styles.dateValue}>
              {formatDate(invoice.issueDate)}
            </Text>
          </View>
          {invoice.dueDate && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Due Date</Text>
              <Text style={styles.dateValue}>
                {formatDate(invoice.dueDate)}
              </Text>
            </View>
          )}
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Payment Terms</Text>
            <Text style={styles.dateValue}>
              {PAYMENT_TERMS_LABELS[invoice.paymentTerms] || invoice.paymentTerms}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableHeader, { backgroundColor: accentColor, borderBottomColor: accentColor }]}>
            <Text style={[styles.headerText, styles.colNum]}>#</Text>
            <Text style={[styles.headerText, styles.colDesc]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colRate]}>Rate</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>

          {/* Rows */}
          {invoice.lineItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.cellText, styles.colNum]}>{index + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.cellText}>{item.description}</Text>
                {item.additionalDetails && (
                  <Text style={styles.cellDetail}>
                    {item.additionalDetails}
                  </Text>
                )}
              </View>
              <Text style={[styles.cellText, styles.colQty]}>
                {item.quantity}
              </Text>
              <Text style={[styles.cellText, styles.colRate]}>
                {formatCurrency(item.rate, currency)}
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {formatCurrency(item.amount, currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(invoice.subtotal, currency)}
              </Text>
            </View>
            {invoice.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Discount
                  {invoice.discountType === "PERCENTAGE"
                    ? ` (${invoice.discountValue}%)`
                    : ""}
                </Text>
                <Text style={[styles.totalsValue, { color: "#e53e3e" }]}>
                  -{formatCurrency(invoice.discountAmount, currency)}
                </Text>
              </View>
            )}
            {invoice.taxAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Tax ({invoice.taxRate}%)
                </Text>
                <Text style={styles.totalsValue}>
                  {formatCurrency(invoice.taxAmount, currency)}
                </Text>
              </View>
            )}
            <View style={[styles.totalsFinalRow, { borderTopColor: accentColor }]}>
              <Text style={[styles.totalsFinalLabel, { color: accentColor }]}>
                Total
              </Text>
              <Text style={[styles.totalsFinalValue, { color: accentColor }]}>
                {formatCurrency(invoice.total, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes / Terms</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Signature */}
        {invoice.signatureDataUrl && (
          <View style={styles.signatureSection}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={invoice.signatureDataUrl} style={styles.signatureImage} />
            <Text style={styles.signatureLabel}>Authorized Signature</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerBar, { backgroundColor: accentColor }]} />
          <Text style={styles.footerText}>Generated by InvoSafi</Text>
        </View>
      </Page>
    </Document>
  );
}

// =============================================================================
// PDF Render Function
// =============================================================================

// Concurrency gate
let activePdfRenders = 0;
const MAX_CONCURRENT_PDF = 5;

export async function renderInvoicePdf(
  invoice: InvoiceWithItems,
  options: { showWatermark?: boolean } = {}
): Promise<Buffer> {
  if (activePdfRenders >= MAX_CONCURRENT_PDF) {
    throw new Error("PDF_BUSY");
  }

  activePdfRenders++;
  try {
    const buffer = await renderToBuffer(
      <InvoicePdf
        invoice={invoice}
        showWatermark={options.showWatermark ?? false}
      />
    );
    return Buffer.from(buffer);
  } finally {
    activePdfRenders--;
  }
}

export { InvoicePdf };
