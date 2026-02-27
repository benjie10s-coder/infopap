// lib/pdf-components/delivery-note.tsx — Client-safe DeliveryNotePdf React component
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
import type { DeliveryNoteWithItems } from "@/lib/db/types";
import { formatDate } from "@/lib/utils/format";

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
  colNum: { width: "8%" },
  colDesc: { width: "72%" },
  colQty: { width: "20%", textAlign: "right" },
  headerText: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#fff", letterSpacing: 0.5 },
  cellText: { fontSize: 9 },
  cellDetail: { fontSize: 7, color: "#888", marginTop: 2 },
  acknowledgmentBar: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, marginBottom: 24 },
  acknowledgmentText: { fontSize: 10, color: "#fff", fontWeight: "bold" },
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

export interface DeliveryNotePdfProps {
  deliveryNote: DeliveryNoteWithItems;
  showWatermark?: boolean;
}

export function DeliveryNotePdf({ deliveryNote, showWatermark = false }: DeliveryNotePdfProps) {
  const accentColor = deliveryNote.accentColor || "#0d9488";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {deliveryNote.logoDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={deliveryNote.logoDataUrl} style={styles.logo} />
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.documentTitle, { color: accentColor }]}>
              {deliveryNote.documentTitle || "DELIVERY NOTE"}
            </Text>
            <Text style={styles.documentNumber}>{deliveryNote.deliveryNoteNumber}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{deliveryNote.fromName}</Text>
            {deliveryNote.fromEmail && <Text style={styles.partyDetail}>{deliveryNote.fromEmail}</Text>}
            {deliveryNote.fromPhone && <Text style={styles.partyDetail}>{deliveryNote.fromPhone}</Text>}
            {deliveryNote.fromAddress && <Text style={styles.partyDetail}>{deliveryNote.fromAddress}</Text>}
            {(deliveryNote.fromCity || deliveryNote.fromZipCode) && (
              <Text style={styles.partyDetail}>{[deliveryNote.fromCity, deliveryNote.fromZipCode].filter(Boolean).join(", ")}</Text>
            )}
            {deliveryNote.fromBusinessNumber && (
              <Text style={styles.partyDetail}>KRA PIN: {deliveryNote.fromBusinessNumber}</Text>
            )}
          </View>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>Deliver To</Text>
            <Text style={styles.partyName}>{deliveryNote.toName}</Text>
            {deliveryNote.toEmail && <Text style={styles.partyDetail}>{deliveryNote.toEmail}</Text>}
            {deliveryNote.toPhone && <Text style={styles.partyDetail}>{deliveryNote.toPhone}</Text>}
            {deliveryNote.toAddress && <Text style={styles.partyDetail}>{deliveryNote.toAddress}</Text>}
            {(deliveryNote.toCity || deliveryNote.toZipCode) && (
              <Text style={styles.partyDetail}>{[deliveryNote.toCity, deliveryNote.toZipCode].filter(Boolean).join(", ")}</Text>
            )}
            {deliveryNote.toBusinessNumber && (
              <Text style={styles.partyDetail}>KRA PIN: {deliveryNote.toBusinessNumber}</Text>
            )}
          </View>
        </View>

        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{formatDate(deliveryNote.issueDate)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Order No.</Text>
            <Text style={styles.dateValue}>{deliveryNote.orderNumber || "—"}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Invoice No.</Text>
            <Text style={styles.dateValue}>{deliveryNote.referenceInvoiceNumber || "—"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: accentColor, borderBottomColor: accentColor }]}>
            <Text style={[styles.headerText, styles.colNum]}>#</Text>
            <Text style={[styles.headerText, styles.colDesc]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
          </View>
          {deliveryNote.lineItems.map((item, index) => (
            <View key={item.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.cellText, styles.colNum]}>{index + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.cellText}>{item.description}</Text>
                {item.additionalDetails && <Text style={styles.cellDetail}>{item.additionalDetails}</Text>}
              </View>
              <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.acknowledgmentBar, { backgroundColor: accentColor }]}>
          <Text style={styles.acknowledgmentText}>
            {deliveryNote.acknowledgmentText || "Received By: ________________________________  Date: ______________"}
          </Text>
        </View>

        {deliveryNote.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{deliveryNote.notes}</Text>
          </View>
        )}

        {deliveryNote.signatureDataUrl && (
          <View style={styles.signatureSection}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={deliveryNote.signatureDataUrl} style={styles.signatureImage} />
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
