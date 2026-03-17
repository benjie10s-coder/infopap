// components/html-preview/shared.tsx — Shared building blocks for HTML document previews
import type { ReactNode } from "react";
import type { InvoiceParty } from "@/lib/store/invoiceStore";
import { formatDate, formatCurrency } from "@/lib/utils/format";

/* ─── Header ───────────────────────────────────────────────── */

interface PreviewHeaderProps {
  logoDataUrl: string | null;
  title: string;
  number: string;
  accentColor: string;
}

export function PreviewHeader({ logoDataUrl, title, number, accentColor }: PreviewHeaderProps) {
  return (
    <div className="flex justify-between" style={{ marginBottom: 30 }}>
      <div className="flex flex-col">
        {logoDataUrl && (
          <img
            src={logoDataUrl}
            alt="Logo"
            className="object-contain"
            style={{ width: 80, height: 80, marginBottom: 10 }}
          />
        )}
      </div>
      <div className="flex flex-col items-end">
        <span
          className="font-bold"
          style={{ fontSize: 28, letterSpacing: 1, color: accentColor }}
        >
          {title}
        </span>
        <span style={{ fontSize: 10, color: "#666", marginTop: 4 }}>{number}</span>
      </div>
    </div>
  );
}

/* ─── Party Column ─────────────────────────────────────────── */

interface PartyColumnProps {
  label: string;
  party: InvoiceParty;
  width?: string;
}

export function PartyColumn({ label, party, width = "48%" }: PartyColumnProps) {
  return (
    <div style={{ width }}>
      <div
        className="font-bold uppercase"
        style={{ fontSize: 8, color: "#888", marginBottom: 6, letterSpacing: 1 }}
      >
        {label}
      </div>
      <div className="font-bold" style={{ fontSize: 12, marginBottom: 4 }}>
        {party.name}
      </div>
      {party.email && (
        <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>{party.email}</div>
      )}
      {party.phone && (
        <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>{party.phone}</div>
      )}
      {party.address && (
        <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>{party.address}</div>
      )}
      {(party.city || party.zipCode) && (
        <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>
          {[party.city, party.zipCode].filter(Boolean).join(", ")}
        </div>
      )}
      {party.businessNumber && (
        <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>
          KRA PIN: {party.businessNumber}
        </div>
      )}
    </div>
  );
}

/* ─── Parties Row ──────────────────────────────────────────── */

interface PreviewPartiesProps {
  children: ReactNode;
}

export function PreviewParties({ children }: PreviewPartiesProps) {
  return (
    <div className="flex justify-between" style={{ marginBottom: 24 }}>
      {children}
    </div>
  );
}

/* ─── Info Bar ─────────────────────────────────────────────── */

interface InfoItem {
  label: string;
  value: string;
}

interface PreviewInfoBarProps {
  items: InfoItem[];
}

