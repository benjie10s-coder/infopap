// lib/validators.ts — Zod validation schemas for all API inputs
import { z } from "zod";

// =============================================================================
// Shared Enums & Constants
// =============================================================================

export const DOCUMENT_TYPES = ["INVOICE", "RECEIPT", "ESTIMATE", "QUOTE"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const PAYMENT_TERMS = [
  "DUE_ON_RECEIPT",
  "NET_7",
  "NET_15",
  "NET_30",
  "NET_60",
  "CUSTOM",
] as const;

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;

export const CURRENCY_CODES = ["KES", "USD", "EUR", "GBP", "TZS", "UGX"] as const;

// =============================================================================
// Line Item Schema
// =============================================================================

export const LineItemSchema = z.object({
  description: z.string().min(1, "Description required").max(500),
  additionalDetails: z.string().max(1000).optional().nullable(),
  quantity: z.number().min(0.0001).max(999999999),
  rate: z.number().min(0).max(9999999999999),
});

// =============================================================================
// Create Invoice Schema
// =============================================================================

export const CreateInvoiceSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES).optional().default("INVOICE"),
  documentTitle: z.string().max(100).optional(),
  invoiceNumber: z.string().max(50).optional(),
  issueDate: z.string().optional(), // ISO date string
  dueDate: z.string().optional().nullable(),
  paymentTerms: z.enum(PAYMENT_TERMS).optional().default("NET_7"),

  // From (sender)
  fromName: z.string().min(1, "Sender name required").max(200),
  fromEmail: z.string().email().max(254).optional().nullable(),
  fromPhone: z.string().max(30).optional().nullable(),
  fromMobile: z.string().max(30).optional().nullable(),
  fromFax: z.string().max(30).optional().nullable(),
  fromAddress: z.string().max(500).optional().nullable(),
  fromCity: z.string().max(100).optional().nullable(),
  fromZipCode: z.string().max(20).optional().nullable(),
  fromBusinessNumber: z.string().max(50).optional().nullable(),

  // To (recipient)
  toName: z.string().min(1, "Recipient name required").max(200),
  toEmail: z.string().email().max(254).optional().nullable(),
  toPhone: z.string().max(30).optional().nullable(),
  toMobile: z.string().max(30).optional().nullable(),
  toFax: z.string().max(30).optional().nullable(),
  toAddress: z.string().max(500).optional().nullable(),
  toCity: z.string().max(100).optional().nullable(),
  toZipCode: z.string().max(20).optional().nullable(),
  toBusinessNumber: z.string().max(50).optional().nullable(),

  // Financial
  currency: z.enum(CURRENCY_CODES).optional().default("KES"),
  taxRate: z.number().min(0).max(100).optional().default(16),
  discountType: z.enum(DISCOUNT_TYPES).optional().default("PERCENTAGE"),
  discountValue: z.number().min(0).max(9999999999999).optional().default(0),

  // Style
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional()
    .default("#1f8ea3"),

  // Images (base64 data URLs or Supabase Storage URLs)
  logoDataUrl: z.string().max(700_000).optional().nullable(),
  signatureDataUrl: z.string().max(700_000).optional().nullable(),
  photoDataUrls: z.array(z.string().max(700_000)).max(5).optional(),

  // Content
  notes: z.string().max(5000).optional().nullable(),

  // Line items (at least 1)
  items: z.array(LineItemSchema).min(1, "At least one line item required").max(100),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

// =============================================================================
// Update Invoice Schema (partial)
// =============================================================================

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial().extend({
  items: z.array(LineItemSchema).min(1).max(100).optional(),
});

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

// =============================================================================
// Payment Initiation Schema
// =============================================================================

const phoneRegex = /^(?:\+?254|0)?[17]\d{8}$/;

export const PAYABLE_DOCUMENT_TYPES = [
  "INVOICE",
  "CASH_SALE",
  "DELIVERY_NOTE",
  "RECEIPT",
  "PURCHASE_ORDER",
  "QUOTATION",
] as const;

export type PayableDocumentType = (typeof PAYABLE_DOCUMENT_TYPES)[number];

export const InitiatePaymentSchema = z.object({
  publicId: z.string().min(1, "publicId required").max(50),
  phoneNumber: z
    .string()
    .min(9, "Phone number too short")
    .max(15, "Phone number too long")
    .regex(phoneRegex, "Invalid Kenyan phone number (e.g., 0712345678)"),
  documentType: z.enum(PAYABLE_DOCUMENT_TYPES).optional().default("INVOICE"),
});

