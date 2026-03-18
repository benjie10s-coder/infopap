# InvoSafi — Complete System Specification

> **Purpose**: This document is a comprehensive, implementation-ready specification for building **InvoSafi** — a large-scale, multi-tenant, guest-first document generation SaaS with M-Pesa payments. It is written so that an AI coding agent (Claude) can build the entire system from scratch with zero ambiguity.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Project Structure](#3-project-structure)
4. [Data Model (Supabase PostgreSQL)](#4-data-model-supabase-postgresql)
5. [Database Migrations](#5-database-migrations)
6. [Authentication & Multi-Tenancy](#6-authentication--multi-tenancy)
7. [Guest-First Flow](#7-guest-first-flow)
8. [Document Generation & PDF](#8-document-generation--pdf)
9. [Payment System (M-Pesa STK Push)](#9-payment-system-m-pesa-stk-push)
10. [API Routes](#10-api-routes)
11. [Client-Side State Management](#11-client-side-state-management)
12. [UI Components](#12-ui-components)
13. [Security Architecture](#13-security-architecture)
14. [Rate Limiting](#14-rate-limiting)
15. [File Storage](#15-file-storage)
16. [Scalability (50K docs/month)](#16-scalability-50k-docsmonth)
17. [Design System](#17-design-system)
18. [Environment Variables](#18-environment-variables)
19. [Deployment (Railway + Docker)](#19-deployment-railway--docker)
20. [Testing Strategy](#20-testing-strategy)
21. [Gaps & Hardening (Production-Readiness Audit)](#21-gaps--hardening-production-readiness-audit)

---

## 1. Product Overview

### What is InvoSafi?

InvoSafi is a **guest-first invoice, receipt, quote, and proforma invoice generator** built for the Kenyan market. Users can create professional documents **without creating an account**. The platform charges **KSh 10 per document download** via M-Pesa STK Push. Users can preview documents for free (with a watermark), but must pay to download the clean PDF.

### Core Value Proposition

- **Zero-friction start**: No signup required. Open the app → fill in details → preview instantly
- **M-Pesa native**: Pay KSh 10 via STK Push on your phone → download clean PDF immediately
- **Professional output**: Crystal-clear, print-ready documents with customizable branding (logo, signature, accent color)
- **Dashboard for power users**: Optional Google account sign-in for document history, stats, and management

### Document Types

| Type | Document Title Default | Use Case |
|------|----------------------|----------|
| `INVOICE` | "Invoice" | Billing clients for goods/services |
| `RECEIPT` | "Receipt" | Acknowledging payment received |
| `ESTIMATE` | "Estimate" | Preliminary cost projection |
| `QUOTE` | "Quote" | Formal price quotation |

### Monetization

- **KSh 10 per document download** (paid via M-Pesa STK Push)
- Preview is always free (watermarked)
- Shareable public links are free (watermarked view for unpaid)
- The KSh 10 is a **flat fee per document**, regardless of the invoice amount

---

## 2. Architecture & Tech Stack

### Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js (App Router) | 14.x | Full-stack React framework |
| Language | TypeScript | 5.x | Type safety |
| Database | Supabase (PostgreSQL) | Latest | Auth, DB, Storage, RLS |
| Auth | Supabase Auth | — | Google OAuth (SSR via `@supabase/ssr`) |
| State | Zustand | 4.x | Client-side invoice editor state |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| PDF | `@react-pdf/renderer` | Latest | Server-side PDF generation |
| Payments | Safaricom Daraja API | v1 | M-Pesa STK Push |
| Validation | Zod | 4.x | API input validation |
| IDs | `@paralleldrive/cuid2` | 3.x | Collision-resistant unique IDs |
| UUIDs | `uuid` | 9.x | Guest session cookies |
| Rate Limit | Upstash Redis (optional) | — | Distributed rate limiting |
| Deployment | Railway | — | Docker container hosting |
| Container | Docker (multi-stage) | Alpine | Standalone Next.js output |

### Architecture Diagram (Mental Model)

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER (Client)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │InvoiceEditor│  │InvoicePreview│  │PaymentModal│  │
│  └─────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
│        │ Zustand store    │ read-only      │ fetch   │
│        └────────┬─────────┘                │         │
│                 ▼                           ▼         │
├─────────────────────────────────────────────────────┤
│              NEXT.JS SERVER (App Router)             │
│  ┌──────────────────────────────────────────────┐   │
│  │ Middleware: CSRF, Session refresh, Headers    │   │
│  ├──────────────────────────────────────────────┤   │
│  │ API Routes:                                   │   │
│  │  /api/invoices      (CRUD + list)             │   │
│  │  /api/invoices/public/[publicId] (public read)│   │
│  │  /api/payments/initiate (STK Push)            │   │
│  │  /api/payments/callback (Safaricom webhook)   │   │
│  │  /api/payments/query (fallback status check)  │   │
│  │  /api/documents/download/[publicId] (PDF gen) │   │
│  │  /api/health                                  │   │
│  ├──────────────────────────────────────────────┤   │
│  │ Libraries:                                    │   │
│  │  lib/session.ts     (tenant context)          │   │
│  │  lib/mpesa.ts       (Daraja client)           │   │
│  │  lib/rate-limit.ts  (token bucket + Redis)    │   │
│  │  lib/storage.ts     (Supabase Storage)        │   │
│  │  lib/validators.ts  (Zod schemas)             │   │
│  │  lib/pdf.tsx        (PDF template)            │   │
│  │  lib/db/*.ts        (data access layer)       │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│                   SUPABASE                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Auth     │ │ Database │ │ Storage  │            │
│  │ (Google) │ │ (Postgres│ │ (logos,  │            │
│  │          │ │  + RLS)  │ │ sigs)    │            │
│  └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│              SAFARICOM DARAJA API                    │
│  STK Push → Callback → Mark Invoice Paid             │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **PascalCase table names + camelCase columns** — Supabase tables use `"Invoice"`, `"LineItem"`, `"User"`, `"Payment"`, `"InvoicePhoto"`. Column names use `camelCase` (e.g., `invoiceNumber`, `guestSessionId`). Always quote table names in SQL.
2. **Admin client (service role) vs User client (anon key)** — The admin client bypasses RLS for server-side operations (payments, public reads, migrations). The user client respects RLS for authenticated operations.
3. **Server-side totals calculation** — Financial totals (`subtotal`, `taxAmount`, `discountAmount`, `total`) are always calculated on the server from line items; never trust client-provided totals.
4. **Image storage** — Base64 data URLs are uploaded to Supabase Storage; the URL is stored in the database (not the base64 blob itself).
5. **Standalone Docker output** — Next.js `output: "standalone"` reduces image size from ~200MB to ~30MB.

---

## 3. Project Structure

```
invosafi/
├── app/
│   ├── layout.tsx                          # Root layout (fonts, metadata)
│   ├── page.tsx                            # Home page → InvoiceEditor
│   ├── globals.css                         # Tailwind + custom styles
│   ├── error.tsx                           # Global error boundary
│   ├── not-found.tsx                       # 404 page
│   ├── (auth)/
│   │   ├── layout.tsx                      # Auth pages layout (centered card)
│   │   ├── error.tsx                       # Auth error boundary
│   │   ├── login/page.tsx                  # Login page (Google OAuth)
│   │   └── signup/page.tsx                 # Signup page (Google OAuth)
│   ├── (dashboard)/
│   │   ├── layout.tsx                      # Dashboard layout (auth-gated, sidebar)
│   │   ├── error.tsx                       # Dashboard error boundary
│   │   └── dashboard/
│   │       ├── page.tsx                    # Dashboard page (stats + invoice list)
│   │       └── loading.tsx                 # Loading skeleton
│   ├── auth/
│   │   └── callback/route.ts              # OAuth callback handler
│   └── api/
│       ├── health/route.ts                # Health check endpoint
│       ├── invoices/
│       │   ├── route.ts                   # GET (list) / POST (create)
│       │   ├── [id]/route.ts              # GET / PUT / DELETE (by ID)
│       │   └── public/
│       │       └── [publicId]/
│       │           ├── route.ts           # GET (public read)
│       │           └── status/route.ts    # GET (payment status polling)
│       ├── payments/
│       │   ├── initiate/route.ts          # POST (STK Push)
│       │   ├── callback/route.ts          # POST (Safaricom webhook)
│       │   └── query/route.ts             # POST (manual status query)
│       └── documents/
│           └── download/
│               └── [publicId]/route.ts    # GET (PDF download — requires payment)
├── components/
│   ├── InvoiceEditor.tsx                   # Main editor (orchestrator)
│   ├── InvoiceForm.tsx                     # Left panel: editable form fields
│   ├── InvoicePreview.tsx                  # Right panel: live preview
│   ├── LineItemsEditor.tsx                 # Line items table (add/remove/edit)
│   ├── OptionsSidebar.tsx                  # Bottom options (color, type, tax, discount)
│   ├── PaymentModal.tsx                    # M-Pesa payment flow modal
│   ├── AuthNav.tsx                         # Navigation for auth pages
│   └── UserNav.tsx                         # User avatar + dropdown (dashboard)
├── lib/
│   ├── db.ts                              # Re-exports from db/ layer
│   ├── env.ts                             # Environment variable validation
│   ├── mpesa.ts                           # Safaricom Daraja API client
│   ├── rate-limit.ts                      # Rate limiter (in-memory + Redis)
│   ├── session.ts                         # Guest session + tenant context
│   ├── storage.ts                         # Supabase Storage upload helpers
│   ├── validators.ts                      # Zod validation schemas
│   ├── pdf.tsx                            # PDF document template (@react-pdf/renderer)
│   ├── db/
│   │   ├── types.ts                       # TypeScript types for all DB entities
│   │   ├── supabase-db.ts                 # Invoice + User CRUD (main DAL)
│   │   ├── payments.ts                    # Payment CRUD (admin client)
│   │   └── invoices.ts                    # Re-exports from supabase-db.ts
│   ├── store/
│   │   └── invoiceStore.ts               # Zustand store (client-side state)
│   ├── supabase/
│   │   ├── client.ts                      # Browser Supabase client
│   │   ├── server.ts                      # Server Supabase client (cookie-based)
│   │   ├── admin.ts                       # Admin client (service role, bypasses RLS)
│   │   └── middleware.ts                  # Session refresh middleware
│   └── utils/
│       ├── format.ts                      # Currency formatting helpers
│       └── totals.ts                      # Shared invoice totals calculation
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql                 # Core tables (User, Invoice, LineItem, etc.)
│       ├── 002_storage_buckets.sql        # Storage buckets
│       ├── 003_security_and_scale.sql     # Indexes, RLS, RPCs, monetary precision
│       └── 004_security_hardening.sql     # RPC auth, guest RLS, stale payment cleanup
├── middleware.ts                           # Next.js middleware (CSRF, session)
├── instrumentation.ts                     # Env validation on startup
├── next.config.mjs                        # Next.js config (standalone, security headers)
├── tailwind.config.ts                     # Tailwind config (custom design tokens)
├── postcss.config.js                      # PostCSS config
├── tsconfig.json                          # TypeScript config
├── package.json                           # Dependencies
├── Dockerfile                             # Multi-stage Docker build
├── railway.json                           # Railway deployment config
└── README.md                              # Project documentation
```

---

## 4. Data Model (Supabase PostgreSQL)

### Entity Relationship

```
User (1) ──── (0..N) Invoice (1) ──── (0..N) LineItem
                       │
                       ├──── (0..N) InvoicePhoto
                       │
                       └──── (0..N) Payment
```

### Table: `"User"`

Stores registered users (those who signed in via Google OAuth).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | CUID2 | Primary key |
| `email` | TEXT | NO | — | Unique |
| `name` | TEXT | YES | — | Display name |
| `avatarUrl` | TEXT | YES | — | Google avatar |
| `externalId` | TEXT | YES | — | Supabase Auth UID (unique) |
| `provider` | TEXT | YES | — | "google" |
| `businessName` | TEXT | YES | — | Default business name |
| `businessEmail` | TEXT | YES | — | Default business email |
| `businessPhone` | TEXT | YES | — | Default business phone |
| `businessAddress` | TEXT | YES | — | Default address |
| `businessCity` | TEXT | YES | — | Default city |
| `businessZipCode` | TEXT | YES | — | Default zip |
| `businessNumber` | TEXT | YES | — | KRA PIN / business reg |
| `defaultCurrency` | TEXT | NO | `'KES'` | Default currency code |
| `defaultTaxRate` | NUMERIC(5,2) | NO | `16` | Default tax rate (Kenya VAT) |
| `logoUrl` | TEXT | YES | — | Supabase Storage URL |
| `signatureUrl` | TEXT | YES | — | Supabase Storage URL |
| `createdAt` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updatedAt` | TIMESTAMPTZ | NO | `NOW()` | Auto-updated via trigger |

### Table: `"Invoice"`

Core document table. Supports both authenticated users and guest sessions.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | CUID2 | Primary key |
| `userId` | TEXT | YES | — | FK → `"User".id` (NULL for guests) |
| `guestSessionId` | TEXT | YES | — | UUID from cookie (NULL for auth users) |
| `publicId` | TEXT | NO | CUID2 | Unique, for shareable links |
| `documentType` | TEXT | NO | `'INVOICE'` | INVOICE, RECEIPT, ESTIMATE, QUOTE |
| `documentTitle` | TEXT | NO | `'Invoice'` | Custom document title |
| `invoiceNumber` | TEXT | NO | — | e.g., `INV-2026-A1B2C3D4EF` |
| `issueDate` | TIMESTAMPTZ | NO | `NOW()` | — |
| `dueDate` | TIMESTAMPTZ | NO | — | — |
| `paymentTerms` | TEXT | NO | `'NET_7'` | DUE_ON_RECEIPT, NET_7/15/30/60, CUSTOM |
| `fromName` | TEXT | NO | — | Sender business name |
| `fromEmail` | TEXT | YES | — | — |
| `fromPhone` | TEXT | YES | — | — |
| `fromMobile` | TEXT | YES | — | — |
| `fromFax` | TEXT | YES | — | — |
| `fromAddress` | TEXT | YES | — | — |
| `fromCity` | TEXT | YES | — | — |
| `fromZipCode` | TEXT | YES | — | — |
| `fromBusinessNumber` | TEXT | YES | — | KRA PIN |
| `toName` | TEXT | NO | — | Recipient name |
| `toEmail` | TEXT | YES | — | — |
| `toPhone` | TEXT | YES | — | — |
| `toMobile` | TEXT | YES | — | — |
| `toFax` | TEXT | YES | — | — |
| `toAddress` | TEXT | YES | — | — |
| `toCity` | TEXT | YES | — | — |
| `toZipCode` | TEXT | YES | — | — |
| `toBusinessNumber` | TEXT | YES | — | — |
| `currency` | TEXT | NO | `'KES'` | ISO 4217 code |
| `taxRate` | NUMERIC(5,2) | NO | `16` | Tax percentage |
| `discountType` | TEXT | NO | `'PERCENTAGE'` | PERCENTAGE or FIXED |
| `discountValue` | NUMERIC(15,2) | NO | `0` | — |
| `subtotal` | NUMERIC(15,2) | NO | — | Server-calculated |
| `taxAmount` | NUMERIC(15,2) | NO | — | Server-calculated |
| `discountAmount` | NUMERIC(15,2) | NO | — | Server-calculated |
| `total` | NUMERIC(15,2) | NO | — | Server-calculated |
| `accentColor` | TEXT | NO | `'#1f8ea3'` | Hex color for branding |
| `logoDataUrl` | TEXT | YES | — | Supabase Storage URL (after upload) |
| `signatureDataUrl` | TEXT | YES | — | Supabase Storage URL (after upload) |
| `notes` | TEXT | YES | — | Freeform notes/terms |
| `isPaid` | BOOLEAN | NO | `false` | Payment status for the KSh 10 download fee |
| `paidAt` | TIMESTAMPTZ | YES | — | Timestamp of KSh 10 payment |
| `createdAt` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updatedAt` | TIMESTAMPTZ | NO | `NOW()` | Auto-updated via trigger |

**Constraints:**
- `CHECK ("userId" IS NOT NULL OR "guestSessionId" IS NOT NULL)` — every invoice must have a tenant
- `UNIQUE ("userId", "invoiceNumber") WHERE "userId" IS NOT NULL` — unique invoice numbers per user
- Index on `("userId", "isPaid")` — dashboard stats
- Index on `("userId", "dueDate")` — overdue queries
- Index on `("guestSessionId")` — guest lookups
- Index on `("publicId")` — unique, public link lookups

### Table: `"LineItem"`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | CUID2 | Primary key |
| `invoiceId` | TEXT | NO | — | FK → `"Invoice".id` ON DELETE CASCADE |
| `description` | TEXT | NO | — | Item description |
| `additionalDetails` | TEXT | YES | — | Extra details |
| `quantity` | NUMERIC(12,4) | NO | — | Supports fractional units |
| `rate` | NUMERIC(15,2) | NO | — | Unit price |
| `amount` | NUMERIC(15,2) | NO | — | `quantity × rate` (server-calculated) |
| `sortOrder` | INTEGER | NO | `0` | Display order |
| `createdAt` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updatedAt` | TIMESTAMPTZ | NO | `NOW()` | Auto-updated via trigger |

### Table: `"InvoicePhoto"`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | CUID2 | Primary key |
| `invoiceId` | TEXT | NO | — | FK → `"Invoice".id` ON DELETE CASCADE |
| `url` | TEXT | NO | — | Supabase Storage URL |
| `filename` | TEXT | YES | — | Original filename |
| `sortOrder` | INTEGER | NO | `0` | Display order |
| `createdAt` | TIMESTAMPTZ | NO | `NOW()` | — |

### Table: `"Payment"`

Tracks M-Pesa transactions for the KSh 10 download fee.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | CUID2 | Primary key |
| `invoiceId` | TEXT | NO | — | FK → `"Invoice".id` |
| `userId` | TEXT | YES | — | FK → `"User".id` (NULL for guests) |
| `phoneNumber` | TEXT | NO | — | Normalized: `254XXXXXXXXX` |
| `amount` | NUMERIC(15,2) | NO | — | Always `10.00` (KSh 10 flat fee) |
| `currency` | TEXT | NO | `'KES'` | Always KES |
| `merchantRequestId` | TEXT | YES | — | From Daraja |
| `checkoutRequestId` | TEXT | YES | — | From Daraja (indexed) |
| `mpesaReceiptNumber` | TEXT | YES | — | On success |
| `transactionDate` | TIMESTAMPTZ | YES | — | From Daraja callback |
| `status` | TEXT | NO | `'PENDING'` | PENDING → PROCESSING → COMPLETED/FAILED/CANCELLED |
| `resultCode` | TEXT | YES | — | Daraja result code |
| `resultDesc` | TEXT | YES | — | Daraja result description |
| `createdAt` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updatedAt` | TIMESTAMPTZ | NO | `NOW()` | Auto-updated via trigger |
| `completedAt` | TIMESTAMPTZ | YES | — | When payment completed |

**Indexes:**
- `("checkoutRequestId")` — callback/query lookups
- `("invoiceId", "createdAt" DESC)` — payment history per invoice
- `(status, "createdAt") WHERE status IN ('PENDING', 'PROCESSING')` — stale payment cleanup

---

## 5. Database Migrations

Write migrations as sequential SQL files. The system uses **PascalCase** quoted table names and **camelCase** quoted column names.

### Migration 001: Core Schema

Create all tables with proper types, foreign keys, CASCADE deletes, and enable RLS.

```sql
-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoicePhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
```

### Migration 002: Storage Buckets

Create the `invoices` storage bucket (public read) for logos, signatures, and photos.

### Migration 003: Security & Scale

1. **NUMERIC types** for all monetary columns (NEVER use FLOAT for money)
2. **Indexes** for high-volume queries (see table definitions above)
3. **Constraints**: tenant_required CHECK, unique invoice number per user
4. **RLS policies** for authenticated users (SELECT/INSERT/UPDATE/DELETE scoped to `auth.uid()`)
5. **Dashboard stats RPC**: `get_dashboard_stats(p_user_id TEXT)` → aggregates server-side
6. **Auto-update trigger**: `update_updated_at_column()` on all tables
7. **Atomic payment creation**: `create_payment_if_unpaid()` with `SELECT ... FOR UPDATE` row locking

### Migration 004: Security Hardening

1. **RPC auth checks**: `auth.role() = 'service_role'` guard on sensitive RPCs
2. **Guest RLS policies**: Guests can manage their own invoices via `guestSessionId` header
3. **Payment RLS**: Users can read their own payment records
4. **Stale payment cleanup**: `expire_stale_payments()` marks hung payments as FAILED after 30 minutes
5. **Public read policy**: Anyone can read invoices by `publicId` (for shared links)

---

## 6. Authentication & Multi-Tenancy

### Auth Provider

- **Google OAuth only** via Supabase Auth
- SSR-compatible using `@supabase/ssr` (cookie-based sessions)
- No email/password auth

### Multi-Tenancy Model

The system supports two types of tenants:

1. **Authenticated users** (`userId`) — mapped from Supabase Auth `auth.uid()` via `"User".externalId`
2. **Guest sessions** (`guestSessionId`) — UUID stored in an `httpOnly` cookie named `invosafi_guest_session` (30-day TTL)

### Tenant Resolution (in `lib/session.ts`)

```
1. Check Supabase auth → if user exists, look up User table by externalId → return { userId }
2. Else → get/create guest session cookie → return { guestSessionId }
```

Every database query MUST include a tenant filter: either `WHERE "userId" = ?` or `WHERE "guestSessionId" = ?`.

### Guest-to-User Migration

When a guest signs up (Google OAuth callback):
1. Exchange auth code for session
2. Find or create `"User"` record (using `externalId = auth.uid()`)
3. Migrate all invoices with matching `guestSessionId` to the new `userId`
4. Delete the guest session cookie

---

## 7. Guest-First Flow

This is the core UX differentiator. The entire flow works without any account:

```
1. User opens invosafi.com
2. InvoiceEditor loads with empty form
3. User fills in from/to details, line items
4. Live preview updates in real-time (Zustand → InvoicePreview)
5. Preview always shows a diagonal watermark: "INVOSAFI — PREVIEW"
6. User clicks "Download PDF"
7. Invoice is saved to API (POST /api/invoices)
8. PaymentModal opens with M-Pesa phone number input
9. User enters phone number → STK Push sent to phone
10. User enters M-Pesa PIN on their phone
11. Client polls /api/invoices/public/[publicId]/status every 2s (exponential backoff)
12. On payment confirmation → clean PDF (no watermark) is generated and downloaded
13. Invoice is marked as paid (isPaid = true)
```

### Important: Payment is for the InvoSafi service fee (KSh 10), NOT for the invoice amount

The M-Pesa STK Push charges a **flat KSh 10** to the document creator for using InvoSafi. This is NOT the invoice amount shown on the document. The document amount is what the creator's client owes them — a separate business concern.

---

## 8. Document Generation & PDF

### PDF Generation Library

Use `@react-pdf/renderer` for server-side PDF generation.

### PDF Template Requirements

The PDF must be **crystal clear, professional, and print-ready**:

1. **Header**: Logo (if provided) + document title + document number
2. **From/To sections**: Business details in clear columns
3. **Date section**: Issue date, due date, payment terms
4. **Line items table**: Clean table with alternating row colors
   - Columns: #, Description, Qty, Rate, Amount
   - Additional details in smaller text below description
5. **Totals section**: Right-aligned
   - Subtotal
   - Discount (if any, with type label)
   - Tax (with rate %)
   - **Total** (bold, prominent)
6. **Notes section**: If provided
7. **Signature**: If provided, display signature image
8. **Footer**: "Generated by InvoSafi" with accent color bar
9. **Currency**: Formatted using `Intl.NumberFormat("en-KE")` with proper symbol

### Watermark Behavior

| State | Watermark | Download Allowed |
|-------|-----------|-----------------|
| Preview (in-app) | YES — diagonal "INVOSAFI — PREVIEW" text | NO |
| Public link (unpaid) | YES — diagonal watermark | NO |
| After payment (isPaid) | NO — clean document | YES |

### PDF API Route

```
GET /api/documents/download/[publicId]
```

1. Look up invoice by `publicId` (admin client — no auth required)
2. If `isPaid === false` → return `402 Payment Required` with `{ error: "Payment required", publicId }`
3. If `isPaid === true` → generate clean PDF → return as `application/pdf` with `Content-Disposition: attachment`
4. Rate limit: 60/min per IP

### Preview PDF (for in-app preview)

The in-app preview is rendered as **HTML** (not PDF) in the `InvoicePreview` component using React and Tailwind. It matches the PDF layout closely. The watermark is a CSS overlay.

---

## 9. Payment System (M-Pesa STK Push)

### Overview

InvoSafi charges **KSh 10 per document** via Safaricom's Daraja API (Lipa Na M-Pesa STK Push).

### Flow

```
Client                          Server                          Safaricom
  │                               │                                │
  │ POST /api/payments/initiate   │                                │
  │ { publicId, phoneNumber }     │                                │
  │──────────────────────────────►│                                │
  │                               │ 1. Validate input (Zod)       │
  │                               │ 2. Look up invoice by publicId │
  │                               │ 3. Verify not already paid     │
  │                               │ 4. Atomically create Payment   │
  │                               │    (RPC: create_payment_if_    │
  │                               │     unpaid with row lock)      │
  │                               │ 5. Initiate STK Push           │
  │                               │───────────────────────────────►│
  │                               │◄───────────────────────────────│
  │                               │ 6. Update Payment → PROCESSING │
  │◄──────────────────────────────│ { checkoutRequestId }          │
  │                               │                                │
  │ [User enters PIN on phone]    │                                │
  │                               │                                │
  │                               │ POST /api/payments/callback    │
  │                               │◄───────────────────────────────│
  │                               │ 7. Verify IP + callback secret │
  │                               │ 8. Parse callback data         │
  │                               │ 9. Verify amount matches       │
  │                               │ 10. Update Payment → COMPLETED │
  │                               │ 11. Mark Invoice isPaid=true   │
  │                               │────────────────────────────────►│ 200 OK
  │                               │                                │
  │ Poll: GET /api/invoices/      │                                │
  │  public/[publicId]/status     │                                │
  │──────────────────────────────►│                                │
  │◄──────────────────────────────│ { isPaid: true }               │
  │                               │                                │
  │ GET /api/documents/download/  │                                │
  │  [publicId]                   │                                │
  │──────────────────────────────►│                                │
  │◄──────────────────────────────│ [PDF file download]            │
```

### M-Pesa Client (`lib/mpesa.ts`)

Configuration:
- `MPESA_ENVIRONMENT`: `"sandbox"` or `"production"`
- Base URLs: `https://sandbox.safaricom.co.ke` or `https://api.safaricom.co.ke`
- Access token cached with 60s refresh buffer
- 15s timeout on all API calls
- 2 retries with exponential backoff for token fetch

Functions:
1. `getAccessToken()` — OAuth client credentials, cached
2. `initiateSTKPush(request)` — sends STK Push, returns `MerchantRequestID` + `CheckoutRequestID`
3. `querySTKPush(checkoutRequestId)` — manual status query (fallback)
4. `parseSTKCallback(data)` — extracts receipt number, amount, phone, etc.
5. `normalizePhoneNumber(phone)` — converts `07XX`, `+254XX`, etc. to `254XXXXXXXXX`

### Payment Amount

The STK Push amount is **always KSh 10** (the InvoSafi platform fee). This is NOT the amount on the invoice. The `AccountReference` should be the invoice number (truncated to 12 chars). The `TransactionDesc` should be `"InvoSafi Doc"` (max 13 chars).

### Atomic Payment Creation

Use a PostgreSQL RPC function `create_payment_if_unpaid()` that:
1. Locks the invoice row with `SELECT ... FOR UPDATE`
2. Checks `isPaid = false`
3. Checks no active (PENDING/PROCESSING) payments exist
4. Creates the payment record atomically
5. Returns the payment or an error object

### Callback Security

1. **IP whitelist** (production only): Only accept from Safaricom IPs
2. **Callback secret**: Token appended as `?token=SECRET` to callback URL
3. **Amount verification**: Confirm paid amount matches expected KSh 10
4. **Idempotency**: Skip if payment already in terminal state (COMPLETED/FAILED/CANCELLED)
5. **Always return 200**: Safaricom retries on non-200 responses

### Polling Strategy (Client-Side)

```typescript
// Poll payment status with exponential backoff
const POLL_INTERVALS = [2000, 2000, 3000, 3000, 5000, 5000, 8000, 10000];
let pollIndex = 0;

function pollStatus() {
  fetch(`/api/invoices/public/${publicId}/status`)
    .then(res => res.json())
    .then(data => {
      if (data.isPaid) {
        // Trigger PDF download
        window.location.href = `/api/documents/download/${publicId}`;
      } else if (pollIndex < POLL_INTERVALS.length) {
        setTimeout(pollStatus, POLL_INTERVALS[pollIndex++]);
      } else {
        // Fall back to manual query
        fetch('/api/payments/query', { method: 'POST', body: JSON.stringify({ checkoutRequestId }) });
      }
    });
}
```

### Stale Payment Cleanup

An RPC function `expire_stale_payments()` marks PENDING/PROCESSING payments older than 30 minutes as FAILED. This should be called periodically (e.g., via Supabase pg_cron or a scheduled Railway job).

---

## 10. API Routes

### `GET /api/health`

Returns `{ status: "ok", timestamp, runtime: "supabase" }`. Use for monitoring.

### `POST /api/invoices` — Create Invoice

- **Auth**: Tenant context (userId or guestSessionId)
- **Rate limit**: 30/min per IP
- **Body**: Validated by `CreateInvoiceSchema` (Zod)
- **Server-side**: Generate invoice number if not provided, calculate totals from items, upload base64 images to Storage
- **Response**: `201` with full `InvoiceWithItems`

### `GET /api/invoices` — List Invoices

- **Auth**: Tenant context required
- **Rate limit**: 120/min per IP
- **Query params**: `limit` (1-100, default 20), `offset`, `orderBy` (createdAt/issueDate/dueDate), `orderDir` (asc/desc)
- **Response**: `{ invoices, total, limit, offset }`
- **Cache**: `private, max-age=10, stale-while-revalidate=30`

### `GET /api/invoices/[id]` — Get Invoice

- **Auth**: Tenant context, ownership verified in query
- **Rate limit**: 120/min per IP
- **Response**: `InvoiceWithItems` or `404`
- **Cache**: `private, max-age=5, stale-while-revalidate=15`

### `PUT /api/invoices/[id]` — Update Invoice

- **Auth**: Tenant context, ownership verified
- **Rate limit**: 120/min per IP
- **Body**: Validated by `UpdateInvoiceSchema` (partial of Create)
- **Features**: Recalculates totals if items or financial params change, replaces line items atomically (delete + insert)

### `DELETE /api/invoices/[id]` — Delete Invoice

- **Auth**: Tenant context, ownership verified
- **Rate limit**: 120/min per IP
- **Response**: `{ success: true }` or `404`
- **Note**: CASCADE deletes line items and photos

### `GET /api/invoices/public/[publicId]` — Public Invoice Read

- **Auth**: None required
- **Rate limit**: 60/min per IP
- **Response**: Sanitized invoice data (excludes sensitive fields like `guestSessionId`)
- **Cache**: `public, max-age=60, stale-while-revalidate=300`

### `GET /api/invoices/public/[publicId]/status` — Payment Status Polling

- **Auth**: None required
- **Rate limit**: 60/min per IP
- **Response**: `{ isPaid, paidAt, payments: [{ status, mpesaReceiptNumber }] }`

### `POST /api/payments/initiate` — Initiate M-Pesa Payment

- **Auth**: None required (public endpoint)
- **Rate limit**: 5/min per IP
- **Body**: `{ publicId, phoneNumber }`
- **Response**: `{ checkoutRequestId, customerMessage, paymentId }`
- **Errors**: 409 if payment in progress, 400 if already paid

### `POST /api/payments/callback` — M-Pesa Callback

- **Auth**: IP whitelist + callback secret
- **Exempt from**: CSRF middleware, session handling
- **Always returns**: `200 { ResultCode: 0, ResultDesc: "Accepted" }`
- **On success**: Updates payment → COMPLETED, marks invoice `isPaid = true`
- **On failure**: Updates payment → FAILED or CANCELLED (code 1032)
- **Amount verification**: Rejects if paid amount ≠ expected KSh 10

### `POST /api/payments/query` — Manual Status Query

- **Auth**: None required
- **Rate limit**: 60/min per IP
- **Body**: `{ checkoutRequestId }`
- **Purpose**: Fallback when callback doesn't arrive. Queries Daraja directly.
- **Race condition handling**: Uses conditional update (`NOT status IN ('COMPLETED','FAILED','CANCELLED')`)

### `GET /api/documents/download/[publicId]` — PDF Download

- **Auth**: None required
- **Rate limit**: 60/min per IP
- **Guard**: Returns `402` if `isPaid = false`
- **Response**: `application/pdf` with `Content-Disposition: attachment; filename="INV-2026-XXX.pdf"`
- **PDF generation**: Server-side via `@react-pdf/renderer`

---

## 11. Client-Side State Management

### Zustand Store (`lib/store/invoiceStore.ts`)

The `useInvoiceStore` hook manages all invoice editor state client-side.

```typescript
type InvoiceData = {
  documentTitle: string;
  documentType: "invoice" | "receipt" | "estimate" | "quote";
  invoiceNumber: string;
  issueDate: string;        // YYYY-MM-DD
  dueDate: string;          // YYYY-MM-DD
  paymentTerms: PaymentTerms;
  from: InvoiceParty;       // { name, email, phone, mobile, fax, address, city, zipCode, businessNumber }
  to: InvoiceParty;
  notes: string;
  taxRate: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  currency: Currency;       // { code, symbol, flag }
  accentColor: string;      // Hex color
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  photoDataUrls: string[];
  items: InvoiceLineItem[]; // { id, description, additionalDetails, quantity, rate }
  isPaid: boolean;
  showCustomTable: boolean;
};
```

### Store Actions

- `setField(path, value)` — Deep-set any field by dot-path (e.g., `"from.name"`)
- `setLogo(dataUrl)` / `setSignature(dataUrl)` — Set image data URLs
- `addPhoto(dataUrl)` / `removePhoto(index)` — Manage photo attachments
- `setCurrency(currency)` — Change currency
- `addItem()` — Add empty line item
- `updateItem(id, field, value)` — Update specific line item field
- `removeItem(id)` — Remove line item by ID
- `setIsPaid(paid)` — Toggle paid status

### Supported Currencies

```typescript
const CURRENCIES = [
  { code: "KES", symbol: "KSh", flag: "🇰🇪" },
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "TZS", symbol: "TSh", flag: "🇹🇿" },
  { code: "UGX", symbol: "USh", flag: "🇺🇬" },
];
```

### Payment Terms

```typescript
const PAYMENT_TERMS_LABELS = {
  due_on_receipt: "Due on Receipt",
  net_7: "Net 7",
  net_15: "Net 15",
  net_30: "Net 30",
  net_60: "Net 60",
  custom: "Custom",
};
```

### Accent Colors

```typescript
const ACCENT_COLORS = [
  "#1f8ea3", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#64748b", "#0f172a",
];
```

---

## 12. UI Components

### Page Layout

| Route | Layout | Auth Required |
|-------|--------|--------------|
| `/` | Full-width, no nav | No |
| `/login`, `/signup` | Centered card with AuthNav | No |
| `/dashboard` | Dashboard layout with UserNav | Yes |

### Component: `InvoiceEditor` (Orchestrator)

The main page component. Renders:
- `InvoiceForm` (left/top on mobile)
- `InvoicePreview` (right/bottom on mobile)
- `OptionsSidebar` (bottom toolbar)
- `PaymentModal` (overlay on payment flow)

Actions:
- "Download PDF" button → saves invoice via API → opens PaymentModal
- "Get Link" button → saves invoice → copies public URL to clipboard
- "New" button → resets store to defaults

### Component: `InvoiceForm`

Editable form with sections:
1. **Document header**: Type selector, number, dates
2. **From section**: Business details (name, email, phone, address, etc.)
3. **To section**: Recipient details
4. **Line items**: Managed by `LineItemsEditor`
5. **Notes/Terms**: Textarea
6. **Signature**: Upload or draw
7. **Photos**: Multi-image upload

Each field updates the Zustand store via `setField()`.

### Component: `InvoicePreview`

Read-only live preview that mirrors the final PDF layout:
- Renders using the same data from Zustand store
- Shows diagonal watermark overlay when `!isPaid`: "INVOSAFI — PREVIEW"
- Accent color used for header bar, borders, and highlights
- Currency formatting uses `Intl.NumberFormat("en-KE")`
- Totals calculated using shared `calculateInvoiceTotals()` function

### Component: `LineItemsEditor`

Table with:
- Row per line item: Description, Additional Details, Qty, Rate, Amount (calculated)
- "Add row" button
- Delete button per row
- Auto-generates unique ID per row via `Math.random().toString(36).slice(2, 10)`

### Component: `OptionsSidebar`

Bottom toolbar/panel with:
- **Accent color picker** — grid of color swatches
- **Document type selector** — Invoice/Receipt/Estimate/Quote
- **Currency selector** — dropdown with flag emojis
- **Tax rate** — number input (0-100%)
- **Discount** — type (percentage/fixed) + value input
- **Send** — placeholder (email preview — future feature)
- **Customize** — placeholder (template customization — future feature)

### Component: `PaymentModal`

Modal overlay for the M-Pesa payment flow:

States:
1. **Input**: Phone number field with format hint (07XXXXXXXX)
2. **Processing**: "Check your phone for the M-Pesa prompt..." with spinner
3. **Success**: "Payment confirmed! Downloading your document..." → auto-trigger download
4. **Error**: Error message with "Try Again" button

### Component: `AuthNav`

Simple navigation for auth pages (login/signup):
- Logo/brand link
- "Sign In" / "Sign Up" links

### Component: `UserNav`

Dashboard user menu:
- User avatar (from Google)
- User name
- Dropdown: Dashboard, Create New, Sign Out

---

## 13. Security Architecture

### Layer 1: CSRF Protection (`middleware.ts`)

- Validate `Origin` header on all mutating requests (POST/PUT/DELETE)
- Exempt: M-Pesa callback path (`/api/payments/callback`)
- Block requests with mismatched or missing Origin in production
- Allow all origins in development (for curl/Postman)

### Layer 2: Row-Level Security (Supabase RLS)

All tables have RLS enabled. Policies:

**Invoice:**
- Users can SELECT/INSERT/UPDATE/DELETE where `userId` matches their `externalId`
- Guests can SELECT/UPDATE/DELETE where `guestSessionId` matches header
- Anyone can SELECT by `publicId` (for shared links)

**LineItem:**
- Users can manage line items for their own invoices
- Public SELECT for accessible invoices (needed for public links)

**Payment:**
- Users can read their own payment records
- All writes via admin client (service role)

### Layer 3: Security Headers (`next.config.mjs`)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.safaricom.co.ke https://sandbox.safaricom.co.ke;
  frame-ancestors 'none';
```

### Layer 4: Input Validation (Zod)

Every API route validates input with Zod schemas **before** any database operation:
- String length limits (prevent storage abuse)
- Image data URLs capped at ~500KB
- Numeric ranges enforced
- Enum validation for document types, payment terms, discount types
- Phone number regex validation

### Layer 5: Rate Limiting

See [Section 14](#14-rate-limiting).

### Layer 6: M-Pesa Callback Security

- Safaricom IP whitelist (production)
- Callback secret token verification
- Amount mismatch detection
- Idempotent processing (terminal state check)

### Layer 7: Open Redirect Prevention

Auth callback validates `next` parameter:
- Must start with `/`
- Must not start with `//` (protocol-relative)
- Must not contain `://` (absolute URL)
- Falls back to `/dashboard`

### Layer 8: Monetary Precision

- All money columns use `NUMERIC(15,2)` — never FLOAT
- Server-side totals calculation only — never trust client
- Amount verification in M-Pesa callback

### Layer 9: Session Security

- Guest session cookie: `httpOnly`, `secure` (production), `sameSite: lax`, 30-day TTL
- Supabase session: Cookie-based, refreshed via middleware
- Admin client: Singleton, service role key, no cookies

---

## 14. Rate Limiting

### Architecture

Dual-mode rate limiter:
1. **Upstash Redis** (production): Sliding window counter, distributed across instances
2. **In-memory token bucket** (development/single-instance): With GC, stale eviction, and 10K bucket cap

### Pre-configured Limiters

| Limiter | Max Requests | Window | Use Case |
|---------|-------------|--------|----------|
| `paymentLimiter` | 5/min | 60s | Payment initiation |
| `invoiceCreateLimiter` | 30/min | 60s | Invoice creation |
| `publicReadLimiter` | 60/min | 60s | Public endpoints, status polling |
| `privateCrudLimiter` | 120/min | 60s | Authenticated CRUD |

### Client IP Extraction

Use the **rightmost** IP from `X-Forwarded-For` header (proxy-appended, not user-controlled) to prevent IP spoofing. Fallback to `X-Real-IP` then `"unknown"`.

### Fail-Open Strategy

If Redis is unavailable, allow the request (better UX than blocking legitimate users).

---

## 15. File Storage

### Supabase Storage Bucket

- **Bucket name**: `invoices`
- **Access**: Public read (logos/signatures are displayed in public invoice views)
- **Subfolders**: `logos/`, `signatures/`, `photos/`

### Upload Flow

1. Client sends base64 data URL in the invoice body (e.g., `logoDataUrl: "data:image/png;base64,..."`)
2. Server validates format + size (~500KB max)
3. Server uploads to Supabase Storage → gets public URL
4. URL stored in database (NOT the base64)

### Supported Formats

PNG, JPEG, GIF, WebP, SVG

### Security

- Reject `http://` URLs (SSRF prevention)
- Accept only `data:image/*` and `https://` URLs
- Max 500KB per image (700K chars base64)
- Immutable uploads (`upsert: false`) with 1-year cache headers

---

## 16. Scalability (50K docs/month)

### Database

1. **Indexes** on all high-frequency query paths (see migration 003)
2. **Server-side aggregation**: Dashboard stats via `get_dashboard_stats()` RPC — no row fetching
3. **Pagination**: All list queries support `limit`/`offset` with `count: "exact"`
4. **Single-query joins**: Invoice + LineItem fetched in one query using Supabase nested select
5. **NUMERIC(15,2)** for money columns — precise at scale

### Caching

- Public invoices: `max-age=60, stale-while-revalidate=300`
- Private invoices: `max-age=5, stale-while-revalidate=15`
- Invoice lists: `max-age=10, stale-while-revalidate=30`

### Rate Limiting (DDoS Protection)

- In-memory: 10K bucket cap with LRU eviction
- Redis: Sliding window per-IP, fail-open

### Container

- Node.js heap: 448MB max (`--max-old-space-size=448`)
- Standalone output: ~30MB image (not 200MB)
- Non-root user in Docker

### Payment Concurrency

- PostgreSQL row-level locking prevents double payments
- Conditional updates prevent callback/query race conditions
- Stale payment cleanup prevents payment records blocking future attempts

### Estimated Capacity (single Railway instance)

| Metric | Capacity |
|--------|----------|
| Document generations | 50,000+/month |
| Concurrent users | ~500 |
| Database rows (Invoice) | 600K+/year |
| Storage | ~50GB/year (logos, signatures) |
| M-Pesa transactions | 50K+/month |

---

## 17. Design System

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `ink` | `#0f1a24` | Primary text, dark backgrounds |
| `mist` | `#e7edf4` | Light backgrounds, borders |
| `ember` | `#f2672e` | CTA buttons, highlights |
| `lagoon` | `#1f8ea3` | Primary brand, links, accents |

### Typography

| Token | Font | Usage |
|-------|------|-------|
| `font-body` | Space Grotesk | Body text, UI |
| `font-display` | Fraunces | Headings, brand text |

Load via `next/font/google` with `display: "swap"` for performance.

### Animations

```css
/* Float animation for hero elements */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

/* Fade-up animation for page transitions */
@keyframes fadeUp {
  0% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

### Box Shadow

```css
.shadow-soft { box-shadow: 0 20px 60px rgba(8, 17, 27, 0.2); }
```

---

## 18. Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |

### Required (when M-Pesa enabled)

| Variable | Description |
|----------|-------------|
| `MPESA_ENVIRONMENT` | `"sandbox"` or `"production"` |
| `MPESA_CONSUMER_KEY` | Daraja app consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja app consumer secret |
| `MPESA_PASSKEY` | Lipa Na M-Pesa passkey |
| `MPESA_SHORTCODE` | Business shortcode (paybill) |

### Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public app URL (for CSRF, callbacks) | Inferred from request |
| `MPESA_CALLBACK_URL` | Override callback URL for Daraja | `{APP_URL}/api/payments/callback` |
| `MPESA_CALLBACK_SECRET` | Secret token for callback verification | None |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for rate limiting | In-memory fallback |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | In-memory fallback |

### Validation

Use `lib/env.ts` with a `validateEnv()` function called in `instrumentation.ts` to fail fast on missing variables at startup.

---

## 19. Deployment (Railway + Docker)

### Docker (Multi-Stage Build)

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=448 --enable-source-maps"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### Railway Config (`railway.json`)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### `next.config.mjs` — Key Settings

```javascript
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Security headers (see Section 13)
  async headers() { ... },
};
```

---

## 20. Testing Strategy

### Manual Testing Checklist

1. **Guest flow**: Create invoice without account → preview → pay → download
2. **Auth flow**: Sign up with Google → verify guest invoices migrated → dashboard shows stats
3. **Payment flow**: Initiate STK Push → enter PIN → verify callback → download PDF
4. **Edge cases**: Double payment prevention, stale payment expiry, amount mismatch
5. **Rate limiting**: Hit endpoints rapidly → verify 429 responses
6. **Security**: Test CSRF with mismatched origin, test public link access
7. **Mobile**: Test entire flow on mobile browser (responsive design)
8. **PDF quality**: Verify PDF is clear, professional, correctly formatted at all document sizes

### API Testing (curl examples)

```bash
# Health check
curl http://localhost:3000/api/health

# Create invoice (guest)
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{"fromName":"Acme Ltd","toName":"Client Corp","items":[{"description":"Web Dev","quantity":1,"rate":50000}]}'

# Initiate payment
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{"publicId":"<PUBLIC_ID>","phoneNumber":"0712345678"}'

# Check payment status
curl http://localhost:3000/api/invoices/public/<PUBLIC_ID>/status
```

---

## Implementation Order

Build the system in this order for the smoothest development experience:

1. **Project scaffold**: `npx create-next-app@14 invosafi --typescript --tailwind --app --src-dir=false`
2. **Install deps**: `@supabase/ssr @supabase/supabase-js zustand zod @paralleldrive/cuid2 uuid @react-pdf/renderer`
3. **Supabase setup**: Create project, run migrations, configure auth (Google OAuth)
4. **Design system**: Tailwind config, fonts, globals.css
5. **Supabase clients**: `lib/supabase/client.ts`, `server.ts`, `admin.ts`, `middleware.ts`
6. **DB types + DAL**: `lib/db/types.ts`, `lib/db/supabase-db.ts`, `lib/db/payments.ts`
7. **Utilities**: `lib/utils/totals.ts`, `lib/utils/format.ts`, `lib/storage.ts`, `lib/env.ts`
8. **Session + tenant**: `lib/session.ts`
9. **Validation**: `lib/validators.ts`
10. **Rate limiting**: `lib/rate-limit.ts`
11. **M-Pesa client**: `lib/mpesa.ts`
12. **Middleware**: `middleware.ts` (CSRF + session refresh)
13. **API routes**: health → invoices CRUD → public read → status polling → payments
14. **PDF generation**: `lib/pdf.tsx` + `api/documents/download/[publicId]/route.ts`
15. **Zustand store**: `lib/store/invoiceStore.ts`
16. **UI components**: InvoiceEditor → InvoiceForm → InvoicePreview → LineItemsEditor → OptionsSidebar → PaymentModal
17. **Pages**: Home (`/`), Auth (login/signup + callback), Dashboard
18. **Docker + Railway**: Dockerfile, railway.json, next.config.mjs standalone
19. **Security audit**: Test all security layers
20. **Polish**: Error boundaries, loading states, mobile responsiveness

---

## Key Differences from Riciti (Reference Project)

| Aspect | Riciti | InvoSafi |
|--------|--------|---------|
| Name | `riciti` | `invosafi` |
| Guest cookie | `riciti_guest_session` | `invosafi_guest_session` |
| Payment amount | Invoice total (dynamic) | KSh 10 flat fee |
| Payment purpose | Pay the invoice | Pay for document download |
| PDF generation | Not implemented (TODO) | Core feature — must implement |
| Download flow | Opens PaymentModal | Pay KSh 10 → download clean PDF |
| Shareable links | TODO | Implemented — public view with watermark |
| Scale target | 15K docs/month | 50K docs/month |
| Send email | Placeholder | Placeholder (future) |
| Node.js heap | 448MB | 448MB (increase if needed for PDF rendering) |

---

## Important Implementation Notes

1. **The KSh 10 is always charged to the document CREATOR, not the invoice recipient.** The person building the invoice/receipt pays KSh 10 to download the clean PDF. The invoice amount on the document is a separate business concern.

2. **Never store base64 images in the database.** Always upload to Supabase Storage and store the URL.

3. **Never trust client-provided totals.** Always recalculate `subtotal`, `taxAmount`, `discountAmount`, `total` from line items on the server.

4. **Always quote table names in SQL** because they use PascalCase: `"Invoice"`, `"User"`, etc.

5. **The M-Pesa callback ALWAYS returns 200** to Safaricom, even on errors. Non-200 causes retries.

6. **Use admin client (service role)** for: public invoice reads, payment operations, guest-to-user migration, dashboard stats RPC.

7. **Use user client (anon key)** for: authenticated CRUD operations where RLS applies.

8. **PDF clarity is top priority.** Use clean fonts, proper spacing, high-contrast text, and aligned columns. Test at both screen and print resolutions.

9. **Watermark must be visually prominent but not obscure content.** Use diagonal text at ~30° rotation, light gray with partial opacity.

10. **Phone number normalization** must handle all Kenyan formats: `07XX`, `01XX`, `+254XX`, `254XX`, `7XX`, `1XX`.

---

## 21. Gaps & Hardening (Production-Readiness Audit)

> The following items are **missing from the base spec** and MUST be implemented for a platform that reliably handles 50K+ documents/month without breaking.

---

### 21.1 PDF Generation Is a CPU/Memory Bomb

**Problem**: `@react-pdf/renderer` runs in-process. Each PDF render consumes ~20-80MB of memory and blocks the event loop for 200-2000ms. At peak load (burst of 50+ concurrent downloads), this will OOM the container or starve other requests.

**Fixes required:**

1. **PDF Caching** — Generate the PDF **once** on first download, upload to Supabase Storage (`pdfs/{publicId}.pdf`), and serve the cached file on subsequent requests. Add a `pdfUrl` column to `"Invoice"` (nullable TEXT). The download route checks `pdfUrl` first before regenerating.

2. **Request-level timeout** — Wrap PDF generation in a 30-second `AbortSignal.timeout()`. Return `503` if it times out.

3. **Concurrency gate** — Use a semaphore (in-memory counter) to limit concurrent PDF renders to 3-5 at a time. Queue additional requests with a 10-second wait before returning `503 Service Unavailable`.

4. **Increase Node.js heap for PDF workloads** — Bump `--max-old-space-size` to `512` or `640` (not 448).

5. **Cache invalidation** — If the user updates an invoice after paying (shouldn't happen in normal flow, but defensive), clear `pdfUrl` on invoice UPDATE.

```typescript
// Pseudocode for download route with caching
async function GET(request, { params }) {
  const invoice = await getInvoiceByPublicId(publicId);
  if (!invoice.isPaid) return Response.json({ error: "Payment required" }, { status: 402 });

  // 1. Serve cached PDF if available
  if (invoice.pdfUrl) {
    return Response.redirect(invoice.pdfUrl, 302);
  }

  // 2. Concurrency gate
  if (activePdfRenders >= MAX_CONCURRENT_PDF) {
    return Response.json({ error: "Server busy, retry shortly" }, { status: 503 });
  }

  // 3. Generate + cache
  activePdfRenders++;
  try {
    const pdfBuffer = await renderPdf(invoice); // @react-pdf/renderer
    const url = await uploadPdf(publicId, pdfBuffer); // Supabase Storage
    await updateInvoicePdfUrl(invoice.id, url); // Store URL
    return new Response(pdfBuffer, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"` }
    });
  } finally {
    activePdfRenders--;
  }
}
```

---

### 21.2 No Observability / Monitoring

**Problem**: At 50K docs/month, you're blind to failures without observability. `console.log` gets lost in Railway's log stream. You won't know about payment failures, PDF crashes, or database connection exhaustion until users complain.

**Fixes required:**

1. **Structured logging** — Add a `lib/logger.ts` module that outputs JSON logs with `level`, `timestamp`, `requestId`, `action`, `duration`, `error`. Use `crypto.randomUUID()` per request for tracing.

```typescript
// lib/logger.ts
export function log(level: "info" | "warn" | "error", action: string, meta?: Record<string, unknown>) {
  const entry = { level, action, timestamp: new Date().toISOString(), ...meta };
  console[level === "error" ? "error" : "log"](JSON.stringify(entry));
}
```

2. **Error tracking** — Integrate Sentry (`@sentry/nextjs`). Free tier supports 5K events/month. Critical for catching PDF rendering crashes, M-Pesa callback failures, and database errors.

3. **Health check enhancement** — Expand `/api/health` to verify:
   - Supabase DB connectivity (simple `SELECT 1`)
   - Supabase Storage accessibility
   - M-Pesa token freshness (is cached token still valid?)
   - Memory usage (`process.memoryUsage()`)
   - Uptime

4. **Key metrics to log** (structured, on every request):
   - PDF generation time (ms)
   - Payment initiation success/failure rate
   - Callback processing time
   - Database query duration for slow paths
   - Rate limit hits (429 count)

5. **Environment variable**: `SENTRY_DSN` (optional, recommended for production)

---

### 21.3 No Data Retention / Cleanup Strategy

**Problem**: At 50K docs/month = 600K invoices/year + 600K×3 line items + 50K payment records + 100K+ storage files. Without cleanup, the database bloats, Storage costs increase, and query performance degrades.

**Fixes required:**

1. **Guest invoice TTL** — Add a scheduled job (Supabase pg_cron or Railway cron) that deletes unpaid guest invoices older than 90 days:

```sql
-- Run weekly via pg_cron
DELETE FROM "Invoice"
WHERE "guestSessionId" IS NOT NULL
  AND "userId" IS NULL
  AND "isPaid" = false
  AND "createdAt" < NOW() - INTERVAL '90 days';
```

2. **Storage garbage collection** — When an invoice is deleted (CASCADE), queue a cleanup job that removes associated Storage files (logos, signatures, PDFs). Implement via a `AFTER DELETE` trigger that inserts into a `"StorageCleanupQueue"` table, processed by a cron job.

3. **Payment record archival** — Payments older than 2 years can be moved to a `"PaymentArchive"` table or exported to cold storage.

4. **Database VACUUM** — Ensure Supabase auto-vacuum is configured (it is by default, but verify `autovacuum_naptime` and `autovacuum_vacuum_threshold` are reasonable for 600K+ row tables).

5. **Add `"Invoice".pdfUrl`** — TEXT column (nullable) for cached PDF Storage URL.

6. **Add index on `"Invoice".createdAt`** — For efficient time-range cleanup queries:

```sql
CREATE INDEX IF NOT EXISTS idx_invoice_guest_cleanup
  ON "Invoice"("guestSessionId", "isPaid", "createdAt")
  WHERE "guestSessionId" IS NOT NULL AND "isPaid" = false;
```

---

### 21.4 Payment Reconciliation Job

**Problem**: The current `expire_stale_payments()` blindly marks old PROCESSING payments as FAILED. But some may have actually been paid — the callback just didn't arrive (network issue, server restart, etc.). At 50K payments/month, even a 0.1% callback failure rate = 50 lost payments/month. Users paid KSh 10 but can't download their document.

**Fix required:**

Add a **reconciliation RPC** that:
1. Finds all PROCESSING payments older than 5 minutes
2. For each, calls Daraja `querySTKPush()` to get the actual status
3. Updates the payment record based on the Daraja response
4. Only marks as FAILED if Daraja confirms failure (or after 30 minutes with no response)

```sql
-- New migration: reconciliation support
CREATE OR REPLACE FUNCTION get_stale_processing_payments()
RETURNS TABLE(id TEXT, "checkoutRequestId" TEXT, "invoiceId" TEXT, amount NUMERIC)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, "checkoutRequestId", "invoiceId", amount
  FROM "Payment"
  WHERE status = 'PROCESSING'
    AND "checkoutRequestId" IS NOT NULL
    AND "createdAt" < NOW() - INTERVAL '5 minutes'
    AND "createdAt" > NOW() - INTERVAL '30 minutes'
  LIMIT 50;
$$;
```

Add an API route or scheduled job:
```
POST /api/payments/reconcile (protected by admin secret or cron token)
```

This route fetches stale payments, queries Daraja for each, and updates accordingly. Run every 5 minutes via Railway cron or Supabase pg_cron calling an Edge Function.

---

### 21.5 Request Body Size Limits

**Problem**: An invoice body with logo (500KB) + signature (500KB) + 5 photos (500KB each) = 3.5MB+ of base64. The default Next.js body parser limit is 1MB. Requests will silently fail with `413 Payload Too Large`.

**Fix required:**

In the API route files that accept images, configure the body size limit:

```typescript
// app/api/invoices/route.ts
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};
```

Or in `next.config.mjs` for App Router (Next.js 14+):

```javascript
experimental: {
  serverActions: {
    bodySizeLimit: '4mb',
  },
},
```

Also add a **total body size check** in the validator:

```typescript
// In the API route, before Zod validation:
const rawBody = await request.text();
if (rawBody.length > 4 * 1024 * 1024) {
  return NextResponse.json({ error: "Request too large (max 4MB)" }, { status: 413 });
}
const body = JSON.parse(rawBody);
```

---

### 21.6 Redis Is REQUIRED for Production (Not Optional)

**Problem**: The spec says Upstash Redis is "optional." At 50K docs/month, in-memory rate limiting breaks if you ever need 2+ instances (horizontal scaling). It also resets on every deploy/restart, making it useless against sustained attacks.

**Fix**: Make Upstash Redis **required** for production. Update the env validation to WARN if Redis is not configured and `NODE_ENV=production`.

```typescript
// lib/env.ts — add to recommended vars check
if (process.env.NODE_ENV === "production" && !process.env.UPSTASH_REDIS_REST_URL) {
  warnings.push("UPSTASH_REDIS_REST_URL not set — rate limiting will use in-memory fallback (NOT suitable for multi-instance production)");
}
```

---

### 21.7 CDN / WAF Layer (Cloudflare)

**Problem**: Railway exposes your container directly to the internet. At 50K docs/month, you're a target for DDoS, scraping, and bot abuse. Rate limiting alone isn't enough.

**Fix required:**

1. **Cloudflare proxy** (free tier) in front of Railway:
   - DDoS protection (automatic L3/L4)
   - WAF rules (block known bad bots, SQL injection patterns)
   - Edge caching for static assets (`_next/static/*`, images)
   - Bot management (challenge suspicious traffic)
   - Geo-blocking (optional: restrict to Kenya + East Africa if market is local)

2. **Configuration**:
   - Point DNS to Cloudflare
   - Set `NEXT_PUBLIC_APP_URL` to the Cloudflare domain
   - Add Cloudflare's IP ranges to `X-Forwarded-For` trust list
   - **Important**: Update `getClientIP()` to handle Cloudflare's `CF-Connecting-IP` header:

```typescript
export function getClientIP(request: Request): string {
  // Cloudflare provides the real client IP
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Fallback: rightmost X-Forwarded-For
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map(s => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}
```

3. **Environment variable**: `CLOUDFLARE_ENABLED=true` (to enable `CF-Connecting-IP` trust)

---

### 21.8 Graceful Shutdown

**Problem**: Railway sends `SIGTERM` before killing the container. If a PDF is being rendered or an M-Pesa callback is being processed, the request is dropped. At 50K/month, this happens on every deploy.

**Fix**:

Add a shutdown handler in `instrumentation.ts`:

```typescript
let isShuttingDown = false;

export function isServerShuttingDown() { return isShuttingDown; }

if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    isShuttingDown = true;
    console.log("[Shutdown] SIGTERM received, draining requests...");
    // Give in-flight requests 10 seconds to complete
    setTimeout(() => {
      console.log("[Shutdown] Forcing exit");
      process.exit(0);
    }, 10_000);
  });
}
```

In the middleware, reject new requests during shutdown:

```typescript
if (isServerShuttingDown() && !request.nextUrl.pathname.startsWith("/api/payments/callback")) {
  return NextResponse.json({ error: "Server is shutting down" }, { status: 503 });
}
```

**Never** reject M-Pesa callbacks during shutdown — they must always return 200.

---

### 21.9 Cursor-Based Pagination

**Problem**: The spec uses `offset` pagination with `count: "exact"`. At 600K+ invoices, `SELECT count(*)` is slow (full table scan) and `OFFSET 10000` is also slow (skips 10K rows). Dashboard will degrade.

**Fix**: For the dashboard invoice list, switch to **cursor-based pagination** using `createdAt` + `id`:

```typescript
// GET /api/invoices?cursor=2026-02-15T10:00:00Z_clxyz123&limit=20
const cursor = searchParams.get("cursor"); // ISO date + _ + id
if (cursor) {
  const [cursorDate, cursorId] = cursor.split("_");
  query = query.or(`createdAt.lt.${cursorDate},and(createdAt.eq.${cursorDate},id.lt.${cursorId})`);
}

// Return nextCursor in response
const lastInvoice = invoices[invoices.length - 1];
const nextCursor = lastInvoice ? `${lastInvoice.createdAt}_${lastInvoice.id}` : null;
```

Keep `offset` pagination as a fallback for dashboard (where total count is shown via the RPC stats), but use cursor for infinite scroll / "load more" patterns.

---

### 21.10 Guest Session Abuse Prevention

**Problem**: Anyone can generate unlimited guest sessions (new incognito window = new UUID cookie). A malicious actor can create 100K empty invoices, filling the database and Storage. There's no cost barrier until download.

**Fixes required:**

1. **IP-based guest invoice cap** — Max 20 unpaid invoices per IP per day. Track in rate limiter:

```typescript
export const guestInvoiceLimiter = createRateLimiter({
  maxTokens: 20,
  refillRate: 20,
  refillInterval: 86_400_000, // 24 hours
});
```

2. **Guest session cap** — Max 50 invoices per guest session. Check count before creating:

```typescript
// In POST /api/invoices
if (ctx.guestSessionId) {
  const { total } = await listInvoices(ctx, { limit: 1 });
  if (total >= 50) {
    return NextResponse.json({ error: "Guest invoice limit reached. Please sign in." }, { status: 403 });
  }
}
```

3. **Honeypot / invisible field** — Add a hidden field in the form. If it's filled, reject silently (bot detection).

---

### 21.11 Supabase Plan & Connection Limits

**Problem**: Not specifying the required Supabase plan. The free tier has 500MB DB, 1GB Storage, 50K auth users, and limited connections. At 50K docs/month, you'll hit these limits within weeks.

**Requirements for 50K docs/month:**

| Resource | Free Tier | Needed | Supabase Plan |
|----------|-----------|--------|---------------|
| Database size | 500MB | ~5GB/year | Pro ($25/mo) |
| Storage | 1GB | ~50GB/year | Pro ($25/mo) |
| DB connections | 60 | 100+ | Pro (uses Supavisor pooling) |
| Auth users | 50K MAU | Unlimited | Pro |
| Edge Functions | 500K/month | — | Pro |
| Bandwidth | 5GB | ~100GB/month | Pro |

**Minimum**: Supabase **Pro plan** ($25/month).

Add to the spec's environment/deployment section:
- Required Supabase plan: **Pro** ($25/month minimum)
- Enable **Supavisor** connection pooling (Transaction mode) for API routes
- Monitor connection usage via Supabase dashboard

---

### 21.12 Missing: Admin / Revenue Dashboard

**Problem**: At KSh 500K+/month revenue (50K × KSh 10), you have no visibility into platform revenue, failed payments, or user growth.

**Fix**: Add a protected `/admin` route (or reuse Supabase dashboard + SQL queries):

1. **Admin RPC**:
```sql
CREATE OR REPLACE FUNCTION get_platform_stats(p_admin_secret TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_admin_secret != current_setting('app.admin_secret', true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN json_build_object(
    'total_invoices', (SELECT COUNT(*) FROM "Invoice"),
    'paid_invoices', (SELECT COUNT(*) FROM "Invoice" WHERE "isPaid" = true),
    'total_revenue', (SELECT COUNT(*) * 10 FROM "Payment" WHERE status = 'COMPLETED'),
    'failed_payments', (SELECT COUNT(*) FROM "Payment" WHERE status = 'FAILED'),
    'active_users', (SELECT COUNT(*) FROM "User"),
    'invoices_today', (SELECT COUNT(*) FROM "Invoice" WHERE "createdAt" > CURRENT_DATE),
    'payments_today', (SELECT COUNT(*) FROM "Payment" WHERE status = 'COMPLETED' AND "createdAt" > CURRENT_DATE)
  );
END;
$$;
```

2. **Admin secret** env var: `ADMIN_SECRET` — used to protect admin endpoints.

---

### 21.13 Missing: Legal Pages

**Problem**: A payment platform in Kenya requires legal compliance. Without these, M-Pesa/Safaricom can suspend your shortcode.

**Required pages:**

1. `/terms` — Terms of Service (KSh 10 per download, no refunds for digital goods, content ownership)
2. `/privacy` — Privacy Policy (data collected: email, phone for M-Pesa, business info on invoices; data retention; no sale to third parties)
3. `/refund` — Refund Policy (digital goods, but handle failed-but-charged edge cases)

Add these as static pages in `app/(legal)/terms/page.tsx`, `app/(legal)/privacy/page.tsx`, `app/(legal)/refund/page.tsx`.

Link from the footer of every page.

---

### 21.14 Missing: SEO & Marketing Landing Page

**Problem**: The home page is directly the InvoiceEditor. No search engine can understand what the product does. No social preview (Open Graph tags).

**Fixes:**

1. **Rich metadata** in `layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: "InvoSafi — Invoice & Receipt Generator for Kenya",
  description: "Create professional invoices, receipts, and quotes instantly. No signup required. Pay KSh 10 via M-Pesa to download. Built for Kenyan businesses.",
  openGraph: {
    title: "InvoSafi — Invoice & Receipt Generator",
    description: "Create and download professional business documents instantly via M-Pesa.",
    url: "https://invosafi.com",
    siteName: "InvoSafi",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "InvoSafi — Invoice Generator for Kenya",
    description: "Professional invoices in seconds. Pay KSh 10 via M-Pesa.",
  },
};
```

2. **`robots.txt`** and **`sitemap.xml`** — via `app/robots.ts` and `app/sitemap.ts` (Next.js file conventions).

3. **Open Graph image** — Design a branded `public/og-image.png` (1200×630).

4. **Favicon set** — `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` in `app/`.

---

### 21.15 Missing: PWA Manifest & Offline Basics

**Problem**: Kenyan users often have unreliable internet. No service worker or PWA manifest means no installability and no offline fallback.

**Fix**: Add `app/manifest.ts`:

```typescript
export default function manifest() {
  return {
    name: "InvoSafi",
    short_name: "InvoSafi",
    description: "Invoice & Receipt Generator",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1f8ea3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

Not a full offline experience, but enables "Add to Home Screen" on Android (very common in Kenya).

---

### 21.16 Database Migration: Additional Table & Column Changes

Based on all gaps above, add a **Migration 005**:

```sql
-- Migration 005: Production hardening

-- 1. PDF cache URL column
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;

-- 2. Index for guest cleanup queries
CREATE INDEX IF NOT EXISTS idx_invoice_guest_cleanup
  ON "Invoice"("guestSessionId", "isPaid", "createdAt")
  WHERE "guestSessionId" IS NOT NULL AND "isPaid" = false;

-- 3. Index for public invoice lookup (ensure unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_public_id
  ON "Invoice"("publicId");

-- 4. Index on Invoice.createdAt for time-range queries
CREATE INDEX IF NOT EXISTS idx_invoice_created_at
  ON "Invoice"("createdAt" DESC);

-- 5. Reconciliation helper function
CREATE OR REPLACE FUNCTION get_stale_processing_payments()
RETURNS TABLE(id TEXT, "checkoutRequestId" TEXT, "invoiceId" TEXT, amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT p.id, p."checkoutRequestId", p."invoiceId", p.amount
  FROM "Payment" p
  WHERE p.status = 'PROCESSING'
    AND p."checkoutRequestId" IS NOT NULL
    AND p."createdAt" < NOW() - INTERVAL '5 minutes'
    AND p."createdAt" > NOW() - INTERVAL '30 minutes'
  LIMIT 50;
END;
$$;

-- 6. Guest cleanup function (run via pg_cron weekly)
CREATE OR REPLACE FUNCTION cleanup_stale_guest_invoices()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM "Invoice"
  WHERE "guestSessionId" IS NOT NULL
    AND "userId" IS NULL
    AND "isPaid" = false
    AND "createdAt" < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 7. Partial index for payment reconciliation
CREATE INDEX IF NOT EXISTS idx_payment_processing_stale
  ON "Payment"("createdAt")
  WHERE status = 'PROCESSING' AND "checkoutRequestId" IS NOT NULL;
```

---

### 21.17 Summary: Gap Severity Matrix

| # | Gap | Severity | Impact if Ignored |
|---|-----|----------|-------------------|
| 21.1 | PDF generation unbounded | **CRITICAL** | OOM crashes, request timeouts at peak load |
| 21.2 | No observability | **CRITICAL** | Blind to failures, can't debug production issues |
| 21.3 | No data cleanup | **HIGH** | DB bloat, degrading query performance over months |
| 21.4 | No payment reconciliation | **CRITICAL** | Lost payments = users paid but can't download |
| 21.5 | No body size limits | **HIGH** | 413 errors on image uploads, or memory exhaustion |
| 21.6 | Redis optional in prod | **HIGH** | Rate limiting useless on deploy/restart/multi-instance |
| 21.7 | No CDN/WAF | **HIGH** | Vulnerable to DDoS, no edge caching |
| 21.8 | No graceful shutdown | **MEDIUM** | Dropped requests on every deploy |
| 21.9 | Offset pagination at scale | **MEDIUM** | Slow dashboard after 100K+ invoices |
| 21.10 | Guest abuse prevention | **HIGH** | Database spammed with garbage invoices |
| 21.11 | Supabase plan not specified | **CRITICAL** | Hits free tier limits within days |
| 21.12 | No admin dashboard | **MEDIUM** | No revenue/health visibility |
| 21.13 | No legal pages | **HIGH** | M-Pesa shortcode suspension risk |
| 21.14 | No SEO/OG metadata | **LOW** | Invisible to search engines |
| 21.15 | No PWA manifest | **LOW** | Not installable on Android |
| 21.16 | Missing DB indexes/columns | **HIGH** | Slow queries, no PDF caching |
