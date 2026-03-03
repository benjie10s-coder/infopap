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