export type InitiatePaymentInput = z.infer<typeof InitiatePaymentSchema>;

// =============================================================================
// Payment Query Schema
// =============================================================================

export const QueryPaymentSchema = z.object({
  checkoutRequestId: z.string().min(1, "checkoutRequestId required").max(100),
});

// =============================================================================
// Invoice List Query Schema
// =============================================================================

export const ListInvoicesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z
    .enum(["createdAt", "issueDate", "dueDate"])
    .optional()
    .default("createdAt"),
  orderDir: z.enum(["asc", "desc"]).optional().default("desc"),
  cursor: z.string().optional(),
});

// =============================================================================
// Purchase Order Schemas
// =============================================================================

export const PurchaseOrderLineItemSchema = z.object({
  description: z.string().min(1, "Description required").max(500),
  additionalDetails: z.string().max(1000).optional().nullable(),
  quantity: z.number().min(0.0001).max(999999999),
  unitPrice: z.number().min(0).max(9999999999999),
});

export const CreatePurchaseOrderSchema = z.object({
  documentTitle: z.string().max(100).optional(),
  purchaseOrderNumber: z.string().max(50).optional(),
  issueDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional().nullable(),
  paymentTerms: z.string().max(100).optional().nullable(),
  orderNumber: z.string().max(100).optional().nullable(),

  // From (company / buyer)
  fromName: z.string().min(1, "Company name required").max(200),
  fromEmail: z.string().email().max(254).optional().nullable(),
  fromPhone: z.string().max(30).optional().nullable(),
  fromMobile: z.string().max(30).optional().nullable(),
  fromFax: z.string().max(30).optional().nullable(),
  fromAddress: z.string().max(500).optional().nullable(),
  fromCity: z.string().max(100).optional().nullable(),
  fromZipCode: z.string().max(20).optional().nullable(),
  fromBusinessNumber: z.string().max(50).optional().nullable(),
  fromWebsite: z.string().max(200).optional().nullable(),

  // To (vendor / supplier)
  toName: z.string().min(1, "Vendor name required").max(200),
  toEmail: z.string().email().max(254).optional().nullable(),
  toPhone: z.string().max(30).optional().nullable(),
  toMobile: z.string().max(30).optional().nullable(),
  toFax: z.string().max(30).optional().nullable(),
  toAddress: z.string().max(500).optional().nullable(),
  toCity: z.string().max(100).optional().nullable(),
  toZipCode: z.string().max(20).optional().nullable(),
  toBusinessNumber: z.string().max(50).optional().nullable(),

  // Ship To (optional)
  shipToEnabled: z.boolean().optional().default(false),
  shipToName: z.string().max(200).optional().nullable(),
  shipToCompanyName: z.string().max(200).optional().nullable(),
  shipToAddress: z.string().max(500).optional().nullable(),
  shipToCity: z.string().max(100).optional().nullable(),
  shipToZipCode: z.string().max(20).optional().nullable(),
  shipToPhone: z.string().max(30).optional().nullable(),

  // Authorized by
  authorizedByName: z.string().max(200).optional().nullable(),
  authorizedByDesignation: z.string().max(200).optional().nullable(),

  // Financial — NO discount fields (PO arithmetic: subtotal + tax = total)
  currency: z.enum(CURRENCY_CODES).optional().default("KES"),
  taxRate: z.number().min(0).max(100).optional().default(0),

  // Style
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional()
    .default("#d97706"),

  // Images
  logoDataUrl: z.string().max(700_000).optional().nullable(),
  signatureDataUrl: z.string().max(700_000).optional().nullable(),
  photoDataUrls: z.array(z.string().max(700_000)).max(5).optional(),

  // Content
  notes: z.string().max(5000).optional().nullable(),

  // Line items (at least 1)
  items: z.array(PurchaseOrderLineItemSchema).min(1, "At least one line item required").max(100),
});

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

export const UpdatePurchaseOrderSchema = CreatePurchaseOrderSchema.partial().extend({
  items: z.array(PurchaseOrderLineItemSchema).min(1).max(100).optional(),
});

export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderSchema>;

export const ListPurchaseOrdersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z
    .enum(["createdAt", "issueDate"])
    .optional()
    .default("createdAt"),
  orderDir: z.enum(["asc", "desc"]).optional().default("desc"),
  cursor: z.string().optional(),
});

