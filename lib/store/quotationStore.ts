// lib/store/quotationStore.ts — Zustand state for quotation editor
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CURRENCIES } from "@/lib/utils/format";
import type { Currency } from "@/lib/utils/format";
import type { InvoiceParty } from "@/lib/store/invoiceStore";
import { ACCENT_COLORS } from "@/lib/store/invoiceStore";

export { ACCENT_COLORS };

// ─── Types ────────────────────────────────────────────────────

export interface QuotationLineItem {
  id: string;
  description: string;
  additionalDetails: string;
  quantity: number;
  rate: number;
}

export interface QuotationData {
  documentTitle: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  from: InvoiceParty;
  to: InvoiceParty;
  termsAndConditions: string;
  notes: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  currency: Currency;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  photoDataUrls: string[];
  items: QuotationLineItem[];
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

// Default valid for 30 days
function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const defaultQuotation: QuotationData = {
  documentTitle: "QUOTATION",
  quotationNumber: "",
  quotationDate: today(),
  validUntil: defaultValidUntil(),
  from: { ...emptyParty },
  to: { ...emptyParty },
  termsAndConditions: "",
  notes: "",
  discountType: "percentage",
  discountValue: 0,
  currency: CURRENCIES[0], // KES
  accentColor: ACCENT_COLORS[3], // orange #f97316
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

interface QuotationStore extends QuotationData {
  // Meta
  currentQuotationId: string | null;
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
  loadQuotation: (data: Partial<QuotationData> & { id?: string; publicId?: string }) => void;
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

export const useQuotationStore = create<QuotationStore>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultQuotation,
      currentQuotationId: null,
      currentPublicId: null,
      isSaving: false,
      isDirty: false,

      // ── Setters ────────────────────────────────
      setField: (path, value) =>
        set((state) => ({
          ...deepSet(state as unknown as Record<string, unknown>, path, value),
          isDirty: true,
        } as Partial<QuotationStore>)),

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
        set({ currentQuotationId: id, currentPublicId: publicId }),

      // ── Lifecycle ──────────────────────────────
      reset: () =>
        set({
          ...defaultQuotation,
          items: [
            {
              id: generateItemId(),
              description: "",
              additionalDetails: "",
              quantity: 1,
              rate: 0,
            },
          ],
          currentQuotationId: null,
          currentPublicId: null,
          isSaving: false,
          isDirty: false,
        }),

      loadQuotation: (data) =>
        set((state) => ({
          ...state,
          ...data,
          currentQuotationId: data.id ?? state.currentQuotationId,
          currentPublicId: data.publicId ?? state.currentPublicId,
          isDirty: false,
        })),
    }),
    {
      name: "invosafi-quotation-store",
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
        quotationNumber: state.quotationNumber,
        quotationDate: state.quotationDate,
        validUntil: state.validUntil,
        from: state.from,
        to: state.to,
        termsAndConditions: state.termsAndConditions,
        notes: state.notes,
        discountType: state.discountType,
        discountValue: state.discountValue,
        currency: state.currency,
        accentColor: state.accentColor,
        items: state.items,
      }),
    }
  )
);