export function PreviewInfoBar({ items }: PreviewInfoBarProps) {
  return (
    <div
      className="flex justify-between rounded"
      style={{ marginBottom: 24, backgroundColor: "#f8f9fa", padding: 12, borderRadius: 4 }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <span
            className="font-bold uppercase"
            style={{ fontSize: 8, color: "#888", marginBottom: 4 }}
          >
            {item.label}
          </span>
          <span className="font-bold" style={{ fontSize: 10 }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Line Items Table ─────────────────────────────────────── */

export interface LineItemColumn {
  key: string;
  label: string;
  width: string;
  align?: "left" | "right";
}

export interface LineItemRow {
  id: string;
  cells: Record<string, string>;
  additionalDetails?: string;
}

interface PreviewLineItemsTableProps {
  columns: LineItemColumn[];
  rows: LineItemRow[];
  accentColor: string;
}

export function PreviewLineItemsTable({
  columns,
  rows,
  accentColor,
}: PreviewLineItemsTableProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header */}
      <div
        className="flex"
        style={{
          backgroundColor: accentColor,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 8,
          paddingRight: 8,
          borderBottom: `2px solid ${accentColor}`,
        }}
      >
        {columns.map((col) => (
          <span
            key={col.key}
            className="font-bold uppercase"
            style={{
              width: col.width,
              fontSize: 8,
              color: "#fff",
              letterSpacing: 0.5,
              textAlign: col.align || "left",
            }}
          >
            {col.label}
          </span>
        ))}
      </div>
      {/* Rows */}
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="flex"
          style={{
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 8,
            paddingRight: 8,
            borderBottom: "0.5px solid #e5e5e5",
            backgroundColor: index % 2 === 1 ? "#fafafa" : "transparent",
          }}
        >
          {columns.map((col) => (
            <span
              key={col.key}
              style={{
                width: col.width,
                fontSize: 9,
                textAlign: col.align || "left",
              }}
            >
              {col.key === "description" ? (
                <span className="flex flex-col" style={{ width: "100%" }}>
                  <span style={{ fontSize: 9 }}>{row.cells[col.key]}</span>
                  {row.additionalDetails && (
                    <span style={{ fontSize: 7, color: "#888", marginTop: 2 }}>
                      {row.additionalDetails}
                    </span>
                  )}
                </span>
              ) : (
                row.cells[col.key]
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Totals ───────────────────────────────────────────────── */

export interface TotalsLine {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}

interface PreviewTotalsProps {
  lines: TotalsLine[];
  finalLabel: string;
  finalValue: string;
  accentColor: string;
  extraLines?: TotalsLine[];
}

export function PreviewTotals({
  lines,
  finalLabel,
  finalValue,
  accentColor,
  extraLines,
}: PreviewTotalsProps) {
  return (
    <div className="flex justify-end" style={{ marginBottom: 24 }}>
      <div style={{ width: "40%" }}>
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex justify-between"
            style={{ paddingTop: 4, paddingBottom: 4 }}
          >
            <span style={{ fontSize: 9, color: line.color || "#666" }}>{line.label}</span>
            <span
              style={{
                fontSize: 9,
                textAlign: "right",
                color: line.color,
                fontWeight: line.bold ? "bold" : undefined,
              }}
            >
              {line.value}
            </span>
          </div>
        ))}
        <div
          className="flex justify-between"
          style={{
            paddingTop: 8,
            paddingBottom: 8,
            borderTop: `2px solid ${accentColor}`,
            marginTop: 4,
          }}
        >
          <span className="font-bold" style={{ fontSize: 13, color: accentColor }}>
            {finalLabel}
          </span>
          <span
            className="font-bold"
            style={{ fontSize: 13, textAlign: "right", color: accentColor }}
          >
            {finalValue}
          </span>
        </div>
        {extraLines?.map((line) => (
          <div
            key={line.label}
            className="flex justify-between"
            style={{ paddingTop: 6 }}
          >
            <span
              style={{ fontSize: 9, color: line.color || "#666", fontWeight: line.bold ? "bold" : undefined }}
            >
              {line.label}
            </span>
            <span
              style={{
                fontSize: 9,
                textAlign: "right",
                color: line.color,
                fontWeight: line.bold ? "bold" : undefined,
              }}
            >
              {line.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Notes ────────────────────────────────────────────────── */

interface PreviewNotesProps {
  label: string;
  text: string;
}

export function PreviewNotes({ label, text }: PreviewNotesProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="font-bold uppercase"
        style={{ fontSize: 8, color: "#888", marginBottom: 6 }}
      >
        {label}
      </div>
      <div style={{ fontSize: 9, color: "#444", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {text}
      </div>
    </div>
  );
}

/* ─── Signature ────────────────────────────────────────────── */

interface PreviewSignatureProps {
  signatureDataUrl: string;
  label?: string;
  sublabel?: string;
}

export function PreviewSignature({ signatureDataUrl, label = "Authorized Signature", sublabel }: PreviewSignatureProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {signatureDataUrl && (
        <img
          src={signatureDataUrl}
          alt="Signature"
          className="object-contain"
          style={{ width: 150, height: 60 }}
        />
      )}
      <div
        style={{
          fontSize: 8,
          color: "#888",
          marginTop: 4,
          borderTop: "1px solid #ccc",
          paddingTop: 4,
          width: 150,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 8, color: "#888", marginTop: 2 }}>{sublabel}</div>
      )}
    </div>
  );
}

/* ─── Photos Gallery ───────────────────────────────────────── */

interface PreviewPhotosProps {
  photoDataUrls: string[];
}

export function PreviewPhotos({ photoDataUrls }: PreviewPhotosProps) {
  if (photoDataUrls.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="font-bold uppercase"
        style={{ fontSize: 8, color: "#888", marginBottom: 6 }}
      >
        Attached Photos
      </div>
      <div className="flex flex-wrap gap-2">
        {photoDataUrls.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Photo ${i + 1}`}
            className="object-cover rounded"
            style={{ width: 80, height: 80 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Footer ───────────────────────────────────────────────── */

interface PreviewFooterProps {
  accentColor: string;
}

export function PreviewFooter({ accentColor }: PreviewFooterProps) {
  return (
    <div style={{ marginTop: 40 }}>
      <div
        style={{ height: 3, marginBottom: 8, borderRadius: 2, backgroundColor: accentColor }}
      />
      <div style={{ fontSize: 8, color: "#999", textAlign: "center" }}>
        Generated by Invopap
      </div>
    </div>
  );
}

/* ─── Watermark ────────────────────────────────────────────── */

export function PreviewWatermark() {
  return (
    <div
      className="pointer-events-none select-none"
      style={{
        position: "absolute",
        top: "35%",
        left: "10%",
        transform: "rotate(-30deg)",
        fontSize: 60,
        color: "rgba(200, 200, 200, 0.3)",
        fontWeight: "bold",
        letterSpacing: 8,
        whiteSpace: "nowrap",
      }}
    >
      INVOPAP — PREVIEW
    </div>
  );
}

/* ─── Payment Bar ──────────────────────────────────────────── */

interface PreviewPaymentBarProps {
  label: string;
  value: string;
  accentColor: string;
}

export function PreviewPaymentBar({ label, value, accentColor }: PreviewPaymentBarProps) {
  return (
    <div
      className="flex justify-between items-center rounded"
      style={{
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: accentColor,
        marginBottom: 24,
      }}
    >
      <span className="font-bold" style={{ fontSize: 10, color: "#fff" }}>
        {label}
      </span>
      <span className="font-bold" style={{ fontSize: 10, color: "#fff" }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Summary Table (Receipt) ──────────────────────────────── */

export interface SummaryRow {
  label: string;
  value: string;
  small?: boolean;
}

interface PreviewSummaryTableProps {
  rows: SummaryRow[];
  accentColor: string;
}

export function PreviewSummaryTable({ rows, accentColor }: PreviewSummaryTableProps) {
  return (
    <div
      style={{
        marginBottom: 24,
        border: "0.5px solid #e5e5e5",
        borderRadius: 4,
      }}
    >
      <div
        className="flex"
        style={{
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 12,
          paddingRight: 12,
          backgroundColor: accentColor,
          borderBottom: "0.5px solid #e5e5e5",
        }}
      >
        <span
          className="font-bold uppercase flex-1"
          style={{ fontSize: 8, color: "#fff", letterSpacing: 0.5 }}
        >
          Payment Details
        </span>
        <span
          className="font-bold uppercase"
          style={{ fontSize: 8, color: "#fff", letterSpacing: 0.5, width: 120, textAlign: "right" }}
        >
          Amount
        </span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className="flex"
          style={{
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 12,
            paddingRight: 12,
            borderBottom: i < rows.length - 1 ? "0.5px solid #e5e5e5" : undefined,
          }}
        >
          <span className="flex-1" style={{ fontSize: 9, color: "#666" }}>
            {row.label}
          </span>
          <span
            style={{
              fontSize: row.small ? 8 : 9,
              color: row.small ? "#555" : undefined,
              fontWeight: row.small ? "normal" : "bold",
              textAlign: "right",
              maxWidth: 200,
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