// =============================================================================
// Quotation Schemas — NO tax, separate arithmetic
// =============================================================================

export const QuotationLineItemSchema = z.object({
  description: z.string().min(1, "Description required").max(500),
  additionalDetails: z.string().max(1000).optional().nullable(),
  quantity: z.number().min(0.0001).max(999999999),
  rate: z.number().min(0).max(9999999999999),
});

export const CreateQuotationSchema = z.object({
  documentTitle: z.string().max(100).optional(),
  quotationNumber: z.string().max(50).optional(),
  quotationDate: z.string().optional(), // ISO date string
  validUntil: z.string().optional().nullable(),

  // From (sender)
  fromName: z.string().min(1, "Sender name required").max(200),
  fromEmail: z.string().email().max(254).optional().nullable(),
  fromPhone: z.string().max(30).optional().nullable(),
  fromMobile: z.string().max(30).optional().nullable(),
  fromFax: z.string().max(30).optional().nullable(),
  fromAddress: z.string().max(500).optional().nullable(),
  fromCity: z.string().max(100).optional().nullable(),
  fromZipCode: z.string().max(20).optional().nullable(),
  fromBusinessNumber: z.string().max(50).optional().nullable(),

  // To (recipient)
  toName: z.string().min(1, "Recipient name required").max(200),
  toEmail: z.string().email().max(254).optional().nullable(),
  toPhone: z.string().max(30).optional().nullable(),
  toMobile: z.string().max(30).optional().nullable(),
  toFax: z.string().max(30).optional().nullable(),
  toAddress: z.string().max(500).optional().nullable(),
  toCity: z.string().max(100).optional().nullable(),
  toZipCode: z.string().max(20).optional().nullable(),
  toBusinessNumber: z.string().max(50).optional().nullable(),

  // Financial — NO tax fields (Quotation arithmetic: subtotal - discount = total)
  currency: z.enum(CURRENCY_CODES).optional().default("KES"),
  discountType: z.enum(DISCOUNT_TYPES).optional().default("PERCENTAGE"),
  discountValue: z.number().min(0).max(9999999999999).optional().default(0),

  // Style
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional()
    .default("#f97316"),

  // Images
  logoDataUrl: z.string().max(700_000).optional().nullable(),
  signatureDataUrl: z.string().max(700_000).optional().nullable(),
  photoDataUrls: z.array(z.string().max(700_000)).max(5).optional(),

  // Content
  termsAndConditions: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),

  // Line items (at least 1)
  items: z.array(QuotationLineItemSchema).min(1, "At least one line item required").max(100),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;

export const UpdateQuotationSchema = CreateQuotationSchema.partial().extend({
  items: z.array(QuotationLineItemSchema).min(1).max(100).optional(),
});

export type UpdateQuotationInput = z.infer<typeof UpdateQuotationSchema>;

export const ListQuotationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z
    .enum(["createdAt", "quotationDate"])
    .optional()
    .default("createdAt"),
  orderDir: z.enum(["asc", "desc"]).optional().default("desc"),
  cursor: z.string().optional(),
});

// =============================================================================
// Cash Sale Schemas — like invoices + paymentMethod/transactionCode
// =============================================================================

export const CashSaleLineItemSchema = z.object({
  description: z.string().min(1, "Description required").max(500),
  additionalDetails: z.string().max(1000).optional().nullable(),
  quantity: z.number().min(0.0001).max(999999999),
  rate: z.number().min(0).max(9999999999999),
});

