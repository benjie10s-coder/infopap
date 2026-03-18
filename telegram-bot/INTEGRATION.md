# Telegram Bot Integration Guide

This document explains how the Telegram bot integrates with your existing InvoSafi Next.js backend and what changes (if any) might be needed.

## Backend Compatibility

The bot is designed to work with your existing API without requiring changes. It reuses:

- ✅ All document creation endpoints (`/api/{documentType}s`)
- ✅ Document retrieval endpoints
- ✅ M-Pesa payment integration (`/api/payments/*`)
- ✅ Supabase database (via Next.js)
- ✅ Guest session system

## How It Works

### 1. Guest Session Linking

**Current Setup (Web):**
- User visits platform without login
- Browser gets `invosafi_guest_session` cookie (httpOnly, 30-day TTL)
- All API calls automatically include cookie

**Bot Setup (New):**
- User starts `/start` command in Telegram
- Bot generates unique UUID for `guestSessionId`
- All bot API calls include header: `x-guest-session-id: {uuid}`

**Result:** Each Telegram user = unique guest session (just like web users)

### 2. API Request Format

**Web Requests (existing):**
```http
POST /api/invoices
Cookie: invosafi_guest_session=abc123def456
Content-Type: application/json

{
  "fromName": "John's Business",
  "toName": "Client Name",
  "lineItems": [...],
  "currency": "KES",
  "taxRate": 16
}
```

**Bot Requests (new):**
```http
POST /api/invoices
x-guest-session-id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "fromName": "John's Business",
  "toName": "Client Name",
  "lineItems": [...],
  "currency": "KES",
  "taxRate": 16
}
```

## Required API Changes (If Any)

### Option A: No Changes Required (Recommended)

If your API already supports guest sessions flexibly, **no changes are needed**. The bot will work out of the box with your existing endpoints.

**Check your current implementation:**
1. Open [lib/session.ts](../../lib/session.ts)
2. Verify `getTenantContext()` can work with:
   - Cookie-based sessions (web)
   - Header-based sessions (bot)

If both are supported, proceed directly to **Setup & Deployment**.

### Option B: Add Header Support (If Needed)

If your API **only** checks cookies, add support for the `x-guest-session-id` header:

**Update middleware.ts:**
```typescript
// In middleware.ts
export function middleware(request: NextRequest) {
  // Check for header-based session (Telegram bot)
  const guestSessionHeader = request.headers.get('x-guest-session-id');
  if (guestSessionHeader) {
    // Pass to session resolver
    request.headers.set('x-internal-guest-session', guestSessionHeader);
  }

  return NextResponse.next();
}
```

**Update lib/session.ts:**
```typescript
export async function getTenantContext() {
  // ... existing cookie check ...

  // Add header check for bot
  const guestSessionFromHeader = getHeaderValue('x-internal-guest-session');
  if (guestSessionFromHeader) {
    return {
      guestSessionId: guestSessionFromHeader,
      isAuthenticated: false,
    };
  }

  // ... rest of existing logic ...
}
```

## Bot → Backend API Flow

### Document Creation

```
User fills form in Telegram
        ↓
Bot calls: POST /api/{documentType}s
Headers: x-guest-session-id
        ↓
Next.js resolves guest session
        ↓
Supabase checks RLS: guestSessionId matches
        ↓
Document created with guestSessionId
        ↓
PDF generation initiates (can be async)
        ↓
Response sent to bot: { id, publicId, pdfUrl }
        ↓
Bot sends preview link to user
```

### Payment Initiation

```
Bot calls: POST /api/payments/initiate
{
  publicId, phoneNumber, documentType
}
        ↓
Backend validates document exists + belongs to guest session
        ↓
Calls M-Pesa Daraja API
        ↓
Backend creates Payment record (polymorphic)
        ↓
Response: { checkoutRequestId, merchantRequestId }
        ↓
Bot starts polling /api/payments/query
        ↓
M-Pesa callback received (Safaricom → Next.js)
        ↓
Backend updates Payment status: COMPLETED/FAILED
        ↓
Document marked: isPaid = true
        ↓
Bot receives polling response: status = COMPLETED
        ↓
Bot sends PDF to user
```

## Multi-Tenant Data Isolation

Your current multi-tenant design is preserved:

| Layer | Implementation | Bot Support |
|-------|---|---|
| **Cookie-based session (web)** | `invosafi_guest_session` | ✅ Works as-is |
| **Header-based session (bot)** | `x-guest-session-id` | ✅ With option B above |
| **Supabase RLS policies** | `guestSessionId` column | ✅ No changes |
| **Database queries** | `WHERE guestSessionId = $1` | ✅ Automatic |

Each user (web or bot) only sees their own documents.

## Environment Configuration

**Main Next.js App (.env):**
```env
# Existing config - no changes needed
DATABASE_URL=...
MPESA_CONSUMER_KEY=...
```

**Telegram Bot (.env):**
```env
TELEGRAM_BOT_TOKEN=your_bot_token
API_BASE_URL=https://yourdomain.com    # Points to your Next.js backend
```

## Testing Integration

### 1. Verify API Responds Correctly

```bash
# Test bot guest session header
curl -X POST http://localhost:3000/api/invoices \
  -H "x-guest-session-id: test-guest-123" \
  -H "Content-Type: application/json" \
  -d '{
    "fromName": "Test",
    "toName": "Client",
    "lineItems": [{"description": "Item", "quantity": 1, "rate": 100}],
    "currency": "KES"
  }'

# Should return 200 with created document
```

