// middleware.ts — CSRF protection + Supabase session refresh
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Paths exempt from CSRF checking
const CSRF_EXEMPT_PATHS = ["/api/payments/callback"];

// Mutating methods that require CSRF protection
const MUTATING_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

// Editor page routes — skip session refresh for these (client-side useAuth handles it)
const EDITOR_ROUTES = [
  "/cash-sale",
  "/delivery-note",
  "/quotation",
  "/purchase-order",
  "/receipt",
];

// Public API routes that don't need Supabase session refresh.
// Payment routes use publicId (no user session), and public status/document
// routes are polled frequently — skipping getUser() saves 50-200ms per request.
const PUBLIC_API_PREFIXES = [
  "/api/payments/",         // initiate, query, callback
  "/api/invoices/public/",
  "/api/cash-sales/public/",
  "/api/delivery-notes/public/",
  "/api/receipts/public/",
  "/api/purchase-orders/public/",
  "/api/quotations/public/",
  "/api/documents/",        // public download routes
  "/view/",                 // public document view pages
];

function isEditorRoute(pathname: string): boolean {
  // Exact match for home "/"
  if (pathname === "/") return true;
  // Exact match for editor routes (not their sub-routes like /api/cash-sales)
  return EDITOR_ROUTES.some((route) => pathname === route);
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  // 1. CSRF protection for mutating requests
  if (MUTATING_METHODS.includes(request.method)) {
    const pathname = request.nextUrl.pathname;
    const isExempt = CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p));

    if (!isExempt && process.env.NODE_ENV === "production") {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;

      if (origin) {
        const originHost = new URL(origin).host;
        // Normalize appUrl: add https:// if missing a protocol
        const normalizedAppUrl = appUrl
          ? appUrl.includes("://") ? appUrl : `https://${appUrl}`
          : null;
        const expectedHost = normalizedAppUrl ? new URL(normalizedAppUrl).host : host;

        if (originHost !== expectedHost) {
          return NextResponse.json(
            { error: "CSRF: Origin mismatch" },
            { status: 403 }
          );
        }
      }
    }
  }

  // 2. Skip Supabase session refresh for editor pages (saves 50-200ms per navigation)
  if (isEditorRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // 3. Skip session refresh for public/payment routes (saves 50-200ms per request)
  //    These routes authenticate via publicId, not user sessions.
  //    At scale (500+ payments/day), this eliminates thousands of unnecessary
  //    Supabase auth.getUser() calls from polling and payment initiation.
  if (isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // 4. Refresh Supabase session for all other routes (API, dashboard, auth, etc.)
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
