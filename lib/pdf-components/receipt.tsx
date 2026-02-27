// lib/pdf-components/receipt.tsx — Client-safe ReceiptPdf (invoice-style layout)
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import type { ReceiptWithPhotos } from "@/lib/db/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank: "Bank Transfer",
  card: "Card",
  "": "—",
};

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  headerLeft: { flexDirection: "column" },
  logo: { width: 80, height: 80, objectFit: "contain", marginBottom: 10 },
  documentTitle: { fontSize: 28, fontWeight: "bold", letterSpacing: 1 },
  documentNumber: { fontSize: 10, color: "#666", marginTop: 4 },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  partyColumn: { width: "48%" },
  partyLabel: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#888", marginBottom: 6, letterSpacing: 1 },
  partyName: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  partyDetail: { fontSize: 9, color: "#444", marginBottom: 2 },
  datesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, backgroundColor: "#f8f9fa", padding: 12, borderRadius: 4 },
  dateItem: { flexDirection: "column" },
  dateLabel: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#888", marginBottom: 4 },
  dateValue: { fontSize: 10, fontWeight: "bold" },
  // Payment summary (replaces line items table)
  summaryTable: { marginBottom: 24, borderWidth: 0.5, borderColor: "#e5e5e5", borderRadius: 4 },
  summaryHeader: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" },
  summaryRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" },
  summaryRowLast: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12 },
  summaryLabel: { fontSize: 9, color: "#666", flex: 1 },
  summaryValue: { fontSize: 9, textAlign: "right", fontWeight: "bold" },
  headerText: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#fff", letterSpacing: 0.5 },
  // Totals area — amount received as the "grand total"
  totalsContainer: { alignItems: "flex-end", marginBottom: 24 },
  totalsTable: { width: "40%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalsLabel: { fontSize: 9, color: "#666" },
  totalsValue: { fontSize: 9, textAlign: "right" },
  totalsFinalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 2, marginTop: 4 },
  totalsFinalLabel: { fontSize: 13, fontWeight: "bold" },
  totalsFinalValue: { fontSize: 13, fontWeight: "bold", textAlign: "right" },
  // Payment info row
  paymentBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, marginBottom: 24 },
  paymentBarLabel: { fontSize: 10, color: "#fff", fontWeight: "bold" },
  paymentBarValue: { fontSize: 10, color: "#fff", fontWeight: "bold" },
  notesSection: { marginBottom: 24 },
  notesLabel: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#888", marginBottom: 6 },
  notesText: { fontSize: 9, color: "#444", lineHeight: 1.5 },
  signatureSection: { marginBottom: 24 },
  signatureImage: { width: 150, height: 60, objectFit: "contain" },
  signatureLabel: { fontSize: 8, color: "#888", marginTop: 4, borderTopWidth: 1, borderTopColor: "#ccc", paddingTop: 4, width: 150 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40 },
  footerBar: { height: 3, marginBottom: 8, borderRadius: 2 },
  footerText: { fontSize: 8, color: "#999", textAlign: "center" },
  watermark: { position: "absolute", top: "35%", left: "10%", transform: "rotate(-30deg)", fontSize: 60, color: "rgba(200, 200, 200, 0.3)", fontWeight: "bold", letterSpacing: 8 },
});

export interface ReceiptPdfProps {
  receipt: ReceiptWithPhotos;
  showWatermark?: boolean;
}

