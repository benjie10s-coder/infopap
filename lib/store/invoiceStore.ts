// lib/store/invoiceStore.ts — Zustand state for invoice editor
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CURRENCIES } from "@/lib/utils/format";
import type { Currency } from "@/lib/utils/format";

// ─── Types ────────────────────────────────────────────────────

export type PaymentTerms =
  | "due_on_receipt"
  | "net_7"
  | "net_15"
  | "net_30"
  | "net_60"
  | "custom";

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  due_on_receipt: "Due on Receipt",
  net_7: "Net 7",
  net_15: "Net 15",
  net_30: "Net 30",
  net_60: "Net 60",
  custom: "Custom",
};

export const ACCENT_COLORS = [
  "#1f8ea3",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#64748b",
  "#0f172a",
] as const;

export type DocumentType = "invoice" | "receipt" | "estimate" | "quote";

export interface InvoiceParty {
  name: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  address: string;
  city: string;
  zipCode: string;
  businessNumber: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  additionalDetails: string;
  quantity: number;
  rate: number;
}

export interface InvoiceData {
  documentTitle: string;
  documentType: DocumentType;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: PaymentTerms;
  from: InvoiceParty;
  to: InvoiceParty;
  notes: string;
  taxRate: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  currency: Currency;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  photoDataUrls: string[];
  items: InvoiceLineItem[];
  isPaid: boolean;
  showCustomTable: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────

const emptyParty: InvoiceParty = {
  name: "",
  email: "",
  phone: "",
  mobile: "",
  fax: "",
  address: "",
  city: "",
  zipCode: "",
  businessNumber: "",
};

const today = () => new Date().toISOString().slice(0, 10);

const defaultInvoice: InvoiceData = {
  documentTitle: "INVOICE",
  documentType: "invoice",
  invoiceNumber: "",
  issueDate: today(),
  dueDate: today(),
  paymentTerms: "due_on_receipt",
  from: { ...emptyParty },
  to: { ...emptyParty },
  notes: "",
  taxRate: 0,
  discountType: "percentage",
  discountValue: 0,
  currency: CURRENCIES[0], // KES
  accentColor: ACCENT_COLORS[0], // lagoon
  logoDataUrl: null,
  signatureDataUrl: null,
  photoDataUrls: [],
  items: [
    {
      id: generateItemId(),
      description: "",
      additionalDetails: "",
      quantity: 1,
      rate: 0,
    },
  ],
  isPaid: false,
  showCustomTable: false,
};

function generateItemId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Store ────────────────────────────────────────────────────

interface InvoiceStore extends InvoiceData {
  // Meta
  currentInvoiceId: string | null; // DB id
  currentPublicId: string | null;
  isSaving: boolean;
  isDirty: boolean;

  // Setters
  setField: (path: string, value: unknown) => void;
  setLogo: (dataUrl: string | null) => void;
  setSignature: (dataUrl: string | null) => void;
  addPhoto: (dataUrl: string) => void;
  removePhoto: (index: number) => void;
  setCurrency: (currency: Currency) => void;
  setAccentColor: (color: string) => void;

  // Line items
  addItem: () => void;
  updateItem: (id: string, field: string, value: string | number) => void;
  removeItem: (id: string) => void;

  // Status
  setIsPaid: (paid: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setMeta: (id: string | null, publicId: string | null) => void;

  // Lifecycle
  reset: () => void;
  loadInvoice: (data: Partial<InvoiceData> & { id?: string; publicId?: string }) => void;
}

// Deep-set helper: sets a nested value by dot-path
function deepSet<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  const keys = path.split(".");
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultInvoice,
      currentInvoiceId: null,
      currentPublicId: null,
      isSaving: false,
      isDirty: false,

      // ── Setters ────────────────────────────────
      setField: (path, value) =>
        set((state) => ({
          ...deepSet(state as unknown as Record<string, unknown>, path, value),
          isDirty: true,
        } as Partial<InvoiceStore>)),

      setLogo: (dataUrl) =>
        set({ logoDataUrl: dataUrl, isDirty: true }),

      setSignature: (dataUrl) =>
        set({ signatureDataUrl: dataUrl, isDirty: true }),

      addPhoto: (dataUrl) =>
        set((state) => ({
          photoDataUrls: [...state.photoDataUrls, dataUrl],
          isDirty: true,
        })),

      removePhoto: (index) =>
        set((state) => ({
          photoDataUrls: state.photoDataUrls.filter((_, i) => i !== index),
          isDirty: true,
        })),

      setCurrency: (currency) =>
        set({ currency, isDirty: true }),

      setAccentColor: (color) =>
        set({ accentColor: color, isDirty: true }),

      // ── Line items ─────────────────────────────
      addItem: () =>
        set((state) => ({
          items: [
            ...state.items,
            {
              id: generateItemId(),
              description: "",
              additionalDetails: "",
              quantity: 1,
              rate: 0,
            },
          ],
          isDirty: true,
        })),

      updateItem: (id, field, value) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, [field]: value } : item
          ),
          isDirty: true,
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          isDirty: true,
        })),

      // ── Status ─────────────────────────────────
      setIsPaid: (paid) => set({ isPaid: paid }),
      setIsSaving: (saving) => set({ isSaving: saving }),
      setMeta: (id, publicId) =>
        set({ currentInvoiceId: id, currentPublicId: publicId }),

      // ── Lifecycle ──────────────────────────────
      reset: () =>
        set({
          ...defaultInvoice,
          items: [
            {
              id: generateItemId(),
              description: "",
              additionalDetails: "",
              quantity: 1,
              rate: 0,
            },
          ],
          currentInvoiceId: null,
          currentPublicId: null,
          isSaving: false,
          isDirty: false,
        }),

      loadInvoice: (data) =>
        set((state) => ({
          ...state,
          ...data,
          currentInvoiceId: data.id ?? state.currentInvoiceId,
          currentPublicId: data.publicId ?? state.currentPublicId,
          isDirty: false,
        })),
    }),
    {
      name: "invopap-invoice-store",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return sessionStorage;
        // SSR fallback — no-op storage
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      // Only persist the invoice data, not meta flags
      partialize: (state) => ({
        documentTitle: state.documentTitle,
        documentType: state.documentType,
        invoiceNumber: state.invoiceNumber,
        issueDate: state.issueDate,
        dueDate: state.dueDate,
        paymentTerms: state.paymentTerms,
        from: state.from,
        to: state.to,
        notes: state.notes,
        taxRate: state.taxRate,
        discountType: state.discountType,
        discountValue: state.discountValue,
        currency: state.currency,
        accentColor: state.accentColor,
        items: state.items,
      }),
    }
  )
);
