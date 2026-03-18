// lib/store/purchaseOrderStore.ts — Zustand state for purchase order editor
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CURRENCIES } from "@/lib/utils/format";
import type { Currency } from "@/lib/utils/format";
import type { InvoiceParty } from "@/lib/store/invoiceStore";
import { ACCENT_COLORS } from "@/lib/store/invoiceStore";

// ─── Types ────────────────────────────────────────────────────

export interface PurchaseOrderShipTo {
  name: string;
  companyName: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
}

export interface PurchaseOrderLineItem {
  id: string;
  description: string;
  additionalDetails: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderParty extends InvoiceParty {
  website?: string;
}

export interface PurchaseOrderData {
  documentTitle: string;
  purchaseOrderNumber: string;
  issueDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  orderNumber: string;
  from: PurchaseOrderParty;
  to: InvoiceParty;
  shipToEnabled: boolean;
  shipTo: PurchaseOrderShipTo;
  authorizedByName: string;
  authorizedByDesignation: string;
  notes: string;
  taxRate: number;
  currency: Currency;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  photoDataUrls: string[];
  items: PurchaseOrderLineItem[];
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

const emptyBuyerParty: PurchaseOrderParty = {
  ...emptyParty,
  website: "",
};

const emptyShipTo: PurchaseOrderShipTo = {
  name: "",
  companyName: "",
  address: "",
  city: "",
  zipCode: "",
  phone: "",
};

const today = () => new Date().toISOString().slice(0, 10);

function generateItemId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const defaultPurchaseOrder: PurchaseOrderData = {
  documentTitle: "PURCHASE ORDER",
  purchaseOrderNumber: "",
  issueDate: today(),
  expectedDeliveryDate: "",
  paymentTerms: "",
  orderNumber: "",
  from: { ...emptyBuyerParty },
  to: { ...emptyParty },
  shipToEnabled: false,
  shipTo: { ...emptyShipTo },
  authorizedByName: "",
  authorizedByDesignation: "",
  notes: "",
  taxRate: 0,
  currency: CURRENCIES[0], // KES
  accentColor: ACCENT_COLORS[6], // orange #f97316 (closest to #d97706)
  logoDataUrl: null,
  signatureDataUrl: null,
  photoDataUrls: [],
  items: [
    {
      id: generateItemId(),
      description: "",
      additionalDetails: "",
      quantity: 1,
      unitPrice: 0,
    },
  ],
  isPaid: false,
};

// ─── Store ────────────────────────────────────────────────────

interface PurchaseOrderStore extends PurchaseOrderData {
  // Meta
  currentPurchaseOrderId: string | null;
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
  loadPurchaseOrder: (data: Partial<PurchaseOrderData> & { id?: string; publicId?: string }) => void;
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

export const usePurchaseOrderStore = create<PurchaseOrderStore>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultPurchaseOrder,
      currentPurchaseOrderId: null,
      currentPublicId: null,
      isSaving: false,
      isDirty: false,

      // ── Setters ────────────────────────────────
      setField: (path, value) =>
        set((state) => ({
          ...deepSet(state as unknown as Record<string, unknown>, path, value),
          isDirty: true,
        } as Partial<PurchaseOrderStore>)),

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
              unitPrice: 0,
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
        set({ currentPurchaseOrderId: id, currentPublicId: publicId }),

      // ── Lifecycle ──────────────────────────────
      reset: () =>
        set({
          ...defaultPurchaseOrder,
          items: [
            {
              id: generateItemId(),
              description: "",
              additionalDetails: "",
              quantity: 1,
              unitPrice: 0,
            },
          ],
          currentPurchaseOrderId: null,
          currentPublicId: null,
          isSaving: false,
          isDirty: false,
        }),

      loadPurchaseOrder: (data) =>
        set((state) => ({
          ...state,
          ...data,
          currentPurchaseOrderId: data.id ?? state.currentPurchaseOrderId,
          currentPublicId: data.publicId ?? state.currentPublicId,
          isDirty: false,
        })),
    }),
    {
      name: "invosafi-purchase-order-store",
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
        purchaseOrderNumber: state.purchaseOrderNumber,
        issueDate: state.issueDate,
        expectedDeliveryDate: state.expectedDeliveryDate,
        paymentTerms: state.paymentTerms,
        orderNumber: state.orderNumber,
        from: state.from,
        to: state.to,
        shipToEnabled: state.shipToEnabled,
        shipTo: state.shipTo,
        authorizedByName: state.authorizedByName,
        authorizedByDesignation: state.authorizedByDesignation,
        notes: state.notes,
        taxRate: state.taxRate,
        currency: state.currency,
        accentColor: state.accentColor,
        items: state.items,
      }),
    }
  )
);
