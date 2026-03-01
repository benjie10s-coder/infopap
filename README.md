# Invopap

Invopap is a pay-per-document platform that lets anyone — with or without an account — create professional invoices, receipts, cash sales, delivery notes, purchase orders, and quotations, then download a watermark-free PDF for **KSh 10** via M-Pesa STK Push.

## Features

- **Six document types**: Invoice, Receipt, Cash Sale, Delivery Note, Purchase Order, Quotation
- **Guest mode**: create documents without signing up; session stored in a cookie
- **Google OAuth**: sign in to save and manage all your documents
- **M-Pesa STK Push** (Daraja API) — pay KSh 10 per PDF download
- **Email sharing** via Resend — send documents directly to recipients
- **PDF generation** with `@react-pdf/renderer`, concurrency-controlled and cached in Supabase Storage
- **Rate limiting** via Upstash Redis (in-memory fallback for local dev)
- **Error monitoring** via Sentry
- Deployable on [Railway](https://railway.app) with the included `Dockerfile` and `railway.json`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth — Google OAuth only |
| Storage | Supabase Storage |
| Payments | Safaricom Daraja v2 (M-Pesa STK Push) |
| Email | Resend |
| Rate Limiting | Upstash Redis |
| PDF | @react-pdf/renderer |
| Monitoring | Sentry |
| Deployment | Railway (Docker) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- (Optional) A [Safaricom Daraja](https://developer.safaricom.co.ke) app for M-Pesa
- (Optional) A [Resend](https://resend.com) account for email

### Local Development

1. **Clone and install**
   ```bash
   git clone https://github.com/benjie10s-coder/infopap
   cd infopap
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```
   At minimum you need the three Supabase variables — see [Environment Variables](#environment-variables) below.

3. **Run database migrations**

   Apply the SQL files in `supabase/migrations/` to your Supabase project in order (001 → 014) via the Supabase dashboard SQL editor or the Supabase CLI:
   ```bash
   supabase db push
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

### Build

```bash
npm run build
npm start
```

---

## Environment Variables

Copy `.env.example` to `.env.local`. Variables marked **required** will cause a startup failure if missing.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public URL of this app (e.g. `https://invopap.com`) — used for CSRF, callbacks, and OAuth redirects |
| `MPESA_ENVIRONMENT` | M-Pesa | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY` | M-Pesa | Daraja app consumer key |
| `MPESA_CONSUMER_SECRET` | M-Pesa | Daraja app consumer secret |
| `MPESA_PASSKEY` | M-Pesa | Lipa Na M-Pesa passkey |
| `MPESA_SHORTCODE` | M-Pesa | Paybill / till number |
| `MPESA_CALLBACK_URL` | M-Pesa | Publicly reachable URL for Safaricom callbacks |
| `MPESA_CALLBACK_SECRET` | Recommended | Random secret to authenticate Safaricom callback requests |
| `RESEND_API_KEY` | Email | Resend API key |
| `RESEND_FROM_EMAIL` | Email | Sender address on a **Resend-verified domain** |
| `RESEND_FROM_NAME` | Email | Sender display name (default: `Invopap`) |
| `UPSTASH_REDIS_REST_URL` | Recommended | Upstash Redis URL — required for multi-instance rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Upstash Redis token |
| `ADMIN_SECRET` | Recommended | Secret for `/admin` and `/api/admin` routes |
| `SENTRY_DSN` | Recommended | Sentry DSN for server-side error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Sentry DSN inlined into the client bundle at build time |
| `SENTRY_ORG` | Sentry | Sentry org slug (for source map uploads) |
| `SENTRY_PROJECT` | Sentry | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Sentry | Sentry auth token for source map uploads |
| `NEXT_PUBLIC_MARKETING_URL` | Optional | URL of a separate marketing/landing site |

> **Note:** All `NEXT_PUBLIC_*` variables are inlined into the client bundle at **build time**. If deploying with Docker on Railway, set them as environment variables before the build runs.

---

## Deployment (Railway)

1. Create a new Railway project and connect this repository.
2. Set all required and recommended environment variables in the Railway dashboard.
3. Railway will automatically detect `railway.json` and build using the `Dockerfile`.
4. The health check is wired to `/api/health` — it probes the database on every check.

### M-Pesa Payment Reconciliation Cron (recommended)

If Safaricom's callback never arrives (network interruption between Safaricom and Railway), payments get marked `FAILED` by the stale-payment cleanup job even if the user was actually charged. A reconciliation endpoint re-queries Daraja and marks documents paid where confirmed.

Add a **Railway Cron Job** service pointing at your deployed URL:

| Setting | Value |
|---|---|
| Method | `POST` |
| URL | `https://your-domain.com/api/admin/reconcile-payments` |
| Header | `x-admin-secret: <your ADMIN_SECRET>` |
| Schedule | `*/5 * * * *` (every 5 minutes) |

The endpoint is idempotent — running it multiple times is safe.

---

## Database Migrations

Migrations live in `supabase/migrations/` and must be applied in numeric order:

| File | Description |
|---|---|
| `001_schema.sql` | Core tables: Invoice, LineItem, User, InvoicePhoto |
| `002_storage_buckets.sql` | Supabase Storage bucket setup |
| `003_security_and_scale.sql` | Indexes and RLS policies |
| `004_security_hardening.sql` | Additional RLS hardening |
| `005_production_hardening.sql` | Production-specific tuning |
| `006_delivery_notes.sql` | DeliveryNote document type |
| `007_cash_sales.sql` | CashSale document type |
| `008_receipts.sql` | Receipt document type |
| `009_purchase_orders.sql` | PurchaseOrder document type |
| `010_quotations.sql` | Quotation document type |
| `011_document_sharing.sql` | Public sharing and view tracking |
| `012_expire_stale_payments_v2.sql` | Cron job to expire unpaid M-Pesa sessions |
| `013_fix_overloaded_functions.sql` | Fix overloaded PG function signatures |
| `014_drop_overloaded_quotation_payment_fn.sql` | Drop redundant quotation payment function |

---

## Telegram Bot (Optional)

A standalone Telegram bot microservice lives in `telegram-bot/`. It is a separate Node.js application with its own `Dockerfile` and `docker-compose.yml`. See [`telegram-bot/README.md`](telegram-bot/README.md) and [`telegram-bot/QUICK_START.md`](telegram-bot/QUICK_START.md) for setup instructions.

---

## Project Structure

```
app/              Next.js App Router pages and API routes
components/       React components (editors, previews, forms, modals)
lib/              Business logic: DB, PDF, email, payments, storage, utils
supabase/         Database migrations and Supabase config
public/           Static assets
telegram-bot/     Optional standalone Telegram bot microservice
```

---

## License

Private — all rights reserved.