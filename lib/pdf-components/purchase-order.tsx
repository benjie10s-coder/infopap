// lib/pdf-components/purchase-order.tsx — Client-safe PurchaseOrderPdf (invoice-style layout)
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
import type { PurchaseOrderWithItems } from "@/lib/db/types";
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
  // Parties — 3-column when shipTo is enabled
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  partyColumn: { width: "48%" },
  partyColumnThird: { width: "31%" },
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
  notesSection: { marginBottom: 24 },
  notesLabel: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#888", marginBottom: 6 },
  notesText: { fontSize: 9, color: "#444", lineHeight: 1.5 },
  signatureSection: { marginBottom: 24 },
  signatureImage: { width: 150, height: 60, objectFit: "contain" },
  signatureLabel: { fontSize: 8, color: "#888", marginTop: 4, borderTopWidth: 1, borderTopColor: "#ccc", paddingTop: 4, width: 150 },
  authorizedByLabel: { fontSize: 8, color: "#888", marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40 },
  footerBar: { height: 3, marginBottom: 8, borderRadius: 2 },
  footerText: { fontSize: 8, color: "#999", textAlign: "center" },
  watermark: { position: "absolute", top: "35%", left: "10%", transform: "rotate(-30deg)", fontSize: 60, color: "rgba(200, 200, 200, 0.3)", fontWeight: "bold", letterSpacing: 8 },
});

export interface PurchaseOrderPdfProps {
  purchaseOrder: PurchaseOrderWithItems;
  showWatermark?: boolean;
}

export function PurchaseOrderPdf({ purchaseOrder: po, showWatermark = false }: PurchaseOrderPdfProps) {
  const accentColor = po.accentColor || "#d97706";
  const currency = po.currency || "KES";
  const colWidth = po.shipToEnabled ? styles.partyColumnThird : styles.partyColumn;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {po.logoDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={po.logoDataUrl} style={styles.logo} />
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.documentTitle, { color: accentColor }]}>
              {po.documentTitle || "PURCHASE ORDER"}
            </Text>
            <Text style={styles.documentNumber}>{po.purchaseOrderNumber}</Text>
          </View>
        </View>

        {/* Parties: From | Vendor (To) [| Ship To] */}
        <View style={styles.partiesRow}>
          <View style={colWidth}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{po.fromName}</Text>
            {po.fromEmail && <Text style={styles.partyDetail}>{po.fromEmail}</Text>}
            {po.fromPhone && <Text style={styles.partyDetail}>{po.fromPhone}</Text>}
            {po.fromAddress && <Text style={styles.partyDetail}>{po.fromAddress}</Text>}
            {(po.fromCity || po.fromZipCode) && (
              <Text style={styles.partyDetail}>{[po.fromCity, po.fromZipCode].filter(Boolean).join(", ")}</Text>
            )}
            {po.fromBusinessNumber && (
              <Text style={styles.partyDetail}>KRA PIN: {po.fromBusinessNumber}</Text>
            )}
          </View>
          <View style={colWidth}>
            <Text style={styles.partyLabel}>Vendor / Supplier</Text>
            <Text style={styles.partyName}>{po.toName}</Text>
            {po.toEmail && <Text style={styles.partyDetail}>{po.toEmail}</Text>}
            {po.toPhone && <Text style={styles.partyDetail}>{po.toPhone}</Text>}
            {po.toAddress && <Text style={styles.partyDetail}>{po.toAddress}</Text>}
            {(po.toCity || po.toZipCode) && (
              <Text style={styles.partyDetail}>{[po.toCity, po.toZipCode].filter(Boolean).join(", ")}</Text>
            )}
            {po.toBusinessNumber && (
              <Text style={styles.partyDetail}>KRA PIN: {po.toBusinessNumber}</Text>
            )}
          </View>
          {po.shipToEnabled && (
            <View style={colWidth}>
              <Text style={styles.partyLabel}>Ship To</Text>
              {po.shipToName && <Text style={styles.partyName}>{po.shipToName}</Text>}
              {po.shipToCompanyName && <Text style={styles.partyDetail}>{po.shipToCompanyName}</Text>}
              {po.shipToAddress && <Text style={styles.partyDetail}>{po.shipToAddress}</Text>}
              {(po.shipToCity || po.shipToZipCode) && (
                <Text style={styles.partyDetail}>{[po.shipToCity, po.shipToZipCode].filter(Boolean).join(", ")}</Text>
              )}
              {po.shipToPhone && <Text style={styles.partyDetail}>{po.shipToPhone}</Text>}
            </View>
          )}
        </View>

        {/* Dates row */}
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Issue Date</Text>
            <Text style={styles.dateValue}>{formatDate(po.issueDate)}</Text>
          </View>
          {po.expectedDeliveryDate && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Expected Delivery</Text>
              <Text style={styles.dateValue}>{formatDate(po.expectedDeliveryDate)}</Text>
            </View>
          )}
          {po.orderNumber && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Order / Ref No.</Text>
              <Text style={styles.dateValue}>{po.orderNumber}</Text>
            </View>
          )}
          {po.paymentTerms && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Payment Terms</Text>
              <Text style={styles.dateValue}>{po.paymentTerms}</Text>
            </View>
          )}
        </View>

        {/* Line items table: # | Description | Qty | Unit Price | Amount */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: accentColor, borderBottomColor: accentColor }]}>
            <Text style={[styles.headerText, styles.colNum]}>#</Text>
            <Text style={[styles.headerText, styles.colDesc]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colRate]}>Unit Price</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>
          {po.lineItems.map((item, index) => (
            <View key={item.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.cellText, styles.colNum]}>{index + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.cellText}>{item.description}</Text>
                {item.additionalDetails && <Text style={styles.cellDetail}>{item.additionalDetails}</Text>}
              </View>
              <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellText, styles.colRate]}>{formatCurrency(item.unitPrice, currency)}</Text>
              <Text style={[styles.cellText, styles.colAmount]}>{formatCurrency(item.amount, currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(po.subtotal, currency)}</Text>
            </View>
            {po.taxAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax ({po.taxRate}%)</Text>
                <Text style={styles.totalsValue}>{formatCurrency(po.taxAmount, currency)}</Text>
              </View>
            )}
            <View style={[styles.totalsFinalRow, { borderTopColor: accentColor }]}>
              <Text style={[styles.totalsFinalLabel, { color: accentColor }]}>Total</Text>
              <Text style={[styles.totalsFinalValue, { color: accentColor }]}>{formatCurrency(po.total, currency)}</Text>
            </View>
          </View>
        </View>

        {po.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{po.notes}</Text>
          </View>
        )}

        {/* Signature / Authorized By */}
        {(po.signatureDataUrl || po.authorizedByName) && (
          <View style={styles.signatureSection}>
            {po.signatureDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={po.signatureDataUrl} style={styles.signatureImage} />
            )}
            <Text style={styles.signatureLabel}>
              {po.authorizedByName ? po.authorizedByName : "Authorized Signature"}
            </Text>
            {po.authorizedByDesignation && (
              <Text style={styles.authorizedByLabel}>{po.authorizedByDesignation}</Text>
            )}
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
