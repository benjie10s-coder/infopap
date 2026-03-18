# Quick Start Guide

Get the InvoSafi Telegram Bot running in 5 minutes.

## Prerequisites

- Node.js 20+ (or Docker)
- InvoSafi Next.js app running (backend)
- Telegram bot token from [@BotFather](https://t.me/botfather)

## Step 1: Get Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Follow prompts to create bot
4. Copy the **token** (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

## Step 2: Install & Configure

```bash
# Navigate to bot directory
cd telegram-bot

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your token
nano .env
```

**Minimal .env:**
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
API_BASE_URL=http://localhost:3000
```

## Step 3: Start Bot

**Option A: With npm (Development)**
```bash
npm run dev
```

**Option B: With Docker**
```bash
docker build -t invosafi-bot .
docker run -e TELEGRAM_BOT_TOKEN=your_token invosafi-bot
```

**Option C: With Docker Compose**
```bash
docker-compose up -d
```

You should see:
```
✅ Bot is ready!
⏳ Waiting for messages...
```

## Step 4: Test in Telegram

1. Open Telegram and search for your bot
2. Send `/start`
3. Bot should respond with welcome message and buttons
4. Click on "📄 Invoice"
5. Fill in the form step by step
6. When prompted, enter your business name
7. Continue through the flow...

## Step 5: Complete Test Transaction

1. Add a test item (e.g., "Consulting" for 1000 KES)
2. Review the preview link
3. When asked for payment, use M-Pesa test number: `0712345678`
4. *On a test M-Pesa phone:* Enter your PIN when prompted
5. Bot sends you a PDF download

**That's it!** 🎉

## Troubleshooting

### Bot doesn't respond

```bash
# Check bot is running
ps aux | grep node

# Check logs
npm run dev

# Verify token is correct
curl https://api.telegram.org/botYOUR_TOKEN/getMe
```

### Can't create documents

**Most likely:** Backend API not running

```bash
# Check Next.js is running
curl http://localhost:3000/api/invoices

# Update API_BASE_URL in .env if needed
export API_BASE_URL=http://localhost:3000
npm run dev
```

### Payment fails

**Most likely:** M-Pesa not configured in backend

```bash
# Check backend env variables
echo $MPESA_CONSUMER_KEY
echo $MPESA_PASSKEY

# If empty, configure M-Pesa in Next.js app first
```

### Session timeout

Sessions last 24 hours. After timeout, user can `/start` new conversation.

## Next Steps

- 📖 Read [README.md](./README.md) for full documentation
- 📋 Check [INTEGRATION.md](./INTEGRATION.md) for backend integration details
- ✅ Review [CHECKLIST.md](./CHECKLIST.md) before production deployment
- 🔧 See [BACKEND_SETUP.md](./BACKEND_SETUP.md) if you need to modify Next.js API

## Common Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run type-check      # Check TypeScript errors
npm run lint            # Run linter

# Production
npm start               # Run compiled version
npm run build           # Compile TypeScript

# Docker
docker compose up -d    # Start with Docker Compose
docker logs -f invosafi-telegram-bot  # View logs
docker compose down     # Stop
```

## File Structure

```
telegram-bot/
├── src/
│   ├── index.ts              # Bot entry point & handlers
│   ├── types.ts              # TypeScript types
│   ├── state-manager.ts      # Conversation state
│   ├── api-client.ts         # Backend API calls
│   └── helpers.ts            # Utilities & messages
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md                 # Full documentation
├── INTEGRATION.md            # Backend integration guide
├── BACKEND_SETUP.md         # API changes (if needed)
├── CHECKLIST.md             # Pre-deployment checklist
└── QUICK_START.md           # This file
```

## Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | ✓ | `123456:ABC-DEF...` |
| `API_BASE_URL` | | `http://localhost:3000` |
| `LOG_LEVEL` | | `debug` |

## Support

- 📚 See [README.md](./README.md) for full reference
- 🔍 Check logs with `LOG_LEVEL=debug npm start`
- 💬 Review conversation flow in [src/handlers.ts](./src/handlers.ts)

---

**Happy documenting!** 🚀