export const CreateCashSaleSchema = z.object({
  documentTitle: z.string().max(100).optional(),
  cashSaleNumber: z.string().max(50).optional(),
  issueDate: z.string().optional(),
  orderNumber: z.string().max(100).optional().nullable(),
  referenceInvoiceNumber: z.string().max(100).optional().nullable(),
  paymentMethod: z.string().max(50).optional().default("cash"),
  transactionCode: z.string().max(100).optional().nullable(),

  // From (sender)
  fromName: z.string().min(1, "Sender name required").max(200),
  fromEmail: z.string().email().max(254).optional().nullable(),
  fromPhone: z.string().max(30).optional().nullable(),
  fromMobile: z.string().max(30).optional().nullable(),
  fromFax: z.string().max(30).optional().nullable(),
  fromAddress: z.string().max(500).optional().nullable(),
  fromCity: z.string().max(100).optional().nullable(),
  fromZipCode: z.string().max(20).optional().nullable(),
  fromBusinessNumber: z.string().max(50).optional().nullable(),

  // To (recipient)
  toName: z.string().min(1, "Recipient name required").max(200),
  toEmail: z.string().email().max(254).optional().nullable(),
  toPhone: z.string().max(30).optional().nullable(),
  toMobile: z.string().max(30).optional().nullable(),
  toFax: z.string().max(30).optional().nullable(),
  toAddress: z.string().max(500).optional().nullable(),
  toCity: z.string().max(100).optional().nullable(),
  toZipCode: z.string().max(20).optional().nullable(),
  toBusinessNumber: z.string().max(50).optional().nullable(),

  // Financial
  currency: z.enum(CURRENCY_CODES).optional().default("KES"),
  taxRate: z.number().min(0).max(100).optional().default(0),
  discountType: z.enum(DISCOUNT_TYPES).optional().default("PERCENTAGE"),
  discountValue: z.number().min(0).max(9999999999999).optional().default(0),

  // Style
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional()
    .default("#22c55e"),

  // Images
  logoDataUrl: z.string().max(700_000).optional().nullable(),
  signatureDataUrl: z.string().max(700_000).optional().nullable(),
  photoDataUrls: z.array(z.string().max(700_000)).max(5).optional(),

  // Content
  notes: z.string().max(5000).optional().nullable(),

  // Line items (at least 1)
  items: z.array(CashSaleLineItemSchema).min(1, "At least one line item required").max(100),
});

export type CreateCashSaleInput = z.infer<typeof CreateCashSaleSchema>;

export const UpdateCashSaleSchema = CreateCashSaleSchema.partial().extend({
  items: z.array(CashSaleLineItemSchema).min(1).max(100).optional(),
});

export type UpdateCashSaleInput = z.infer<typeof UpdateCashSaleSchema>;

export const ListCashSalesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z
    .enum(["createdAt", "issueDate"])
    .optional()
    .default("createdAt"),
  orderDir: z.enum(["asc", "desc"]).optional().default("desc"),
  cursor: z.string().optional(),
});

// =============================================================================
// Receipt Schemas — NO line items, separate balance arithmetic
// =============================================================================

const RECEIPT_PAYMENT_METHODS = ["cash", "mpesa", "bank"] as const;

export const CreateReceiptSchema = z.object({
  documentTitle: z.string().max(100).optional(),
  receiptNumber: z.string().max(50).optional(),
  issueDate: z.string().optional(),

  // From (sender)
  fromName: z.string().min(1, "Sender name required").max(200),
  fromEmail: z.string().email().max(254).optional().nullable(),
  fromPhone: z.string().max(30).optional().nullable(),
  fromMobile: z.string().max(30).optional().nullable(),
  fromFax: z.string().max(30).optional().nullable(),
  fromAddress: z.string().max(500).optional().nullable(),
  fromCity: z.string().max(100).optional().nullable(),
  fromZipCode: z.string().max(20).optional().nullable(),
  fromBusinessNumber: z.string().max(50).optional().nullable(),

  // To (recipient)
  toName: z.string().min(1, "Recipient name required").max(200),
  toEmail: z.string().email().max(254).optional().nullable(),
  toPhone: z.string().max(30).optional().nullable(),
  toMobile: z.string().max(30).optional().nullable(),
  toFax: z.string().max(30).optional().nullable(),
  toAddress: z.string().max(500).optional().nullable(),
  toCity: z.string().max(100).optional().nullable(),
  toZipCode: z.string().max(20).optional().nullable(),
  toBusinessNumber: z.string().max(50).optional().nullable(),

  // Financial — receipt-specific fields
  currency: z.enum(CURRENCY_CODES).optional().default("KES"),
  totalAmountOwed: z.number().min(0).max(9999999999999).optional().default(0),
  amountReceived: z.number().min(0).max(9999999999999).optional().default(0),
  amountInWords: z.string().max(500).optional().nullable(),
  beingPaymentOf: z.string().max(500).optional().nullable(),
  paymentMethod: z.enum(RECEIPT_PAYMENT_METHODS).optional().default("cash"),
  transactionCode: z.string().max(100).optional().nullable(),

  // Style
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional()
    .default("#4c1d95"),

  // Images
  logoDataUrl: z.string().max(700_000).optional().nullable(),
  signatureDataUrl: z.string().max(700_000).optional().nullable(),
  photoDataUrls: z.array(z.string().max(700_000)).max(5).optional(),

  // Content
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>;

export const UpdateReceiptSchema = CreateReceiptSchema.partial();

export type UpdateReceiptInput = z.infer<typeof UpdateReceiptSchema>;

export const ListReceiptsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z
    .enum(["createdAt", "issueDate"])
    .optional()
    .default("createdAt"),
  orderDir: z.enum(["asc", "desc"]).optional().default("desc"),
  cursor: z.string().optional(),
});

