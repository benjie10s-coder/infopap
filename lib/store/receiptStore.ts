// lib/store/receiptStore.ts — Zustand state for receipt editor
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CURRENCIES } from "@/lib/utils/format";
import type { Currency } from "@/lib/utils/format";
import type { InvoiceParty } from "@/lib/store/invoiceStore";
import { ACCENT_COLORS } from "@/lib/store/invoiceStore";
import { calculateReceiptBalance, numberToWords } from "@/lib/utils/receipt-totals";

// ─── Types ────────────────────────────────────────────────────

export type PaymentMethod = "cash" | "mpesa" | "bank" | "";

export interface ReceiptData {
  documentTitle: string;
  receiptNumber: string;
  issueDate: string;
  from: InvoiceParty;
  to: InvoiceParty;
  currency: Currency;
  totalAmountOwed: number;
  amountReceived: number;
  outstandingBalance: number;
  amountInWords: string;
  beingPaymentOf: string;
  paymentMethod: PaymentMethod;
  transactionCode: string;
  accentColor: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  photoDataUrls: string[];
  notes: string;
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

const defaultReceipt: ReceiptData = {
  documentTitle: "OFFICIAL RECEIPT",
  receiptNumber: "",
  issueDate: today(),
  from: { ...emptyParty },
  to: { ...emptyParty },
  currency: CURRENCIES[0], // KES
  totalAmountOwed: 0,
  amountReceived: 0,
  outstandingBalance: 0,
  amountInWords: "",
  beingPaymentOf: "",
  paymentMethod: "",
  transactionCode: "",
  accentColor: ACCENT_COLORS[3], // purple #8b5cf6 — close to the screenshot's deep purple
  logoDataUrl: null,
  signatureDataUrl: null,
  photoDataUrls: [],
  notes: "",
  isPaid: false,
};

// ─── Store ────────────────────────────────────────────────────

interface ReceiptStore extends ReceiptData {
  // Meta
  currentReceiptId: string | null;
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

  // Status
  setIsPaid: (paid: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setMeta: (id: string | null, publicId: string | null) => void;

  // Lifecycle
  reset: () => void;
  loadReceipt: (data: Partial<ReceiptData> & { id?: string; publicId?: string }) => void;
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

/**
 * Given partial state, recalculate outstandingBalance and amountInWords.
 */
function recalculate(state: ReceiptData): Partial<ReceiptData> {
  const { totalAmountOwed, amountReceived, outstandingBalance } =
    calculateReceiptBalance({
      totalAmountOwed: state.totalAmountOwed,
      amountReceived: state.amountReceived,
    });

  const amountInWords =
    state.amountReceived > 0
      ? numberToWords(state.amountReceived, state.currency.code)
      : "";

  return {
    totalAmountOwed,
    amountReceived,
    outstandingBalance,
    amountInWords,
  };
}

export const useReceiptStore = create<ReceiptStore>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultReceipt,
      currentReceiptId: null,
      currentPublicId: null,
      isSaving: false,
      isDirty: false,

      // ── Setters ────────────────────────────────
      setField: (path, value) =>
        set((state) => {
          const updated = {
            ...deepSet(state as unknown as Record<string, unknown>, path, value),
            isDirty: true,
          } as unknown as ReceiptStore;

          // If financial field changed, recalculate
          if (
            path === "totalAmountOwed" ||
            path === "amountReceived" ||
            path === "currency"
          ) {
            Object.assign(updated, recalculate(updated));
          }

          return updated as Partial<ReceiptStore>;
        }),

      setLogo: (dataUrl) => set({ logoDataUrl: dataUrl, isDirty: true }),

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
        set((state) => {
          const amountInWords =
            state.amountReceived > 0
              ? numberToWords(state.amountReceived, currency.code)
              : "";
          return { currency, amountInWords, isDirty: true };
        }),

      setAccentColor: (color) => set({ accentColor: color, isDirty: true }),

      // ── Status ─────────────────────────────────
      setIsPaid: (paid) => set({ isPaid: paid }),
      setIsSaving: (saving) => set({ isSaving: saving }),
      setMeta: (id, publicId) =>
        set({ currentReceiptId: id, currentPublicId: publicId }),

      // ── Lifecycle ──────────────────────────────
      reset: () =>
        set({
          ...defaultReceipt,
          currentReceiptId: null,
          currentPublicId: null,
          isSaving: false,
          isDirty: false,
        }),

      loadReceipt: (data) =>
        set((state) => ({
          ...state,
          ...data,
          currentReceiptId: data.id ?? state.currentReceiptId,
          currentPublicId: data.publicId ?? state.currentPublicId,
          isDirty: false,
        })),
    }),
    {
      name: "invopap-receipt-store",
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
        receiptNumber: state.receiptNumber,
        issueDate: state.issueDate,
        from: state.from,
        to: state.to,
        currency: state.currency,
        totalAmountOwed: state.totalAmountOwed,
        amountReceived: state.amountReceived,
        outstandingBalance: state.outstandingBalance,
        amountInWords: state.amountInWords,
        beingPaymentOf: state.beingPaymentOf,
        paymentMethod: state.paymentMethod,
        transactionCode: state.transactionCode,
        accentColor: state.accentColor,
        notes: state.notes,
      }),
    }
  )
);
