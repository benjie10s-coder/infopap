# Architecture & Design

This document explains the technical architecture of the InvoSafi Telegram Bot.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM USERS                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    Telegram API
                           │
              ┌────────────▼────────────┐
              │  TELEGRAM BOT SERVICE  │
              │  (Node.js)             │
              └────────────┬────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    Conversation State   APIClient      Handlers
    Manager             (Axios)        (BotHandlers)
          │                │                │
          ▼                ▼                ▼
    [Map<chatId>]    [HTTP Requests]  [Step Logic]
                           │
                   REST API Endpoints
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────▼────────────────▼───┐   ┌───────▼──────┐
     │   NEXT.JS BACKEND      │   │ SUPABASE     │
     │   ├─ /api/invoices     │   │ ├─ Invoices  │
     │   ├─ /api/quotations   │   │ ├─ LineItems │
     │   ├─ /api/payments/*   │   │ ├─ Payments  │
     │   └─ lib/session.ts    │   │ └─ Storage   │
     └────────────┬───────────┘   └───┬──────────┘
                  │                    │
        ┌─────────┴────────────────────┴──────────┐
        │                                         │
        │   M-PESA SAFARICOM DARAJA API         │
        │   ├─ STK Push                         │
        │   └─ Query Status                     │
        │                                        │
    (Callback to /api/payments/callback)
```

## Conversation Flow Diagram

```
START (/start)
  │
  ├─→ SELECT-DOC-TYPE (choose from 6 types)
  │
  ├─→ ENTER-FROM-NAME (your business)
  │
  ├─→ ENTER-TO-NAME (recipient)
  │
  ├─→ ENTER-CURRENCY (KES, USD, etc.)
  │
  ├─→ [CONDITIONAL] ENTER-TAX-RATE
  │   ├─ Invoice: Yes
  │   ├─ Quotation: No
  │   ├─ Cash Sale: Yes
  │   ├─ Purchase Order: Yes
  │   ├─ Delivery Note: No
  │   └─ Receipt: No
  │
  ├─→ ADD-LINE-ITEMS (collect items loop)
  │   ├─ ADD-ITEM-NAME: "Consulting"
  │   ├─ ADD-ITEM-QTY: 1
  │   ├─ ADD-ITEM-RATE: 5000
  │   └─ ADD-ITEM-CONFIRM: Add another? → Yes/No
  │       ├─ Yes → ADD-ITEM-NAME (repeat)
  │       └─ No → Continue
  │
  ├─→ REVIEW-DOCUMENT (create via API)
  │   └─ Send preview link + summary
  │
  ├─→ READY-TO-PREVIEW
  │   ├─ Preview button (opens web link)
  │   ├─ Edit button (opens editor form)
  │   └─ Payment button
  │
  ├─→ PAYMENT-PHONE (enter M-Pesa number)
  │
  ├─→ PAYMENT-STATUS (polling)
  │   ├─ Every 2 seconds: Check payment
  │   ├─ COMPLETED → Continue
  │   ├─ FAILED → Offer retry
  │   └─ TIMEOUT (30 polls) → Manual check message
  │
  ├─→ DOWNLOAD-PDF (fetch & send file)
  │
  └─→ COMPLETE (thank you message)
```

## State Management

### State Object Structure

```typescript
ConversationState {
  // Identity
  chatId: number                    // Telegram chat ID
  userId: number                    // Telegram user ID
  guestSessionId: string           // UUID linking to backend

  // Document Selection
  documentType?: DocumentType      // invoice | quotation | ...

  // Progress
  currentStep: ConversationStep    // Which step in flow

  // Form Data
  formData: {
    fromName?: string              // "John's Business"
    toName?: string                // "Client Ltd"
    currency?: string              // "KES"
    taxRate?: number               // 16
    dueDate?: string               // "2026-03-22"
    lineItems: [                   // Array of items
      {
        description: string        // "Consulting"
        quantity: number           // 2
        rate: number               // 5000
        amount?: number            // 10000 (calculated)
      }
    ]
  }

  // Temporary Data (being edited)
  tempItemData?: {
    description?: string
    quantity?: number
    rate?: number
  }

  // Created Document
  documentId?: string              // Internal ID
  publicId?: string                // Public share ID

  // Payment Info
  checkoutRequestId?: string       // M-Pesa request
  merchantRequestId?: string
  paymentPhone?: string            // "254712345678"
  pdfUrl?: string                  // Supabase URL

  // Timestamps
  createdAt: number               // Creation time
  updatedAt: number               // Last activity
}
```

### State Lifecycle

```
1. STATE CREATION
   ├─ User sends /start
   ├─ stateManager.createState(chatId, userId)
   ├─ Generates unique guestSessionId (UUID)
   └─ Sets currentStep: 'select-doc-type'

2. STATE UPDATES
   ├─ Each message/callback → stateManager.updateState()
   ├─ currentStep changes
   ├─ formData accumulates
   └─ updatedAt timestamp refreshed

3. STATE TIMEOUT
   ├─ No activity for 24 hours
   ├─ stateManager.cleanupExpiredSessions() (hourly)
   ├─ State deleted from memory
   └─ User must /start again

4. STATE DELETION
   ├─ User sends /cancel
   ├─ stateManager.deleteState(chatId)
   └─ New /start creates fresh state
```

## API Integration

### APIClient Class

```typescript
APIClient {
  baseURL: string  // http://localhost:3000

  // Document Operations
  async createDocument(docType, payload, guestSessionId)
    → POST /api/{documentType}s
    → Returns { id, publicId, pdfUrl }

  async getDocument(docType, docId, guestSessionId)
    → GET /api/{documentType}s/{id}
    → Returns full document object

  // Payment Operations
  async initiatePayment(publicId, phone, docType, guestSessionId)
    → POST /api/payments/initiate
    → Returns { checkoutRequestId, merchantRequestId }

  async queryPaymentStatus(checkoutRequestId, guestSessionId)
    → GET /api/payments/query?checkoutRequestId=xxx
    → Returns { status, mpesaReceiptNumber }

  // Utilities
  generatePreviewLink(docType, publicId)
    → Returns HTML preview URL
}
```

### Request Headers

Every APIClient request includes:

```http
x-guest-session-id: {uuid}              // Identifies telegram user
Content-Type: application/json          // Standard HTTP
```

The backend uses this header to isolate data per guest session.

## Data Flow Examples

### Document Creation Flow

```
User Message: "Invoice"
        ↓
BotHandlers.handleDocumentTypeSelection()
        ↓
stateManager.updateState({
  documentType: 'invoice',
  currentStep: 'enter-from-name'
})
        ↓
Bot sends: "What's your business name?"
        ↓
User: "John's Consulting"
        ↓
BotHandlers.handleFromName()
        ↓
stateManager.setFormData('fromName', "John's Consulting")
        ↓
[Continue through each step...]
        ↓
User completes all fields
        ↓
BotHandlers.handleCreateDocument()
        ↓
apiClient.createDocument('invoice', {
  fromName: "John's Consulting",
  toName: "Acme Corp",
  lineItems: [...],
  currency: "KES",
  taxRate: 16
}, state.guestSessionId)
        ↓
HTTP POST /api/invoices
Header: x-guest-session-id: {uuid}
        ↓
Next.js resolves guest session from header
        ↓
Supabase inserts Invoice record with guestSessionId
        ↓
Response: { id, publicId, pdfUrl }
        ↓
stateManager.setDocumentInfo(chatId, id, publicId, pdfUrl)
        ↓
Bot sends: "Preview: https://..."
```

### Payment Flow

```
User clicks: "Proceed to Payment"
        ↓
BotHandlers.handlePaymentPhoneRequest()
        ↓
stateManager.setStep('payment-status')
        ↓
apiClient.initiatePayment(publicId, '0712345678', 'invoice', guestSessionId)
        ↓
HTTP POST /api/payments/initiate
{
  publicId: "INV-2025-abc123",
  phoneNumber: "0712345678",
  documentType: "invoice"
}
        ↓
Next.js creates Payment record + calls M-Pesa API
        ↓
M-Pesa returns: { checkoutRequestId, merchantRequestId }
        ↓
stateManager.setPaymentInfo(chatId, checkoutRequestId, ...)
        ↓
Bot shows: "Check your phone for M-Pesa prompt"
        ↓
BotHandlers.startPaymentPolling(checkoutRequestId)
        ↓
LOOP (every 2 seconds, max 30 times):
  ├─ apiClient.queryPaymentStatus(checkoutRequestId)
  ├─ ├─ GET /api/payments/query?checkoutRequestId=xxx
  ├─ ├─ Returns status (PENDING|PROCESSING|COMPLETED|FAILED)
  ├─ ├─ If COMPLETED → Break loop
  ├─ ├─ If FAILED → Show retry
  ├─ └─ Else → Retry after 2 seconds
        ↓
Status = COMPLETED
        ↓
M-Pesa callback received "at /api/payments/callback
        ↓
Backend updates Payment: status = COMPLETED, isPaid = true
        ↓
apiClient gets mpesaReceiptNumber
        ↓
stateManager.setStep('download-pdf')
        ↓
BotHandlers.sendPDFDocument()
        ↓
Fetch PDF from Supabase Storage
        ↓
Telegram sendDocument(pdfBuffer)
        ↓
User receives PDF file ✅
```

## Handler Architecture

### BotHandlers Class (Static Methods)

```typescript
BotHandlers {
  // Commands
  static async handleStart(bot, msg)
  
  // Document Type Selection
  static async handleDocumentTypeSelection(bot, chatId, userId, docType)
  
  // Field Collection
  static async handleFromName(bot, msg)
  static async handleToName(bot, msg)
  static async handleCurrency(bot, msg)
  static async handleTaxRate(bot, msg)
  
  // Line Items
  static async handleAddItemName(bot, msg)
  static async handleAddItemQty(bot, msg)
  static async handleAddItemRate(bot, msg)
  
  // Document Management
  static async handleCreateDocument(bot, chatId)
  
  // Payment
  static async handlePaymentPhoneRequest(bot, msg)
  static startPaymentPolling(bot, chatId, checkoutRequestId, docType, attempts)
  static async sendPDFDocument(bot, chatId)
  
  // Callbacks
  static async handleCallbackQuery(bot, callbackQuery)
  
  // Message Router
  static async handleMessage(bot, msg)
}
```

## Scaling Considerations

### Current Architecture
- **In-memory state storage** (JavaScript Map)
- **Single instance** deployment
- **Maximum concurrent users**: ~100-500 (based on state size)

```
Per User:
- State object: ~2KB
- 100 users: ~200KB
- 500 users: ~1MB
```

### Future: Redis-Based Scaling

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Bot-1       │  │ Bot-2       │  │ Bot-3       │
│ Node.js     │  │ Node.js     │  │ Node.js     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                 ┌──────▼──────┐
                 │ REDIS       │
                 │ Shared State│
                 └─────────────┘
                        │
            ┌───────────┴─────────────┐
            │                         │
       Next.js Backend        Supabase
```

**Benefits:**
- Multiple bot instances
- Survive-instance-restart
- Share state across processes
- ~10,000+ concurrent users

## Error Handling

### Strategy: Graceful Degradation

```
API Call Fails
  ↓
Copy error message to user
  ↓
Offer retry or cancel
  ↓
Don't crash bot
```

### Error Types

| Error | Recovery |
|-------|----------|
| API timeout | Retry 1x, then show fallback |
| Invalid phone | Show format hint, re-prompt |
| Document creation fails | Show API error, suggest retry |
| Payment declined | Show friendly message, offer retry |
| PDF generation delayed | Queue for later, send link instead |
| Session expired | /start to create new session |

## Performance

### Latency Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Message acknowledgment | <500ms | ~100ms ✅ |
| Document creation | <5s | ~2-3s ✅ |
| Payment initiation | <2s | ~1s ✅ |
| Payment polling | <2s/poll | ~2s ✅ |
| PDF download | <10s | ~3-5s ✅ |

### Memory Usage

```
Node.js Process:
├─ V8 Heap: ~50MB (base)
├─ State Store: 200KB-1MB (100-500 users)
├─ Axios/HTTP buffers: ~10MB
└─ Telegram polling: ~5MB

Total: ~65-75MB (light!)
```

## Security

### Data Isolation

```
Web User                    Telegram User
Cookie: abc123              Header: def456
    │                           │
    ▼                           ▼
  Supabase                  Supabase
  guestSessionId=abc123     guestSessionId=def456
  (Different RLS policy)    (Different RLS policy)
  See own docs only         See own docs only
```

### Safeguards

- ✅ UUID for session IDs (impossible to guess)
- ✅ RLS policies enforce isolation
- ✅ No sensitive data in logs
- ✅ M-Pesa validation (phone format checks)
- ✅ Rate limiting per guest session

## Testing Strategy

### Unit Tests (Future)

```typescript
// test/state-manager.test.ts
describe('StateManager', () => {
  it('creates unique session per user')
  it('updates state correctly')
  it('cleans expired sessions')
})

// test/handlers.test.ts
describe('BotHandlers', () => {
  it('routes messages to correct step')
  it('validates input')
  it('calls API with correct payload')
})

// test/api-client.test.ts
describe('APIClient', () => {
  it('includes guest session header')
  it('retries on failure')
  it('parses responses correctly')
})
```

### Integration Tests

```typescript
// Simulated Telegram bot conversation
1. /start → expect welcome message
2. Select invoice → expect "From Name?" prompt
3. "John's Co" → expect "To Name?" prompt
4. ... complete flow ...
5. Enter M-Pesa → expect polling start
6. Verify document created in Supabase
7. Verify payment record created
```

### Load Testing

```bash
# Simulate 100 concurrent users creating documents
npm install -g artillery

artillery quick -c 100 http://localhost:3000/api/invoices
```

---

**Maintainers**: Keep this document updated as architecture evolves!
