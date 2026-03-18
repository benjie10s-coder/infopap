// lib/store/cashSaleStore.ts — Zustand state for cash sale editor
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CURRENCIES } from "@/lib/utils/format";
import type { Currency } from "@/lib/utils/format";
import type { InvoiceParty } from "@/lib/store/invoiceStore";
import { ACCENT_COLORS } from "@/lib/store/invoiceStore";

// ─── Types ────────────────────────────────────────────────────

export type CashSalePaymentMethod = "cash" | "mpesa" | "bank" | "card";

export const PAYMENT_METHOD_LABELS: Record<CashSalePaymentMethod, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank: "Bank Transfer",
  card: "Card",
};

export interface CashSaleLineItem {
  id: string;
  description: string;
  additionalDetails: string;
  quantity: number;
  rate: number;
}

export interface CashSaleData {
  documentTitle: string;
  cashSaleNumber: string;
  issueDate: string;
  orderNumber: string;
  referenceInvoiceNumber: string;
  paymentMethod: CashSalePaymentMethod;
  transactionCode: string;
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
  items: CashSaleLineItem[];
  isPaid: boolean;
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

function generateItemId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const defaultCashSale: CashSaleData = {
  documentTitle: "CASH SALE",
  cashSaleNumber: "",
  issueDate: today(),
  orderNumber: "",
  referenceInvoiceNumber: "",
  paymentMethod: "cash",
  transactionCode: "",
  from: { ...emptyParty },
  to: { ...emptyParty },
  notes: "",
  taxRate: 0,
  discountType: "percentage",
  discountValue: 0,
  currency: CURRENCIES[0], // KES
  accentColor: ACCENT_COLORS[8], // green #22c55e
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
};

// ─── Store ────────────────────────────────────────────────────

interface CashSaleStore extends CashSaleData {
  // Meta
  currentCashSaleId: string | null;
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
  loadCashSale: (data: Partial<CashSaleData> & { id?: string; publicId?: string }) => void;
}

// Deep-set helper
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

export const useCashSaleStore = create<CashSaleStore>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultCashSale,
      currentCashSaleId: null,
      currentPublicId: null,
      isSaving: false,
      isDirty: false,

      // ── Setters ────────────────────────────────
      setField: (path, value) =>
        set((state) => ({
          ...deepSet(state as unknown as Record<string, unknown>, path, value),
          isDirty: true,
        } as Partial<CashSaleStore>)),

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
        set({ currentCashSaleId: id, currentPublicId: publicId }),

      // ── Lifecycle ──────────────────────────────
      reset: () =>
        set({
          ...defaultCashSale,
          items: [
            {
              id: generateItemId(),
              description: "",
              additionalDetails: "",
              quantity: 1,
              rate: 0,
            },
          ],
          currentCashSaleId: null,
          currentPublicId: null,
          isSaving: false,
          isDirty: false,
        }),

      loadCashSale: (data) =>
        set((state) => ({
          ...state,
          ...data,
          currentCashSaleId: data.id ?? state.currentCashSaleId,
          currentPublicId: data.publicId ?? state.currentPublicId,
          isDirty: false,
        })),
    }),
    {
      name: "invosafi-cash-sale-store",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return sessionStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        documentTitle: state.documentTitle,
        cashSaleNumber: state.cashSaleNumber,
        issueDate: state.issueDate,
        orderNumber: state.orderNumber,
        referenceInvoiceNumber: state.referenceInvoiceNumber,
        paymentMethod: state.paymentMethod,
        transactionCode: state.transactionCode,
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