export function ReceiptPdf({ receipt, showWatermark = false }: ReceiptPdfProps) {
  const accentColor = receipt.accentColor || "#8b5cf6";
  const currency = receipt.currency || "KES";
  const outstandingBalance = receipt.outstandingBalance ?? 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {receipt.logoDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={receipt.logoDataUrl} style={styles.logo} />
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.documentTitle, { color: accentColor }]}>
              {receipt.documentTitle || "RECEIPT"}
            </Text>
            <Text style={styles.documentNumber}>{receipt.receiptNumber}</Text>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.partiesRow}>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{receipt.fromName}</Text>
            {receipt.fromEmail && <Text style={styles.partyDetail}>{receipt.fromEmail}</Text>}
            {receipt.fromPhone && <Text style={styles.partyDetail}>{receipt.fromPhone}</Text>}
            {receipt.fromAddress && <Text style={styles.partyDetail}>{receipt.fromAddress}</Text>}
            {(receipt.fromCity || receipt.fromZipCode) && (
              <Text style={styles.partyDetail}>{[receipt.fromCity, receipt.fromZipCode].filter(Boolean).join(", ")}</Text>
            )}
            {receipt.fromBusinessNumber && (
              <Text style={styles.partyDetail}>KRA PIN: {receipt.fromBusinessNumber}</Text>
            )}
          </View>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>Received From</Text>
            <Text style={styles.partyName}>{receipt.toName}</Text>
            {receipt.toEmail && <Text style={styles.partyDetail}>{receipt.toEmail}</Text>}
            {receipt.toPhone && <Text style={styles.partyDetail}>{receipt.toPhone}</Text>}
            {receipt.toAddress && <Text style={styles.partyDetail}>{receipt.toAddress}</Text>}
            {(receipt.toCity || receipt.toZipCode) && (
              <Text style={styles.partyDetail}>{[receipt.toCity, receipt.toZipCode].filter(Boolean).join(", ")}</Text>
            )}
          </View>
        </View>

        {/* Dates row */}
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{formatDate(receipt.issueDate)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Payment Method</Text>
            <Text style={styles.dateValue}>{PAYMENT_METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod || "—"}</Text>
          </View>
          {receipt.transactionCode && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Transaction Ref</Text>
              <Text style={styles.dateValue}>{receipt.transactionCode}</Text>
            </View>
          )}
        </View>

        {/* Payment summary table */}
        <View style={styles.summaryTable}>
          <View style={[styles.summaryHeader, { backgroundColor: accentColor }]}>
            <Text style={[styles.headerText, { flex: 1 }]}>Payment Details</Text>
            <Text style={[styles.headerText, { textAlign: "right", width: 120 }]}>Amount</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount Owed</Text>
            <Text style={styles.summaryValue}>{formatCurrency(receipt.totalAmountOwed, currency)}</Text>
          </View>

          {receipt.beingPaymentOf && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Being Payment Of</Text>
              <Text style={[styles.summaryValue, { fontWeight: "normal", fontSize: 8, color: "#555" }]}>{receipt.beingPaymentOf}</Text>
            </View>
          )}

          {receipt.amountInWords && (
            <View style={styles.summaryRowLast}>
              <Text style={styles.summaryLabel}>Amount in Words</Text>
              <Text style={[styles.summaryValue, { fontWeight: "normal", fontSize: 8, color: "#555", maxWidth: 200, textAlign: "right" }]}>{receipt.amountInWords}</Text>
            </View>
          )}
        </View>

        {/* Totals: Amount received as grand total, outstanding balance */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Owed</Text>
              <Text style={styles.totalsValue}>{formatCurrency(receipt.totalAmountOwed, currency)}</Text>
            </View>
            <View style={[styles.totalsFinalRow, { borderTopColor: accentColor }]}>
              <Text style={[styles.totalsFinalLabel, { color: accentColor }]}>Amount Received</Text>
              <Text style={[styles.totalsFinalValue, { color: accentColor }]}>{formatCurrency(receipt.amountReceived, currency)}</Text>
            </View>
            {outstandingBalance > 0 && (
              <View style={[styles.totalsRow, { paddingTop: 6 }]}>
                <Text style={[styles.totalsLabel, { color: "#b45309" }]}>Outstanding Balance</Text>
                <Text style={[styles.totalsValue, { color: "#b45309", fontWeight: "bold" }]}>{formatCurrency(outstandingBalance, currency)}</Text>
              </View>
            )}
            {outstandingBalance <= 0 && (
              <View style={[styles.totalsRow, { paddingTop: 6 }]}>
                <Text style={[styles.totalsLabel, { color: "#15803d" }]}>Outstanding Balance</Text>
                <Text style={[styles.totalsValue, { color: "#15803d", fontWeight: "bold" }]}>Nil</Text>
              </View>
            )}
          </View>
        </View>

        {receipt.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{receipt.notes}</Text>
          </View>
        )}

        {receipt.signatureDataUrl && (
          <View style={styles.signatureSection}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={receipt.signatureDataUrl} style={styles.signatureImage} />
            <Text style={styles.signatureLabel}>Authorized Signature</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={[styles.footerBar, { backgroundColor: accentColor }]} />
          <Text style={styles.footerText}>Generated by Invopap</Text>
        </View>

        {showWatermark && <Text fixed style={styles.watermark}>INVOPAP — PREVIEW</Text>}
      </Page>
    </Document>
  );
}
