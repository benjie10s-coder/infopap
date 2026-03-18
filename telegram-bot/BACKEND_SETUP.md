# Backend Integration: Required Changes (If Any)

This guide explains what changes you might need to make to your Next.js backend to fully support the Telegram bot.

## Quick Assessment

Your current setup likely already supports the bot because:

1. ✅ You have guest session system ([lib/session.ts](../../lib/session.ts))
2. ✅ You have polymorphic payment handling
3. ✅ You validate requests via `getTenantContext()`
4. ✅ Your database schema already has `guestSessionId`

**Likely scenario**: Bot works out of the box with **NO changes** to your Next.js backend.

## Verification Steps

### Step 1: Check if Header Support Exists

Run this:

```bash
# Try to create an invoice with a custom guest session header
curl -X POST http://localhost:3000/api/invoices \
  -H "x-guest-session-id: test-guest-session-123" \
  -H "Content-Type: application/json" \
  -d '{
    "fromName": "Test Business",
    "toName": "Client",
    "lineItems": [{"description": "Service", "quantity": 1, "rate": 1000}]
  }'

# If successful (201): No changes needed! ✅
# If error 403/401 (Unauthorized): Need to add header support below
```

### Step 2: Check Session Resolver

Open [lib/session.ts](../../lib/session.ts) and look for this pattern:

```typescript
export async function getTenantContext(request: NextRequest) {
  // 1. Check authenticated user
  // 2. Fall back to guest session from cookies
}
```

If it **only** checks cookies, you need to add header support (see Option B below).

## Implementation Options

### Option A: No Changes (Recommended if header already works)

If the verification curl above returned 201:

```bash
# Start the exact test again
curl -X POST http://localhost:3000/api/invoices \
  -H "x-guest-session-id: test-guest-session-123" \
  -H "Content-Type: application/json" \
  -d '{"fromName":"Test","toName":"Client","lineItems":[{"description":"Item","quantity":1,"rate":100}]}'

# Save the response (publicId)
# Try to GET it with same header
curl http://localhost:3000/api/invoices/{publicId} \
  -H "x-guest-session-id: test-guest-session-123"

# If both work → No changes needed, proceed to bot deployment
```

### Option B: Add Header Support (If Option A fails)

You need to modify **two files** to accept the `x-guest-session-id` header.

#### Change 1: Update [lib/session.ts](../../lib/session.ts)

Add this function to extract header-based guest session:

```typescript
// Add after existing imports
import { headers } from 'next/headers';

// Add this new function
function getGuestSessionFromHeader(): string | null {
  try {
    const headersList = headers();
    return headersList.get('x-guest-session-id') || null;
  } catch {
    return null;
  }
}

// Modify getTenantContext() to check header:
export async function getTenantContext(request?: NextRequest): Promise<TenantContext> {
  // Try authenticated user first
  const user = await findUserBySupabaseId(userId);
  if (user) {
    return {
      userId: user.id,
      isAuthenticated: true,
    };
  }

  // Check cookie (web/browser)
  const guestSessionCookie = getOrCreateGuestSession();
  if (guestSessionCookie) {
    return {
      guestSessionId: guestSessionCookie,
      isAuthenticated: false,
    };
  }

  // NEW: Check header (Telegram bot)
  const guestSessionHeader = getGuestSessionFromHeader();
  if (guestSessionHeader) {
    return {
      guestSessionId: guestSessionHeader,
      isAuthenticated: false,
    };
  }

  // Fallback: create new guest session
  const newGuestSession = getOrCreateGuestSession();
  return {
    guestSessionId: newGuestSession,
    isAuthenticated: false,
  };
}
```

#### Change 2: Ensure Middleware Passes Headers

Open [middleware.ts](../../middleware.ts) and verify it doesn't strip headers:

```typescript
// middleware.ts should look similar to this:
export function middleware(request: NextRequest) {
  // Don't modify headers - just log/trace if needed
  const response = NextResponse.next();
  
  // GOOD: Headers flow through
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
```

**If you see header-stripping code**, remove it to allow bot headers through.

### Option C: Verify Database RLS Policies (Likely Already Correct)

Your Supabase RLS should already check `guestSessionId`. Verify in [supabase/migrations/](../../supabase/migrations/):

```sql
-- Should look similar to:
CREATE POLICY "Enable read access on documents for guest sessions"
  ON invoices FOR SELECT
  USING (
    auth.uid() = user_id 
    OR guest_session_id = current_setting('app.guest_session_id')
  );
```

If this exists, RLS already supports the bot. ✅

## Testing Your Changes

After applying Option B (if needed):

