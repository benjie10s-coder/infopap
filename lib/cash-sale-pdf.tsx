// lib/cash-sale-pdf.tsx — PDF template for Cash Sales (separate from invoice PDF)
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
import type { CashSaleWithItems } from "@/lib/db/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";

// =============================================================================
// Font Registration
// =============================================================================

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

// =============================================================================
// Payment Method Labels
// =============================================================================

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank: "Bank Transfer",
  card: "Card",
};

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
  // Reference row
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
  // Table — 5 columns: #, Description, Qty, Rate, Amount
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
  // Payment method bar
  paymentBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 24,
  },
  paymentBarLabel: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  paymentBarValue: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
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
// PDF Document Component
// =============================================================================

interface CashSalePdfProps {
  cashSale: CashSaleWithItems;
  showWatermark?: boolean;
}

function CashSalePdf({ cashSale, showWatermark = false }: CashSalePdfProps) {
  const accentColor = cashSale.accentColor || "#22c55e";
  const currency = cashSale.currency || "KES";

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
            {cashSale.logoDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={cashSale.logoDataUrl} style={styles.logo} />
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.documentTitle, { color: accentColor }]}>
              {cashSale.documentTitle || "CASH SALE"}
            </Text>
            <Text style={styles.documentNumber}>
              {cashSale.cashSaleNumber}
            </Text>
          </View>
        </View>

        {/* From / Sold To */}
        <View style={styles.partiesRow}>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{cashSale.fromName}</Text>
            {cashSale.fromEmail && (
              <Text style={styles.partyDetail}>{cashSale.fromEmail}</Text>
            )}
            {cashSale.fromPhone && (
              <Text style={styles.partyDetail}>{cashSale.fromPhone}</Text>
            )}
            {cashSale.fromAddress && (
              <Text style={styles.partyDetail}>{cashSale.fromAddress}</Text>
            )}
            {(cashSale.fromCity || cashSale.fromZipCode) && (
              <Text style={styles.partyDetail}>
                {[cashSale.fromCity, cashSale.fromZipCode].filter(Boolean).join(", ")}
              </Text>
            )}
            {cashSale.fromBusinessNumber && (
              <Text style={styles.partyDetail}>
                KRA PIN: {cashSale.fromBusinessNumber}
              </Text>
            )}
          </View>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>Sold To</Text>
            <Text style={styles.partyName}>{cashSale.toName}</Text>
            {cashSale.toEmail && (
              <Text style={styles.partyDetail}>{cashSale.toEmail}</Text>
            )}
            {cashSale.toPhone && (
              <Text style={styles.partyDetail}>{cashSale.toPhone}</Text>
            )}
            {cashSale.toAddress && (
              <Text style={styles.partyDetail}>{cashSale.toAddress}</Text>
            )}
            {(cashSale.toCity || cashSale.toZipCode) && (
              <Text style={styles.partyDetail}>
                {[cashSale.toCity, cashSale.toZipCode].filter(Boolean).join(", ")}
              </Text>
            )}
            {cashSale.toBusinessNumber && (
              <Text style={styles.partyDetail}>
                KRA PIN: {cashSale.toBusinessNumber}
              </Text>
            )}
          </View>
        </View>

        {/* Reference Row: Date, Order No., Invoice No. */}
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>
              {formatDate(cashSale.issueDate)}
            </Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Order No.</Text>
            <Text style={styles.dateValue}>
              {cashSale.orderNumber || "—"}
            </Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Invoice No.</Text>
            <Text style={styles.dateValue}>
              {cashSale.referenceInvoiceNumber || "—"}
            </Text>
          </View>
        </View>

        {/* Line Items Table — 5 columns with Rate and Amount */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: accentColor, borderBottomColor: accentColor }]}>
            <Text style={[styles.headerText, styles.colNum]}>#</Text>
            <Text style={[styles.headerText, styles.colDesc]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colRate]}>Rate</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>

          {cashSale.lineItems.map((item, index) => (
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
                {formatCurrency(cashSale.subtotal, currency)}
              </Text>
            </View>
            {cashSale.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Discount
                  {cashSale.discountType === "PERCENTAGE"
                    ? ` (${cashSale.discountValue}%)`
                    : ""}
                </Text>
                <Text style={[styles.totalsValue, { color: "#16a34a" }]}>
                  -{formatCurrency(cashSale.discountAmount, currency)}
                </Text>
              </View>
            )}
            {cashSale.taxAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Tax ({cashSale.taxRate}%)
                </Text>
                <Text style={styles.totalsValue}>
                  {formatCurrency(cashSale.taxAmount, currency)}
                </Text>
              </View>
            )}
            <View style={[styles.totalsFinalRow, { borderTopColor: accentColor }]}>
              <Text style={[styles.totalsFinalLabel, { color: accentColor }]}>
                Total
              </Text>
              <Text style={[styles.totalsFinalValue, { color: accentColor }]}>
                {formatCurrency(cashSale.total, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method Bar */}
        <View style={[styles.paymentBar, { backgroundColor: accentColor }]}>
          <Text style={styles.paymentBarLabel}>Payment Method</Text>
          <Text style={styles.paymentBarValue}>
            {PAYMENT_METHOD_LABELS[cashSale.paymentMethod] || cashSale.paymentMethod}
            {cashSale.transactionCode
              ? `  •  Ref: ${cashSale.transactionCode}`
              : ""}
          </Text>
        </View>

        {/* Notes */}
        {cashSale.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{cashSale.notes}</Text>
          </View>
        )}

        {/* Signature */}
        {cashSale.signatureDataUrl && (
          <View style={styles.signatureSection}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={cashSale.signatureDataUrl} style={styles.signatureImage} />
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

let activePdfRenders = 0;
const MAX_CONCURRENT_PDF = 5;

export async function renderCashSalePdf(
  cashSale: CashSaleWithItems,
  options: { showWatermark?: boolean } = {}
): Promise<Buffer> {
  if (activePdfRenders >= MAX_CONCURRENT_PDF) {
    throw new Error("PDF_BUSY");
  }

  activePdfRenders++;
  try {
    const buffer = await renderToBuffer(
      <CashSalePdf
        cashSale={cashSale}
        showWatermark={options.showWatermark ?? false}
      />
    );
    return Buffer.from(buffer);
  } finally {
    activePdfRenders--;
  }
}

export { CashSalePdf };
