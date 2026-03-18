# Environment Variables — Production Setup Guide

All environment variables for deploying InvoSafi on Railway (or any Node.js host).

---

## Required Variables (app will NOT start without these)

| Variable | Example | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci…` | Supabase Dashboard → Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci…` | Supabase Dashboard → Settings → API → `service_role` key (**keep secret**) |

---

## M-Pesa Variables (all 5 required for payments to work)

| Variable | Example | Where to get it |
|---|---|---|
| `MPESA_ENVIRONMENT` | `production` | Use `sandbox` for Daraja sandbox, `production` for live |
| `MPESA_CONSUMER_KEY` | `ORMw…` | Daraja Portal → My Apps → your app → Consumer Key |
| `MPESA_CONSUMER_SECRET` | `kL3f…` | Daraja Portal → My Apps → your app → Consumer Secret |
| `MPESA_PASSKEY` | `bfb279f9…` | Daraja Portal → APIs → Lipa Na M-Pesa Online → Passkey (request from Safaricom for production) |
| `MPESA_SHORTCODE` | `174379` | Your Lipa Na M-Pesa Online shortcode (Till/Paybill number) |

### Going live with M-Pesa

1. Register at [Daraja](https://developer.safaricom.co.ke/)
2. Create an app and enable **Lipa Na M-Pesa Online** API
3. Test with sandbox credentials (`MPESA_ENVIRONMENT=sandbox`)
4. Apply for Go-Live via Daraja portal → submit business docs
5. Once approved, switch `MPESA_ENVIRONMENT=production` and swap in production keys

---

## Recommended Variables (strongly advised for production)

| Variable | Example | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://invosafi.com` | Used for M-Pesa callback URL construction (`{APP_URL}/api/payments/callback`) and public links |
| `MPESA_CALLBACK_URL` | `https://invosafi.com/api/payments/callback` | Explicit override for M-Pesa STK Push callback URL. If not set, auto-derived from `NEXT_PUBLIC_APP_URL` |
| `MPESA_CALLBACK_SECRET` | `mysecret123` | Shared secret appended to callback URL (`?secret=xxx`) to verify callbacks are from your system |
| `UPSTASH_REDIS_REST_URL` | `https://xxx.upstash.io` | [Upstash](https://upstash.com/) Redis REST URL for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | `AXxx…` | Upstash Redis REST token |
| `ADMIN_SECRET` | `a-long-random-string` | Protects admin endpoints (`/api/admin/*`, `/admin`) |

---

## Optional Variables

| Variable | Example | Purpose |
|---|---|---|
| `SENTRY_DSN` | `https://xxx@oXXX.ingest.sentry.io/YYY` | Sentry DSN for server-side error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Same as `SENTRY_DSN` | Sentry DSN for client-side error tracking |
| `NODE_ENV` | `production` | Set automatically by Railway/Vercel — don't set manually |
| `PORT` | `3000` | Railway injects this automatically |

---

## Railway Quick Setup

1. **Create project** → connect your GitHub repo
2. **Add a Supabase plugin** or use your external Supabase project
3. Go to **Variables** tab and add all required + recommended variables
4. Deploy — Railway reads the `Dockerfile` and `railway.json` automatically

### Paste-ready Railway variables template

```env
# === REQUIRED ===
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# === M-PESA (all 5 for payments) ===
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=

# === RECOMMENDED ===
NEXT_PUBLIC_APP_URL=https://your-domain.com
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/callback
MPESA_CALLBACK_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_SECRET=

# === OPTIONAL ===
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Validation

The app validates environment variables at startup via `instrumentation.ts` → `lib/env.ts`.

- **Missing required vars** → app crashes immediately with a clear error message
- **Partial M-Pesa config** → app crashes (all 5 M-Pesa vars must be set together or none)
- **Missing recommended vars in production** → warnings in server logs
- **M-Pesa disabled** → app works for document creation/viewing, but pay-to-download is unavailable

---

## IMPORTANT: M-Pesa Callback URL

Your callback URL **MUST** be publicly accessible from Safaricom's servers. This means:

- Use HTTPS (Safaricom requires it in production)
- The URL must resolve to your deployed app:  
  `https://your-domain.com/api/payments/callback`
- If using `MPESA_CALLBACK_SECRET`, the full callback URL sent to Safaricom becomes:  
  `https://your-domain.com/api/payments/callback?secret=YOUR_SECRET`
- In sandbox mode, use a tunnel (ngrok) or a deployed URL — `localhost` won't work

---

## Download Price

All document downloads (Invoice, Cash Sale, Delivery Note, Receipt, Purchase Order, Quotation) require a **10 KSH** M-Pesa payment. This is hardcoded in `/api/payments/initiate/route.ts` as `DOWNLOAD_PRICE = 10`. Amounts below 10 KSH are rejected.