```bash
# Test 1: Web user still works (via cookie)
curl -X POST http://localhost:3000/api/invoices \
  -H "Cookie: invosafi_guest_session=cookie-value-123" \
  -b "invosafi_guest_session=cookie-value-123" \
  -H "Content-Type: application/json" \
  -d '{"fromName":"Web","toName":"User","lineItems":[...]}'

# Test 2: Bot user works (via header)
curl -X POST http://localhost:3000/api/invoices \
  -H "x-guest-session-id: bot-guest-session-abc" \
  -H "Content-Type: application/json" \
  -d '{"fromName":"Bot","toName":"User","lineItems":[...]}'

# Both should return 201 ✅
```

## Minimal Change Alternative

If you want **minimal changes**, you can create a new endpoint that accepts both:

```typescript
// app/api/documents/create/route.ts
export async function POST(request: NextRequest) {
  // Extract guest session from header if present
  const headerGuestSession = request.headers.get('x-guest-session-id');
  
  if (headerGuestSession) {
    // Set as context for this request
    // Bot request
    const tenantContext = {
      guestSessionId: headerGuestSession,
      isAuthenticated: false,
    };
  } else {
    // Get from cookie (existing flow)
    const tenantContext = getTenantContext();
  }
  
  // Rest of your handler...
}
```

But **Option B is cleaner** as it's a one-time change to the core session handler.

## Environment Variables

No changes needed to `.env` - bot will use your existing:

```env
# These are set up in your Next.js app already
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SERVICE_ROLE_KEY=...
MPESA_CONSUMER_KEY=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...
```

The bot passes all requests to these endpoints.

## Rate Limiting

Your existing rate limiters will apply:

```typescript
// lib/rate-limit.ts
const guestInvoiceLimiter = rateLimit({
  max: 50,  // 50 invoices per guest per minute
});

// Bot requests also hit this limit
// If you want stricter bot limits, add:
const botInvoiceLimiter = rateLimit({
  max: 10,  // 10 per minute for bots
});

// Check header in API route:
if (request.headers.get('x-guest-session-id')) {
  await botInvoiceLimiter.check();
} else {
  await guestInvoiceLimiter.check();
}
```

## Payment Integration

No changes needed. Bot uses existing:

- ✅ `POST /api/payments/initiate`
- ✅ `GET /api/payments/query`
- ✅ `POST /api/payments/callback` (M-Pesa webhook)

Same flows, same database, same RLS policies.

## Multipart/File Uploads

If users want to upload logos/signatures via bot (future):

The bot currently doesn't support file uploads, but can be extended:

```typescript
// In handlers.ts (future)
bot.on('photo', async (msg) => {
  // Download photo from Telegram
  // Upload to Supabase Storage via /api/upload endpoint
  // Store logoUrl in document
});
```

Your existing `/api/upload` or image handling will work.

## Webhooks & Callbacks

M-Pesa callback flow unchanged:

```
M-Pesa Safaricom
    ↓
POST /api/payments/callback
    ↓
Updates Payment status in Supabase
    ↓
Sets isPaid = true on corresponding document
    ↓
Bot polls /api/payments/query and receives COMPLETED status
```

No changes needed to callback handler.

## Caching & CDN

Nothing needed. Bot:
- Doesn't cache (not applicable for dynamic documents)
- Uses Supabase Storage CDN for PDFs (existing setup)
- No static files served by bot

## Logging & Monitoring

Your existing Sentry setup will catch bot errors:

```typescript
// In handlers.ts
try {
  const response = await apiClient.createDocument(...);
} catch (error) {
  console.error('API error:', error);
  // Sentry automatically captures if configured
}
```

Bot errors will appear in your existing error tracking.

## Database Schema

**No migrations needed.** All tables already have:

```sql
guest_session_id UUID    -- For bot users
user_id UUID             -- For authenticated users
```

Bot creates documents with `guest_session_id`, exactly like web users.

## Security Checklist

After adding header support:

- [ ] Header-based sessions only work with same origin (Telegram bot internal)
- [ ] Rate limiting applied (prevent abuse)
- [ ] Session IDs validated (non-null, UUID format)
- [ ] No sensitive data logged
- [ ] M-Pesa callback validation still works
- [ ] RLS policies enforced

## Summary

| Scenario | Action | Impact |
|----------|--------|--------|
| Header support already exists | None | Bot works immediately ✅ |
| Header support doesn't exist | Add Option B | Minimal 10-line change |
| Only cookies supported | Add header extraction | ~20-line change to session.ts |
| Payment validation needed | Already done in middleware | Works automatically |
| RLS policies | Already supports guest_session_id | No changes needed |

---

**Next Step**: Run verification from Step 1 above. If it works, no code changes needed!
