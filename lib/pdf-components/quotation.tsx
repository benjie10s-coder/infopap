// lib/pdf-components/quotation.tsx — Client-safe QuotationPdf React component
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
import type { QuotationWithItems } from "@/lib/db/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

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
  table: { marginBottom: 24 },
  tableHeader: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 2 },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" },
  tableRowAlt: { backgroundColor: "#fafafa" },
  colNum: { width: "5%" },
  colDesc: { width: "45%" },
  colQty: { width: "15%", textAlign: "right" },
  colRate: { width: "15%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  headerText: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#fff", letterSpacing: 0.5 },
  cellText: { fontSize: 9 },
  cellDetail: { fontSize: 7, color: "#888", marginTop: 2 },
  totalsContainer: { alignItems: "flex-end", marginBottom: 24 },
  totalsTable: { width: "40%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalsLabel: { fontSize: 9, color: "#666" },
  totalsValue: { fontSize: 9, textAlign: "right" },
  totalsFinalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 2, marginTop: 4 },
  totalsFinalLabel: { fontSize: 13, fontWeight: "bold" },
  totalsFinalValue: { fontSize: 13, fontWeight: "bold", textAlign: "right" },
  notesSection: { marginBottom: 16 },
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

export interface QuotationPdfProps {
  quotation: QuotationWithItems;
  showWatermark?: boolean;
}

export function QuotationPdf({ quotation, showWatermark = false }: QuotationPdfProps) {
  const accentColor = quotation.accentColor || "#f97316";
  const currency = quotation.currency || "KES";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {quotation.logoDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={quotation.logoDataUrl} style={styles.logo} />
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.documentTitle, { color: accentColor }]}>
              {quotation.documentTitle || "QUOTATION"}
            </Text>
            <Text style={styles.documentNumber}>{quotation.quotationNumber}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>Quotation by</Text>
            <Text style={styles.partyName}>{quotation.fromName}</Text>
            {quotation.fromEmail && <Text style={styles.partyDetail}>{quotation.fromEmail}</Text>}
            {quotation.fromPhone && <Text style={styles.partyDetail}>{quotation.fromPhone}</Text>}
            {quotation.fromAddress && <Text style={styles.partyDetail}>{quotation.fromAddress}</Text>}
            {(quotation.fromCity || quotation.fromZipCode) && (
              <Text style={styles.partyDetail}>{[quotation.fromCity, quotation.fromZipCode].filter(Boolean).join(", ")}</Text>
            )}
            {quotation.fromBusinessNumber && (
              <Text style={styles.partyDetail}>KRA PIN: {quotation.fromBusinessNumber}</Text>
            )}
          </View>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>Quotation to</Text>
            <Text style={styles.partyName}>{quotation.toName}</Text>
            {quotation.toEmail && <Text style={styles.partyDetail}>{quotation.toEmail}</Text>}
            {quotation.toPhone && <Text style={styles.partyDetail}>{quotation.toPhone}</Text>}
            {quotation.toAddress && <Text style={styles.partyDetail}>{quotation.toAddress}</Text>}
            {(quotation.toCity || quotation.toZipCode) && (
              <Text style={styles.partyDetail}>{[quotation.toCity, quotation.toZipCode].filter(Boolean).join(", ")}</Text>
            )}
            {quotation.toBusinessNumber && (
              <Text style={styles.partyDetail}>KRA PIN: {quotation.toBusinessNumber}</Text>
            )}
          </View>
        </View>

        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Quotation Date</Text>
            <Text style={styles.dateValue}>{formatDate(quotation.quotationDate)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Valid Until</Text>
            <Text style={styles.dateValue}>{quotation.validUntil ? formatDate(quotation.validUntil) : "—"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: accentColor, borderBottomColor: accentColor }]}>
            <Text style={[styles.headerText, styles.colNum]}>#</Text>
            <Text style={[styles.headerText, styles.colDesc]}>Item description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colRate]}>Rate</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>
          {quotation.lineItems.map((item, index) => (
            <View key={item.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.cellText, styles.colNum]}>{index + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.cellText}>{item.description}</Text>
                {item.additionalDetails && <Text style={styles.cellDetail}>{item.additionalDetails}</Text>}
              </View>
              <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellText, styles.colRate]}>{formatCurrency(item.rate, currency)}</Text>
              <Text style={[styles.cellText, styles.colAmount]}>{formatCurrency(item.amount, currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Sub Total</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quotation.subtotal, currency)}</Text>
            </View>
            {quotation.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Discount{quotation.discountType === "PERCENTAGE" ? ` (${quotation.discountValue}%)` : ""}
                </Text>
                <Text style={[styles.totalsValue, { color: "#16a34a" }]}>
                  -{formatCurrency(quotation.discountAmount, currency)}
                </Text>
              </View>
            )}
            <View style={[styles.totalsFinalRow, { borderTopColor: accentColor }]}>
              <Text style={[styles.totalsFinalLabel, { color: accentColor }]}>Total</Text>
              <Text style={[styles.totalsFinalValue, { color: accentColor }]}>{formatCurrency(quotation.total, currency)}</Text>
            </View>
          </View>
        </View>

        {quotation.termsAndConditions && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Terms and Conditions</Text>
            <Text style={styles.notesText}>{quotation.termsAndConditions}</Text>
          </View>
        )}

        {quotation.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Additional Notes</Text>
            <Text style={styles.notesText}>{quotation.notes}</Text>
          </View>
        )}

        {quotation.signatureDataUrl && (
          <View style={styles.signatureSection}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={quotation.signatureDataUrl} style={styles.signatureImage} />
            <Text style={styles.signatureLabel}>Authorized Signature</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={[styles.footerBar, { backgroundColor: accentColor }]} />
          <Text style={styles.footerText}>Generated by InvoSafi</Text>
        </View>

        {showWatermark && <Text fixed style={styles.watermark}>INVOSAFI — PREVIEW</Text>}
      </Page>
    </Document>
  );
}
