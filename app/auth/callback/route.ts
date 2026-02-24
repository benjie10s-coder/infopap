// app/auth/callback/route.ts — Supabase OAuth callback (no auto-migration)
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { clearGuestSession, migrateSingleDocument } from "@/lib/session";
import { createRequestLogger } from "@/lib/logger";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const logger = createRequestLogger();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  
  // Use environment variable for origin to handle proxies (Docker, Railway, etc.)
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
  }

  try {
    const supabase = await createServerClient();

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      logger.error("auth_callback_exchange_error", {
        error: error?.message,
      });
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
    }

    const user = data.session.user;

    // Find or create user in our User table
    const admin = getAdminClient();
    const { data: existingUser } = await admin
      .from("User")
      .select("id")
      .eq("externalId", user.id)
      .single();

    if (!existingUser) {
      const { error: insertError } = await admin.from("User").insert({
        id: user.id,
        externalId: user.id,
        email: user.email ?? "",
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User",
        avatarUrl: user.user_metadata?.avatar_url || null,
      });

      if (insertError && insertError.code !== "23505") {
        logger.error("auth_callback_user_create_error", {
          error: insertError.message,
        });
      }
    }

    // Get our user record
    const { data: ourUser } = await admin
      .from("User")
      .select("id")
      .eq("externalId", user.id)
      .single();

    if (ourUser) {
      // Check for a pending single-document save (set before OAuth redirect)
      const cookieStore = cookies();
      const pendingDocRaw = cookieStore.get("invopap_pending_doc")?.value;
      const pendingDoc = pendingDocRaw
        ? decodeURIComponent(pendingDocRaw)
        : null;

      if (pendingDoc) {
        try {
          const { publicId, documentType } = JSON.parse(pendingDoc);
          if (publicId && documentType) {
            const migrated = await migrateSingleDocument(
              publicId,
              documentType,
              ourUser.id
            );
            if (migrated) {
              logger.info("guest_document_saved", {
                userId: ourUser.id,
                publicId,
                documentType,
              });
            }
          }
        } catch (migrateError) {
          logger.error("pending_doc_migration_error", {
            error:
              migrateError instanceof Error
                ? migrateError.message
                : "unknown",
          });
        }

        // Clear the pending doc cookie
        try {
          cookieStore.set("invopap_pending_doc", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 0,
            path: "/",
          });
        } catch {
          // Read-only context
        }
      }

      // Always clear guest session — no bulk migration
      clearGuestSession();
    }

    logger.info("auth_callback_success", {
      userId: ourUser?.id,
      email: user.email,
    });

    return NextResponse.redirect(`${origin}${next}`);
  } catch (error) {
    logger.error("auth_callback_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(`${origin}/auth/login?error=unknown`);
  }
}
