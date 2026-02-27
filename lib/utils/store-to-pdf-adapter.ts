/**
 * lib/utils/store-to-pdf-adapter.ts
 * Converts Zustand editor store state to the DB record types expected by PDF components.
 * These are used for client-side preview rendering only — totals are recalculated
 * from live store state so the preview always reflects current values.
 */
import type { InvoiceWithItems, QuotationWithItems, CashSaleWithItems, DeliveryNoteWithItems, PurchaseOrderWithItems, ReceiptWithPhotos } from "@/lib/db/types";
import { calculateInvoiceTotals } from "@/lib/utils/totals";
import { calculateQuotationTotals } from "@/lib/utils/quotation-totals";
import { calculatePurchaseOrderTotals } from "@/lib/utils/purchase-order-totals";

// ─── Dummy DB meta fields ──────────────────────────────────────────────────
const DUMMY = {
  id: "preview",
  publicId: "preview",
  userId: null,
  guestSessionId: null,
  isPaid: false,
  paidAt: null,
  pdfUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Invoice ──────────────────────────────────────────────────────────────

export function invoiceStoreToRecord(store: {
  documentTitle: string;
  documentType: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  from: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  to: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  notes: string;
  taxRate: number;
  discountType: string;
  discountValue: number;
  currency: { code: string };
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  items: { id: string; description: string; additionalDetails: string; quantity: number; rate: number }[];
}): InvoiceWithItems {
  const totals = calculateInvoiceTotals({
    items: store.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
    taxRate: store.taxRate,
    discountType: store.discountType === "percentage" ? "PERCENTAGE" : "FIXED",
    discountValue: store.discountValue,
  });

  return {
    ...DUMMY,
    documentTitle: store.documentTitle,
    documentType: store.documentType,
    invoiceNumber: store.invoiceNumber,
    issueDate: store.issueDate,
    dueDate: store.dueDate || null,
    paymentTerms: store.paymentTerms,
    fromName: store.from.name,
    fromEmail: store.from.email || null,
    fromPhone: store.from.phone || null,
    fromMobile: store.from.mobile || null,
    fromFax: store.from.fax || null,
    fromAddress: store.from.address || null,
    fromCity: store.from.city || null,
    fromZipCode: store.from.zipCode || null,
    fromBusinessNumber: store.from.businessNumber || null,
    toName: store.to.name,
    toEmail: store.to.email || null,
    toPhone: store.to.phone || null,
    toMobile: store.to.mobile || null,
    toFax: store.to.fax || null,
    toAddress: store.to.address || null,
    toCity: store.to.city || null,
    toZipCode: store.to.zipCode || null,
    toBusinessNumber: store.to.businessNumber || null,
    currency: store.currency.code,
    taxRate: store.taxRate,
    discountType: store.discountType === "percentage" ? "PERCENTAGE" : "FIXED",
    discountValue: store.discountValue,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    discountAmount: totals.discountAmount,
    total: totals.total,
    accentColor: store.accentColor,
    logoDataUrl: store.logoDataUrl,
    signatureDataUrl: store.signatureDataUrl,
    notes: store.notes || null,
    lineItems: store.items.map((item, i) => ({
      id: item.id,
      invoiceId: "preview",
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      rate: item.rate,
      amount: totals.lineAmounts[i] ?? 0,
      sortOrder: i,
      createdAt: DUMMY.createdAt,
      updatedAt: DUMMY.updatedAt,
    })),
    photos: [],
  };
}

// ─── Quotation ────────────────────────────────────────────────────────────

export function quotationStoreToRecord(store: {
  documentTitle: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  from: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  to: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  termsAndConditions: string;
  notes: string;
  discountType: string;
  discountValue: number;
  currency: { code: string };
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  items: { id: string; description: string; additionalDetails: string; quantity: number; rate: number }[];
}): QuotationWithItems {
  const totals = calculateQuotationTotals({
    items: store.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
    discountType: store.discountType === "percentage" ? "PERCENTAGE" : "FIXED",
    discountValue: store.discountValue,
  });

  return {
    ...DUMMY,
    documentTitle: store.documentTitle,
    quotationNumber: store.quotationNumber,
    quotationDate: store.quotationDate,
    validUntil: store.validUntil || null,
    fromName: store.from.name,
    fromEmail: store.from.email || null,
    fromPhone: store.from.phone || null,
    fromMobile: store.from.mobile || null,
    fromFax: store.from.fax || null,
    fromAddress: store.from.address || null,
    fromCity: store.from.city || null,
    fromZipCode: store.from.zipCode || null,
    fromBusinessNumber: store.from.businessNumber || null,
    toName: store.to.name,
    toEmail: store.to.email || null,
    toPhone: store.to.phone || null,
    toMobile: store.to.mobile || null,
    toFax: store.to.fax || null,
    toAddress: store.to.address || null,
    toCity: store.to.city || null,
    toZipCode: store.to.zipCode || null,
    toBusinessNumber: store.to.businessNumber || null,
    currency: store.currency.code,
    discountType: store.discountType === "percentage" ? "PERCENTAGE" : "FIXED",
    discountValue: store.discountValue,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    total: totals.total,
    accentColor: store.accentColor,
    logoDataUrl: store.logoDataUrl,
    signatureDataUrl: store.signatureDataUrl,
    termsAndConditions: store.termsAndConditions || null,
    notes: store.notes || null,
    lineItems: store.items.map((item, i) => ({
      id: item.id,
      quotationId: "preview",
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      rate: item.rate,
      amount: totals.lineAmounts[i] ?? 0,
      sortOrder: i,
      createdAt: DUMMY.createdAt,
      updatedAt: DUMMY.updatedAt,
    })),
    photos: [],
  };
}

// ─── Cash Sale ────────────────────────────────────────────────────────────

export function cashSaleStoreToRecord(store: {
  documentTitle: string;
  cashSaleNumber: string;
  issueDate: string;
  orderNumber: string;
  referenceInvoiceNumber: string;
  paymentMethod: string;
  transactionCode: string;
  from: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  to: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  notes: string;
  taxRate: number;
  discountType: string;
  discountValue: number;
  currency: { code: string };
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  items: { id: string; description: string; additionalDetails: string; quantity: number; rate: number }[];
}): CashSaleWithItems {
  const totals = calculateInvoiceTotals({
    items: store.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
    taxRate: store.taxRate,
    discountType: store.discountType === "percentage" ? "PERCENTAGE" : "FIXED",
    discountValue: store.discountValue,
  });

  return {
    ...DUMMY,
    documentTitle: store.documentTitle,
    cashSaleNumber: store.cashSaleNumber,
    issueDate: store.issueDate,
    orderNumber: store.orderNumber || null,
    referenceInvoiceNumber: store.referenceInvoiceNumber || null,
    paymentMethod: store.paymentMethod,
    transactionCode: store.transactionCode || null,
    fromName: store.from.name,
    fromEmail: store.from.email || null,
    fromPhone: store.from.phone || null,
    fromMobile: store.from.mobile || null,
    fromFax: store.from.fax || null,
    fromAddress: store.from.address || null,
    fromCity: store.from.city || null,
    fromZipCode: store.from.zipCode || null,
    fromBusinessNumber: store.from.businessNumber || null,
    toName: store.to.name,
    toEmail: store.to.email || null,
    toPhone: store.to.phone || null,
    toMobile: store.to.mobile || null,
    toFax: store.to.fax || null,
    toAddress: store.to.address || null,
    toCity: store.to.city || null,
    toZipCode: store.to.zipCode || null,
    toBusinessNumber: store.to.businessNumber || null,
    currency: store.currency.code,
    taxRate: store.taxRate,
    discountType: store.discountType === "percentage" ? "PERCENTAGE" : "FIXED",
    discountValue: store.discountValue,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    discountAmount: totals.discountAmount,
    total: totals.total,
    accentColor: store.accentColor,
    logoDataUrl: store.logoDataUrl,
    signatureDataUrl: store.signatureDataUrl,
    notes: store.notes || null,
    lineItems: store.items.map((item, i) => ({
      id: item.id,
      cashSaleId: "preview",
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      rate: item.rate,
      amount: totals.lineAmounts[i] ?? 0,
      sortOrder: i,
      createdAt: DUMMY.createdAt,
      updatedAt: DUMMY.updatedAt,
    })),
    photos: [],
  };
}

// ─── Delivery Note ────────────────────────────────────────────────────────

export function deliveryNoteStoreToRecord(store: {
  documentTitle: string;
  deliveryNoteNumber: string;
  issueDate: string;
  orderNumber: string;
  referenceInvoiceNumber: string;
  acknowledgmentText: string;
  from: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  to: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  notes: string;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  items: { id: string; description: string; additionalDetails: string; quantity: number }[];
}): DeliveryNoteWithItems {
  return {
    ...DUMMY,
    documentTitle: store.documentTitle,
    deliveryNoteNumber: store.deliveryNoteNumber,
    issueDate: store.issueDate,
    orderNumber: store.orderNumber || null,
    referenceInvoiceNumber: store.referenceInvoiceNumber || null,
    acknowledgmentText: store.acknowledgmentText || null,
    fromName: store.from.name,
    fromEmail: store.from.email || null,
    fromPhone: store.from.phone || null,
    fromMobile: store.from.mobile || null,
    fromFax: store.from.fax || null,
    fromAddress: store.from.address || null,
    fromCity: store.from.city || null,
    fromZipCode: store.from.zipCode || null,
    fromBusinessNumber: store.from.businessNumber || null,
    toName: store.to.name,
    toEmail: store.to.email || null,
    toPhone: store.to.phone || null,
    toMobile: store.to.mobile || null,
    toFax: store.to.fax || null,
    toAddress: store.to.address || null,
    toCity: store.to.city || null,
    toZipCode: store.to.zipCode || null,
    toBusinessNumber: store.to.businessNumber || null,
    accentColor: store.accentColor,
    logoDataUrl: store.logoDataUrl,
    signatureDataUrl: store.signatureDataUrl,
    notes: store.notes || null,
    lineItems: store.items.map((item, i) => ({
      id: item.id,
      deliveryNoteId: "preview",
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      sortOrder: i,
      createdAt: DUMMY.createdAt,
      updatedAt: DUMMY.updatedAt,
    })),
    photos: [],
  };
}

// ─── Purchase Order ───────────────────────────────────────────────────────

export function purchaseOrderStoreToRecord(store: {
  documentTitle: string;
  purchaseOrderNumber: string;
  issueDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  orderNumber: string;
  from: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string; website?: string };
  to: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  shipToEnabled: boolean;
  shipTo: { name: string; companyName: string; address: string; city: string; zipCode: string; phone: string };
  authorizedByName: string;
  authorizedByDesignation: string;
  notes: string;
  taxRate: number;
  currency: { code: string };
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  items: { id: string; description: string; additionalDetails: string; quantity: number; unitPrice: number }[];
}): PurchaseOrderWithItems {
  const totals = calculatePurchaseOrderTotals({
    items: store.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    taxRate: store.taxRate,
  });

  return {
    ...DUMMY,
    documentTitle: store.documentTitle,
    purchaseOrderNumber: store.purchaseOrderNumber,
    issueDate: store.issueDate,
    expectedDeliveryDate: store.expectedDeliveryDate || null,
    paymentTerms: store.paymentTerms || null,
    orderNumber: store.orderNumber || null,
    fromName: store.from.name,
    fromEmail: store.from.email || null,
    fromPhone: store.from.phone || null,
    fromMobile: store.from.mobile || null,
    fromFax: store.from.fax || null,
    fromAddress: store.from.address || null,
    fromCity: store.from.city || null,
    fromZipCode: store.from.zipCode || null,
    fromBusinessNumber: store.from.businessNumber || null,
    fromWebsite: store.from.website || null,
    toName: store.to.name,
    toEmail: store.to.email || null,
    toPhone: store.to.phone || null,
    toMobile: store.to.mobile || null,
    toFax: store.to.fax || null,
    toAddress: store.to.address || null,
    toCity: store.to.city || null,
    toZipCode: store.to.zipCode || null,
    toBusinessNumber: store.to.businessNumber || null,
    shipToEnabled: store.shipToEnabled,
    shipToName: store.shipTo?.name || null,
    shipToCompanyName: store.shipTo?.companyName || null,
    shipToAddress: store.shipTo?.address || null,
    shipToCity: store.shipTo?.city || null,
    shipToZipCode: store.shipTo?.zipCode || null,
    shipToPhone: store.shipTo?.phone || null,
    authorizedByName: store.authorizedByName || null,
    authorizedByDesignation: store.authorizedByDesignation || null,
    currency: store.currency.code,
    taxRate: store.taxRate,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    accentColor: store.accentColor,
    logoDataUrl: store.logoDataUrl,
    signatureDataUrl: store.signatureDataUrl,
    notes: store.notes || null,
    lineItems: store.items.map((item, i) => ({
      id: item.id,
      purchaseOrderId: "preview",
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: totals.lineAmounts[i] ?? 0,
      sortOrder: i,
      createdAt: DUMMY.createdAt,
      updatedAt: DUMMY.updatedAt,
    })),
    photos: [],
  };
}

