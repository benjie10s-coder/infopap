// lib/store/deliveryNoteStore.ts — Zustand state for delivery note editor
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { InvoiceParty } from "@/lib/store/invoiceStore";
import { ACCENT_COLORS } from "@/lib/store/invoiceStore";

// ─── Types ────────────────────────────────────────────────────

export interface DeliveryNoteLineItem {
  id: string;
  description: string;
  additionalDetails: string;
  quantity: number;
}

export interface DeliveryNoteData {
  documentTitle: string;
  deliveryNoteNumber: string;
  issueDate: string;
  orderNumber: string;
  referenceInvoiceNumber: string;
  from: InvoiceParty;
  to: InvoiceParty;
  notes: string;
  acknowledgmentText: string;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  photoDataUrls: string[];
  items: DeliveryNoteLineItem[];
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

const defaultDeliveryNote: DeliveryNoteData = {
  documentTitle: "DELIVERY NOTE",
  deliveryNoteNumber: "",
  issueDate: today(),
  orderNumber: "",
  referenceInvoiceNumber: "",
  from: { ...emptyParty },
  to: { ...emptyParty },
  notes: "",
  acknowledgmentText: "Goods received in good order",
  accentColor: ACCENT_COLORS[9], // teal #14b8a6
  logoDataUrl: null,
  signatureDataUrl: null,
  photoDataUrls: [],
  items: [
    {
      id: generateItemId(),
      description: "",
      additionalDetails: "",
      quantity: 1,
    },
  ],
  isPaid: false,
};

// ─── Store ────────────────────────────────────────────────────

interface DeliveryNoteStore extends DeliveryNoteData {
  // Meta
  currentDeliveryNoteId: string | null;
  currentPublicId: string | null;
  isSaving: boolean;
  isDirty: boolean;

  // Setters
  setField: (path: string, value: unknown) => void;
  setLogo: (dataUrl: string | null) => void;
  setSignature: (dataUrl: string | null) => void;
  addPhoto: (dataUrl: string) => void;
  removePhoto: (index: number) => void;
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
  loadDeliveryNote: (data: Partial<DeliveryNoteData> & { id?: string; publicId?: string }) => void;
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

export const useDeliveryNoteStore = create<DeliveryNoteStore>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultDeliveryNote,
      currentDeliveryNoteId: null,
      currentPublicId: null,
      isSaving: false,
      isDirty: false,

      // ── Setters ────────────────────────────────
      setField: (path, value) =>
        set((state) => ({
          ...deepSet(state as unknown as Record<string, unknown>, path, value),
          isDirty: true,
        } as Partial<DeliveryNoteStore>)),

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
        set({ currentDeliveryNoteId: id, currentPublicId: publicId }),

      // ── Lifecycle ──────────────────────────────
      reset: () =>
        set({
          ...defaultDeliveryNote,
          items: [
            {
              id: generateItemId(),
              description: "",
              additionalDetails: "",
              quantity: 1,
            },
          ],
          currentDeliveryNoteId: null,
          currentPublicId: null,
          isSaving: false,
          isDirty: false,
        }),

      loadDeliveryNote: (data) =>
        set((state) => ({
          ...state,
          ...data,
          currentDeliveryNoteId: data.id ?? state.currentDeliveryNoteId,
          currentPublicId: data.publicId ?? state.currentPublicId,
          isDirty: false,
        })),
    }),
    {
      name: "invosafi-delivery-note-store",
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
        deliveryNoteNumber: state.deliveryNoteNumber,
        issueDate: state.issueDate,
        orderNumber: state.orderNumber,
        referenceInvoiceNumber: state.referenceInvoiceNumber,
        from: state.from,
        to: state.to,
        notes: state.notes,
        acknowledgmentText: state.acknowledgmentText,
        accentColor: state.accentColor,
        items: state.items,
      }),
    }
  )
);
