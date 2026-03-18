// lib/db/types.ts — TypeScript types for all DB entities

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  externalId: string | null;
  provider: string | null;
  businessName: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessZipCode: string | null;
  businessNumber: string | null;
  defaultCurrency: string;
  defaultTaxRate: number;
  logoUrl: string | null;
  signatureUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  publicId: string;
  documentType: string;
  documentTitle: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  paymentTerms: string;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromMobile: string | null;
  fromFax: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromZipCode: string | null;
  fromBusinessNumber: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toMobile: string | null;
  toFax: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  currency: string;
  taxRate: number;
  discountType: string;
  discountValue: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  notes: string | null;
  isPaid: boolean;
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  invoiceId: string;
  description: string;
  additionalDetails: string | null;
  quantity: number;
  rate: number;
  amount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePhoto {
  id: string;
  invoiceId: string;
  url: string;
  filename: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  userId: string | null;
  phoneNumber: string;
  amount: number;
  currency: string;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  transactionDate: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  resultCode: string | null;
  resultDesc: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface InvoiceWithItems extends Invoice {
  lineItems: LineItem[];
  photos: InvoicePhoto[];
}

export interface DashboardStats {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalRevenue: number;
  overdueInvoices: number;
  recentInvoices: Array<{
    id: string;
    publicId: string;
    documentType: string;
    invoiceNumber: string;
    toName: string;
    total: number;
    currency: string;
    isPaid: boolean;
    createdAt: string;
    dueDate: string | null;
  }>;
}

export interface PlatformStats {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalRevenue: number;
  failedPayments: number;
  cancelledPayments: number;
  activeUsers: number;
  guestInvoices: number;
  invoicesToday: number;
  paymentsToday: number;
  revenueToday: number;
  invoicesThisMonth: number;
  paymentsThisMonth: number;
}

// =============================================================================
// Cash Sale Types
// =============================================================================

export interface CashSale {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  publicId: string;
  documentTitle: string;
  cashSaleNumber: string;
  issueDate: string;
  orderNumber: string | null;
  referenceInvoiceNumber: string | null;
  paymentMethod: string;
  transactionCode: string | null;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromMobile: string | null;
  fromFax: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromZipCode: string | null;
  fromBusinessNumber: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toMobile: string | null;
  toFax: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  currency: string;
  taxRate: number;
  discountType: string;
  discountValue: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  notes: string | null;
  isPaid: boolean;
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashSaleLineItem {
  id: string;
  cashSaleId: string;
  description: string;
  additionalDetails: string | null;
  quantity: number;
  rate: number;
  amount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CashSalePhoto {
  id: string;
  cashSaleId: string;
  url: string;
  filename: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CashSalePayment {
  id: string;
  cashSaleId: string;
  userId: string | null;
  phoneNumber: string;
  amount: number;
  currency: string;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  transactionDate: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  resultCode: string | null;
  resultDesc: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CashSaleWithItems extends CashSale {
  lineItems: CashSaleLineItem[];
  photos: CashSalePhoto[];
}

// =============================================================================
// Delivery Note Types
// =============================================================================

export interface DeliveryNote {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  publicId: string;
  documentTitle: string;
  deliveryNoteNumber: string;
  issueDate: string;
  orderNumber: string | null;
  referenceInvoiceNumber: string | null;
  acknowledgmentText: string | null;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromMobile: string | null;
  fromFax: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromZipCode: string | null;
  fromBusinessNumber: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toMobile: string | null;
  toFax: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  notes: string | null;
  isPaid: boolean;
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryNoteLineItem {
  id: string;
  deliveryNoteId: string;
  description: string;
  additionalDetails: string | null;
  quantity: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryNotePhoto {
  id: string;
  deliveryNoteId: string;
  url: string;
  filename: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface DeliveryNotePayment {
  id: string;
  deliveryNoteId: string;
  userId: string | null;
  phoneNumber: string;
  amount: number;
  currency: string;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  transactionDate: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  resultCode: string | null;
  resultDesc: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface DeliveryNoteWithItems extends DeliveryNote {
  lineItems: DeliveryNoteLineItem[];
  photos: DeliveryNotePhoto[];
}

// =============================================================================
// Receipt Types
// =============================================================================

export interface Receipt {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  publicId: string;
  documentTitle: string;
  receiptNumber: string;
  issueDate: string;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromMobile: string | null;
  fromFax: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromZipCode: string | null;
  fromBusinessNumber: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toMobile: string | null;
  toFax: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  currency: string;
  totalAmountOwed: number;
  amountReceived: number;
  outstandingBalance: number;
  amountInWords: string | null;
  beingPaymentOf: string | null;
  paymentMethod: string;
  transactionCode: string | null;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  notes: string | null;
  isPaid: boolean;
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptPhoto {
  id: string;
  receiptId: string;
  url: string;
  filename: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ReceiptPayment {
  id: string;
  receiptId: string;
  userId: string | null;
  phoneNumber: string;
  amount: number;
  currency: string;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  transactionDate: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  resultCode: string | null;
  resultDesc: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ReceiptWithPhotos extends Receipt {
  photos: ReceiptPhoto[];
}

// =============================================================================
// Purchase Order Types
// =============================================================================

export interface PurchaseOrder {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  publicId: string;
  documentTitle: string;
  purchaseOrderNumber: string;
  issueDate: string;
  expectedDeliveryDate: string | null;
  paymentTerms: string | null;
  orderNumber: string | null;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromMobile: string | null;
  fromFax: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromZipCode: string | null;
  fromBusinessNumber: string | null;
  fromWebsite: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toMobile: string | null;
  toFax: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  shipToEnabled: boolean;
  shipToName: string | null;
  shipToCompanyName: string | null;
  shipToAddress: string | null;
  shipToCity: string | null;
  shipToZipCode: string | null;
  shipToPhone: string | null;
  authorizedByName: string | null;
  authorizedByDesignation: string | null;
  currency: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  notes: string | null;
  isPaid: boolean;
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLineItem {
  id: string;
  purchaseOrderId: string;
  description: string;
  additionalDetails: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderPhoto {
  id: string;
  purchaseOrderId: string;
  url: string;
  filename: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface PurchaseOrderPayment {
  id: string;
  purchaseOrderId: string;
  userId: string | null;
  phoneNumber: string;
  amount: number;
  currency: string;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  transactionDate: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  resultCode: string | null;
  resultDesc: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  lineItems: PurchaseOrderLineItem[];
  photos: PurchaseOrderPhoto[];
}

// =============================================================================
// Quotation Types
// =============================================================================

export interface Quotation {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  publicId: string;
  documentTitle: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string | null;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromMobile: string | null;
  fromFax: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromZipCode: string | null;
  fromBusinessNumber: string | null;
  toName: string;
  toEmail: string | null;
  toPhone: string | null;
  toMobile: string | null;
  toFax: string | null;
  toAddress: string | null;
  toCity: string | null;
  toZipCode: string | null;
  toBusinessNumber: string | null;
  currency: string;
  discountType: string;
  discountValue: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  termsAndConditions: string | null;
  notes: string | null;
  isPaid: boolean;
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationLineItem {
  id: string;
  quotationId: string;
  description: string;
  additionalDetails: string | null;
  quantity: number;
  rate: number;
  amount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationPhoto {
  id: string;
  quotationId: string;
  url: string;
  filename: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface QuotationPayment {
  id: string;
  quotationId: string;
  userId: string | null;
  phoneNumber: string;
  amount: number;
  currency: string;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  transactionDate: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  resultCode: string | null;
  resultDesc: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface QuotationWithItems extends Quotation {
  lineItems: QuotationLineItem[];
  photos: QuotationPhoto[];
}

// =============================================================================
// Subscription Types
// =============================================================================

export type SubscriptionPlan = "BASIC" | "GROWTH" | "SCALE";
export type SubscriptionStatus = "PENDING" | "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "CANCELLED";

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  documentsLimit: number;
  documentsUsed: number;
  amountPaid: number;
  phoneNumber: string | null;
  purchasedAt: string | null;
  expiresAt: string | null;
  renewedFromId: string | null;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsageResult {
  sub_id: string;
  sub_plan: string;
  documents_limit: number;
  documents_used: number;
  documents_remaining: number;
}

export interface SubscriptionActivationResult {
  sub_id: string;
  sub_plan: string;
  sub_status: string;
  documents_limit: number;
  expires_at: string;
}
