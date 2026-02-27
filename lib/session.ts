// lib/session.ts — Guest session + tenant context resolution
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

const GUEST_COOKIE_NAME = "invopap_guest_session";
const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export interface TenantContext {
  userId: string | null;
  guestSessionId: string | null;
  isAuthenticated: boolean;
}

/**
 * Resolves the current tenant context:
 * 1. Check Supabase auth → look up User table → return { userId }
 * 2. Fall back to guest session cookie → return { guestSessionId }
 */
export async function getTenantContext(): Promise<TenantContext> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Look up our User table by externalId
      const admin = getAdminClient();
      const { data: dbUser } = await admin
        .from("User")
        .select("id")
        .eq("externalId", user.id)
        .single();

      if (dbUser) {
        return {
          userId: dbUser.id,
          guestSessionId: null,
          isAuthenticated: true,
        };
      }
    }
  } catch {
    // Auth check failed — fall through to guest session
  }

  // Guest session fallback
  const guestSessionId = getOrCreateGuestSession();
  return {
    userId: null,
    guestSessionId,
    isAuthenticated: false,
  };
}

/**
 * Get or create a guest session ID from the cookie.
 */
export function getOrCreateGuestSession(): string {
  const cookieStore = cookies();
  const existing = cookieStore.get(GUEST_COOKIE_NAME);

  if (existing?.value) {
    return existing.value;
  }

  const sessionId = uuidv4();
  try {
    cookieStore.set(GUEST_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: GUEST_COOKIE_MAX_AGE,
      path: "/",
    });
  } catch {
    // Server Component — cookies are read-only, will be set on next request
  }

  return sessionId;
}

/**
 * Get guest session ID from cookie (read-only, doesn't create).
 */
export function getGuestSessionId(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(GUEST_COOKIE_NAME)?.value || null;
}

/**
 * Delete the guest session cookie (after user signs up).
 */
export function clearGuestSession(): void {
  const cookieStore = cookies();
  try {
    cookieStore.set(GUEST_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  } catch {
    // Server Component — read-only
  }
}

/**
 * Document type mapping from ShareModal types to DB table names.
 */
type DocumentTable =
  | "Invoice"
  | "CashSale"
  | "DeliveryNote"
  | "Receipt"
  | "PurchaseOrder"
  | "Quotation";

const DOC_TYPE_TO_TABLE: Record<string, DocumentTable> = {
  invoice: "Invoice",
  "cash-sale": "CashSale",
  "delivery-note": "DeliveryNote",
  receipt: "Receipt",
  "purchase-order": "PurchaseOrder",
  quotation: "Quotation",
};

/**
 * Migrate a SINGLE guest document to a user account by publicId.
 * Used when a guest signs up via the "Save this document" prompt.
 * Returns true if the document was successfully migrated.
 */
export async function migrateSingleDocument(
  publicId: string,
  documentType: string,
  userId: string
): Promise<boolean> {
  const admin = getAdminClient();

  const table = DOC_TYPE_TO_TABLE[documentType];
  if (!table) {
    console.error(`Unknown document type for migration: ${documentType}`);
    return false;
  }

  const { data, error } = await admin
    .from(table)
    .update({ userId, guestSessionId: null })
    .eq("publicId", publicId)
    .is("userId", null)
    .select("id");

  if (error) {
    console.error(`Failed to migrate guest ${table}: ${error.message}`);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Migrate ALL guest documents for a given guestSessionId to a user account.
 * Called during auth callback to claim all pre-login documents.
 * Returns the total number of documents migrated.
 */
export async function migrateAllGuestDocuments(
  guestSessionId: string,
  userId: string
): Promise<number> {
  const admin = getAdminClient();
  const tables: DocumentTable[] = [
    "Invoice",
    "CashSale",
    "DeliveryNote",
    "Receipt",
    "PurchaseOrder",
    "Quotation",
  ];

  let total = 0;
  await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await admin
        .from(table)
        .update({ userId, guestSessionId: null })
        .eq("guestSessionId", guestSessionId)
        .is("userId", null)
        .select("id");
      if (error) {
        console.error(`Failed to migrate guest ${table}: ${error.message}`);
      } else {
        total += data?.length || 0;
      }
    })
  );

  return total;
}