### 2. Start Bot with Test Token

```bash
cd telegram-bot
export TELEGRAM_BOT_TOKEN=your_test_token
export API_BASE_URL=http://localhost:3000
npm start
```

### 3. Send Test Message in Telegram

```
/start
→ Bot should respond with document type selection
```

### 4. Complete Full Flow

1. Select document type
2. Fill in details step by step
3. Review at preview link
4. Enter M-Pesa test phone (0712345678)
5. Verify document created in dashboard
6. Verify payment status in database

## Database Considerations

### Existing Payments Table

Your polymorphic payment design supports this out of the box:

```sql
-- Each document type has its own payment table
CREATE TABLE invoice_payments (
  id UUID,
  invoice_id UUID REFERENCES invoices(id),
  user_id UUID,
  guest_session_id UUID,
  phone_number VARCHAR,
  status VARCHAR,
  -- ...
);

-- Bot creates payments the exact same way
```

### Data Consistency

Everything automatic:
- ✅ Payment → Document link (via `publicId`)
- ✅ Documents → Guest session (via `guestSessionId`)
- ✅ PDFs stored in Supabase Storage
- ✅ RLS policies enforced on all queries

No database migrations needed!

## Rate Limiting

Your existing rate limiter configuration works:

```typescript
// From lib/rate-limit.ts
const guestInvoiceLimiter = rateLimit({
  interval: 60 * 1000,        // 1 minute
  uniqueTokenPerInterval: 100,
  max: 50,                     // 50 invoices per guest per minute
});

// Bot respects these limits automatically
```

If you want stricter limits for bot usage:

```typescript
const botInvoiceLimiter = rateLimit({
  interval: 60 * 1000,
  max: 10,  // 10 per minute for bot
});

// Check IP or guestSessionId
```

## Payment Callback Handling

Your M-Pesa callback endpoint stays the same:

```typescript
// POST /api/payments/callback
// Receives: {
//   Body: { stkCallback: { MerchantRequestID, CheckoutRequestID, ... } }
// }

// Already handles all document types polymorphically
// Bot benefits from same logic
```

### Webhook URL Configuration

Ensure M-Pesa callback URL in your env points to correct domain:

```env
# In your Next.js .env
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/callback
```

The bot doesn't need this - it polls instead of receiving callbacks.

## Logging & Monitoring

### Bot Logs

The bot sends logs to stdout (Docker-friendly):

```bash
LOG_LEVEL=debug npm start

# Output:
# ✅ Bot is ready!
# User 123456789: /start command
# User 123456789: Selected document_type=invoice
# API Call: POST /api/invoices [201]
# ...
```

### Monitor in Production

```bash
# Check bot container logs
docker logs invosafi-telegram-bot

# Monitor memory
docker stats invosafi-telegram-bot

# Check API calls
# → View Next.js logs for API requests from bot
```

## Disaster Recovery

### Bot Crashes

```bash
# Docker automatically restarts
docker run -d --restart=always invosafi-telegram-bot

# Or with compose
docker-compose up -d  # --restart=always by default
```

### Lost Conversation State

- Web users: Session persists via cookie
- Bot users with in-memory state: Conversation lost if bot crashes
- **Solution for high availability**: Migrate to Redis backend (Phase 2)

### Payment Webhook Missed

- M-Pesa callback arrives at `/api/payments/callback`
- Bot polls separately every 2 seconds
- User gets status eventually, even if polling fails temporarily

## Scaling Considerations

### Current Limits (Single Instance)
- ~100 concurrent conversations (in-memory state)
- ~1000 documents/hour (API call rate)
- ~10,000 PDF downloads/hour (Supabase Storage limit)

### Scale to 10,000+ Users

See [telegram-bot/README.md#load-testing](../README.md#load-testing) for Redis migration plan.

## Troubleshooting Integration Issues

### Bot Can't Create Documents

```bash
# Check API is reachable
curl http://localhost:3000/api/invoices -X OPTIONS

# Check logs
LOG_LEVEL=debug npm start

# Verify environment
echo $API_BASE_URL
```

### Payment Fails

```bash
# Check M-Pesa config in main app
echo $MPESA_CONSUMER_KEY
echo $MPESA_PASSKEY

# Test M-Pesa endpoint
curl http://localhost:3000/api/payments/query?checkoutRequestId=test
```

### Documents Created But PDF Missing

```bash
# PDFs generate async - check Next.js logs
# Might need to retry `/api/invoices/{id}` to trigger generation
```

## FAQ

**Q: Will bot users' data be mixed with web users' data?**
A: No. Each guest session (web cookie or bot header) is isolated. No data leakage.

**Q: Can web users see bot-created documents?**
A: No. Only the guest session that created it can see it.

**Q: Do I need to change payment integration?**
A: No. Same M-Pesa flow, same endpoints, same callbacks.

**Q: What if M-Pesa API changes?**
A: Bot uses existing `/api/payments/*` endpoints. Single point of update in Next.js.

**Q: Can users switch between web and bot?**
A: Not currently (different guest sessions). Could add feature to link sessions (future).

---

**Ready to launch?** See [Development Checklist](./CHECKLIST.md)