// ─── Receipt ──────────────────────────────────────────────────────────────

export function receiptStoreToRecord(store: {
  documentTitle: string;
  receiptNumber: string;
  issueDate: string;
  from: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  to: { name: string; email: string; phone: string; mobile: string; fax: string; address: string; city: string; zipCode: string; businessNumber: string };
  currency: { code: string };
  totalAmountOwed: number;
  amountReceived: number;
  outstandingBalance: number;
  amountInWords: string;
  beingPaymentOf: string;
  paymentMethod: string;
  transactionCode: string;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  notes: string;
}): ReceiptWithPhotos {
  return {
    ...DUMMY,
    documentTitle: store.documentTitle,
    receiptNumber: store.receiptNumber,
    issueDate: store.issueDate,
    fromName: store.from.name,
    fromEmail: store.from.email || null,
    fromPhone: store.from.phone || null,
    fromMobile: store.from.mobile || null,
    fromFax: store.from.fax || null,
    fromAddress: store.from.address || null,
    fromCity: store.from.city || null,
    fromZipCode: store.from.zipCode || null,
    fromBusinessNumber: store.from.businessNumber || null,
    toName: store.to.name,
    toEmail: store.to.email || null,
    toPhone: store.to.phone || null,
    toMobile: store.to.mobile || null,
    toFax: store.to.fax || null,
    toAddress: store.to.address || null,
    toCity: store.to.city || null,
    toZipCode: store.to.zipCode || null,
    toBusinessNumber: store.to.businessNumber || null,
    currency: store.currency.code,
    totalAmountOwed: store.totalAmountOwed,
    amountReceived: store.amountReceived,
    outstandingBalance: store.outstandingBalance,
    amountInWords: store.amountInWords || null,
    beingPaymentOf: store.beingPaymentOf || null,
    paymentMethod: store.paymentMethod,
    transactionCode: store.transactionCode || null,
    accentColor: store.accentColor,
    logoDataUrl: store.logoDataUrl,
    signatureDataUrl: store.signatureDataUrl,
    notes: store.notes || null,
    photos: [],
  };
}
