# InvoSafi Telegram Bot

A feature-rich Telegram bot that allows users to create professional documents (invoices, quotations, receipts, etc.) directly from Telegram, with M-Pesa payment integration.

## Features

✨ **Complete Document Support**
- 📄 Invoices
- 💼 Quotations
- 🛍️ Cash Sales
- 📦 Delivery Notes
- 📋 Purchase Orders
- 🧾 Receipts

🤖 **Smart Conversation Flow**
- Step-by-step guided creation (no web form required)
- Context-aware field collection (different fields per document type)
- In-memory conversation state management
- 24-hour conversation timeout for session cleanup

💳 **Integrated M-Pesa Payments**
- Seamless M-Pesa STK Push integration
- Automatic payment polling (2-second intervals)
- Real-time payment status updates
- Receipt confirmation

📥 **PDF Delivery**
- Direct PDF download via Telegram
- Public preview link via web browser
- Edit capability before payment

🚀 **Scalable Architecture**
- Standalone Node.js microservice (no coupling to main Next.js app)
- Ready for multi-instance deployment with Redis backend (future upgrade)
- Low-latency API integration with the main platform

## Setup

### Prerequisites

- Node.js 20+ or Docker
- Telegram Bot Token (create via [@BotFather](https://t.me/botfather) on Telegram)
- Running InvoSafi Next.js backend (for API calls)
- M-Pesa configured in main backend

### Local Development

1. **Clone and install dependencies:**
   ```bash
   cd telegram-bot
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables:**
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   API_BASE_URL=http://localhost:3000
   LOG_LEVEL=debug
   ```

4. **Start the bot:**
   ```bash
   npm run dev
   ```

   Or with typescript:
   ```bash
   npm start
   ```

### Docker Deployment

1. **Build image:**
   ```bash
   docker build -t invosafi-telegram-bot .
   ```

2. **Run container:**
   ```bash
   docker run -d \
     --name invosafi-bot \
     -e TELEGRAM_BOT_TOKEN=your_token \
     -e API_BASE_URL=https://yourdomain.com \
     invosafi-telegram-bot
   ```

3. **Using Docker Compose (recommended):**
   ```bash
   docker-compose up -d
   ```

### Production Deployment

#### Railway.app (Recommended)

1. **Create Railway project:**
   ```bash
   railway init
   ```

2. **Configure variables:**
   ```bash
   railway variables set TELEGRAM_BOT_TOKEN=your_token
   railway variables set API_BASE_URL=https://yourdomain.com
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

#### Heroku

```bash
heroku create invosafi-telegram-bot
heroku config:set TELEGRAM_BOT_TOKEN=your_token API_BASE_URL=https://yourdomain.com
git push heroku main
```

#### AWS / Google Cloud / Azure

Use Docker image in your container service with environment variables from `.env`.

## Architecture

### Conversation State Management

Each Telegram user gets a unique conversation state:

```typescript
{
  chatId: number,
  guestSessionId: UUID,          // Links to main backend's guest session
  documentType: DocumentType,     // Selected document type
  currentStep: ConversationStep,  // Tracks progress in flow
  formData: {
    fromName, toName, currency, taxRate, dueDate, lineItems[]
  },
  documentId, publicId,           // Created document references
  checkoutRequestId, paymentPhone // M-Pesa details
}
```

**State Storage Modes:**
- **Development**: In-memory (HashMap) - fast, local only
- **Production Single Instance**: In-memory with auto-cleanup
- **Production Multi-Instance**: Redis (future upgrade with session serialization)

### API Integration Flow

```
User Telegram Message
        ↓
BotHandlers.handleMessage()
        ↓
StateManager (get/update state)
        ↓
APIClient (call Next.js backend)
        ↓
Supabase (via Next.js)
        ↓
Response + PDF URL
        ↓
Telegram file/message sent to user
```

### Payment Flow

```
1. User enters M-Pesa phone
   ↓
2. Bot calls /api/payments/initiate
   ↓
3. M-Pesa STK prompt on user's phone
   ↓
4. User enters PIN
   ↓
5. M-Pesa callback to Next.js backend
   ↓
6. Bot polls /api/payments/query (every 2 seconds)
   ↓
7. Status = COMPLETED → Bot sends PDF
```

## API Endpoints Used

The bot calls these existing Next.js endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/{documentType}s` | POST | Create document (invoice, quotation, etc.) |
| `/api/{documentType}s/{id}` | GET | Fetch document with PDF URL |
| `/api/payments/initiate` | POST | Start M-Pesa payment |
| `/api/payments/query` | GET | Poll payment status |

**Guest Session Header:**
All requests include `x-guest-session-id` header to link Telegram user to backend guest session.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✓ | | Bot token from @BotFather |
| `API_BASE_URL` | | `http://localhost:3000` | Main backend URL |
| `API_GUEST_HEADER` | | `x-guest-session-id` | Guest session header name |
| `LOG_LEVEL` | | `info` | Logging verbosity |
| `BOT_POLLING_INTERVAL` | | `300` | Polling interval (ms) |

### Modifying Document Types

Edit [src/types.ts](src/types.ts) to change supported document types:

```typescript
export type DocumentType = 
  | 'invoice' 
  | 'quotation' 
  | 'cash-sale' 
  | 'delivery-note' 
  | 'purchase-order' 
  | 'receipt';
```

### Customizing Chat Flow

Modify [src/handlers.ts](src/handlers.ts) to change:
- Field prompts and validation
- Conversation steps
- Button layouts
- Error messages

## Conversation Steps

The bot guides users through these steps:

```
START
  ↓
SELECT-DOC-TYPE (choose from 6 types)
  ↓
ENTER-FROM-NAME (your business)
  ↓
ENTER-TO-NAME (recipient)
  ↓
ENTER-CURRENCY (KES, USD, etc.)
  ↓
ENTER-TAX-RATE (if applicable)
  ↓
ADD-LINE-ITEMS (products/services)
  ├─ ADD-ITEM-NAME
  ├─ ADD-ITEM-QTY
  ├─ ADD-ITEM-RATE
  └─ ADD-ITEM-CONFIRM (add more?)
  ↓
REVIEW-DOCUMENT (preview link sent)
  ↓
READY-TO-PREVIEW (edit or pay)
  ↓
PAYMENT-PHONE (enter M-Pesa number)
  ↓
PAYMENT-STATUS (polling until complete)
  ↓
DOWNLOAD-PDF (send file to Telegram)
  ↓
COMPLETE
```

## Testing

### Manual Testing

1. Start the bot with `/start`
2. Select a document type
3. Fill in details step by step
4. Toggle between "Add Item" and "Done"
5. Review document at preview link
6. Enter test M-Pesa number: `0712345678`
7. Check STK prompt on test device
8. Receive PDF file in Telegram

### Load Testing

For tens of thousands of concurrent downloads:

1. **Monitor conversation state:**
   ```typescript
   const states = stateManager.getAllStates();
   console.log(`Active conversations: ${states.length}`);
   ```

2. **Watch memory usage:**
   ```bash
   node --max-old-space-size=4096 src/index.ts
   ```

3. **Scale horizontally:**
   - Deploy multiple bot instances
   - Add Redis for shared state (see Future Enhancements)

## Troubleshooting

### Bot doesn't respond

1. Check bot token is correct:
   ```bash
   curl https://api.telegram.org/botYOUR_TOKEN/getMe
   ```

2. Verify bot is running:
   ```bash
   npm start
   ```

3. Check logs:
   ```bash
   tail -f logs/bot.log
   ```

### Payment fails

1. Verify M-Pesa is configured in main backend
2. Check phone number format (must be Kenyan)
3. Ensure test account has M-Pesa enabled
4. Check `/api/payments/*` endpoints in Next.js

### Document creation fails

1. Verify API_BASE_URL is correct
2. Check main backend is running
3. Review API response: `curl http://localhost:3000/api/invoices` (should require auth)
4. Ensure guest session header is included

### Session timeout

Sessions expire after 24 hours of inactivity. User action resets timer.

## Future Enhancements

### Phase 2: Redis State Management
- Shared state across bot instances
- Better multi-instance scaling
- Conversation persistence on bot restart

### Phase 3: Advanced Features
- Template system (save & reuse document templates)
- Bulk document creation
- Scheduled invoice generation
- Payment receipt notifications
- Tax report generation

### Phase 4: Analytics
- Document creation metrics
- Payment success rate tracking
- User segment analysis
- Performance monitoring

### Phase 5: Telegram Business Features
- Bot verification on Telegram Business
- Merchant account integration
- Invoice search by document number
- Recurring invoice templates

## Performance Considerations

### Current Bottlenecks
- Polling payment status (2-second intervals) - temporary
- PDF generation on first access - async in backend
- Line item input (N prompts) - acceptable UX

### Optimization Strategies
1. **Async PDF generation**: Move to background queue
2. **Webhook payments**: Replace polling with webhooks from M-Pesa
3. **State compression**: For Redis storage (future)
4. **Caching**: Preview URLs cached for 10 minutes

## Contributing

To add new features:

1. Add new conversation steps in `src/types.ts`
2. Implement handlers in `src/handlers.ts`
3. Update helpers in `src/helpers.ts`
4. Test with `/start` flow
5. Run `npm run lint` & `npm run type-check`

## License

MIT

## Support

For issues, questions, or feature requests:
- Open an issue in the main repository
- Check conversation logs: `LOG_LEVEL=debug npm start`
- Review handler flow in `src/handlers.ts`

---

**Built with ❤️ for InvoSafi Platform**