// =============================================================================
// Delivery Note Schemas — NO financial fields, simplified line items
// =============================================================================

export const DeliveryNoteLineItemSchema = z.object({
  description: z.string().min(1, "Description required").max(500),
  additionalDetails: z.string().max(1000).optional().nullable(),
  quantity: z.number().min(0.0001).max(999999999),
});

export const CreateDeliveryNoteSchema = z.object({
  documentTitle: z.string().max(100).optional(),
  deliveryNoteNumber: z.string().max(50).optional(),
  issueDate: z.string().optional(),
  orderNumber: z.string().max(100).optional().nullable(),
  referenceInvoiceNumber: z.string().max(100).optional().nullable(),

  // From (sender)
  fromName: z.string().min(1, "Sender name required").max(200),
  fromEmail: z.string().email().max(254).optional().nullable(),
  fromPhone: z.string().max(30).optional().nullable(),
  fromMobile: z.string().max(30).optional().nullable(),
  fromFax: z.string().max(30).optional().nullable(),
  fromAddress: z.string().max(500).optional().nullable(),
  fromCity: z.string().max(100).optional().nullable(),
  fromZipCode: z.string().max(20).optional().nullable(),
  fromBusinessNumber: z.string().max(50).optional().nullable(),

  // To (recipient)
  toName: z.string().min(1, "Recipient name required").max(200),
  toEmail: z.string().email().max(254).optional().nullable(),
  toPhone: z.string().max(30).optional().nullable(),
  toMobile: z.string().max(30).optional().nullable(),
  toFax: z.string().max(30).optional().nullable(),
  toAddress: z.string().max(500).optional().nullable(),
  toCity: z.string().max(100).optional().nullable(),
  toZipCode: z.string().max(20).optional().nullable(),
  toBusinessNumber: z.string().max(50).optional().nullable(),

  // DN-specific
  acknowledgmentText: z.string().max(500).optional().default("Goods received in good order"),

  // Style
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional()
    .default("#0d9488"),

  // Images
  logoDataUrl: z.string().max(700_000).optional().nullable(),
  signatureDataUrl: z.string().max(700_000).optional().nullable(),
  photoDataUrls: z.array(z.string().max(700_000)).max(5).optional(),

  // Content
  notes: z.string().max(5000).optional().nullable(),

  // Line items (at least 1) — simplified: no rate, no amount
  items: z.array(DeliveryNoteLineItemSchema).min(1, "At least one line item required").max(100),
});

export type CreateDeliveryNoteInput = z.infer<typeof CreateDeliveryNoteSchema>;

export const UpdateDeliveryNoteSchema = CreateDeliveryNoteSchema.partial().extend({
  items: z.array(DeliveryNoteLineItemSchema).min(1).max(100).optional(),
});

export type UpdateDeliveryNoteInput = z.infer<typeof UpdateDeliveryNoteSchema>;

export const ListDeliveryNotesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z
    .enum(["createdAt", "issueDate"])
    .optional()
    .default("createdAt"),
  orderDir: z.enum(["asc", "desc"]).optional().default("desc"),
  cursor: z.string().optional(),
});

// =============================================================================
// User Profile Schema
// =============================================================================

export const UserProfileSchema = z.object({
  businessName: z.string().max(200).optional().nullable(),
  businessEmail: z.string().email().max(254).optional().nullable(),
  businessPhone: z.string().max(30).optional().nullable(),
  businessAddress: z.string().max(500).optional().nullable(),
  businessCity: z.string().max(100).optional().nullable(),
  businessZipCode: z.string().max(20).optional().nullable(),
  businessNumber: z.string().max(50).optional().nullable(),
  logoUrl: z.string().url().max(2000).optional().nullable(),
  defaultCurrency: z.enum(CURRENCY_CODES).optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
});

export type UserProfileInput = z.infer<typeof UserProfileSchema>;
