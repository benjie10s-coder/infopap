# Deployment Checklist

Complete these steps before deploying the Telegram bot to production.

## Pre-Deployment Setup

### Backend Configuration

- [ ] Verify main Next.js app is running
- [ ] Test existing API endpoints:
  ```bash
  curl http://localhost:3000/api/invoices -X POST
  ```
- [ ] Verify M-Pesa is configured (`MPESA_CONSUMER_KEY`, etc.)
- [ ] Test payment endpoints work:
  ```bash
  curl http://localhost:3000/api/payments/initiate -X POST
  ```
- [ ] **(OPTIONAL)** Add header-based guest session support to API
  - See [INTEGRATION.md](./INTEGRATION.md) Option B

### Telegram Setup

- [ ] Create bot with [@BotFather](https://t.me/botfather)
- [ ] Copy bot token
- [ ] Set bot profile picture & description
  - Name: "InvoSafi Bot"
  - Description: "Create documents (invoices, quotes, etc.) and pay with M-Pesa"
- [ ] Set bot commands:
  ```
  /start - Create a new document
  /help - Show help information
  /cancel - Cancel current operation
  ```

### Bot Service Preparation

- [ ] Install dependencies:
  ```bash
  cd telegram-bot && npm install
  ```
- [ ] Create `.env` file:
  ```bash
  cp .env.example .env
  ```
- [ ] Fill in `.env`:
  ```env
  TELEGRAM_BOT_TOKEN=your_token_here
  API_BASE_URL=https://yourdomain.com
  ```
- [ ] Test locally:
  ```bash
  npm run dev
  ```
- [ ] Send `/start` in Telegram - should work
- [ ] Complete sample document flow

## Local Testing Checklist

### Document Creation

- [ ] Invoice creation works
- [ ] Quotation works (no tax prompt)
- [ ] Cash Sale works (with tax)
- [ ] Delivery Note works (no financial fields)
- [ ] Purchase Order works
- [ ] Receipt works

### Line Items

- [ ] Can add multiple items
- [ ] Can see item summary
- [ ] Properly formatted with quantity × rate calculations

### Preview & Web Integration

- [ ] Preview link works in browser
- [ ] Document displays correctly
- [ ] Can edit via web form (if enabled)

### M-Pesa Payment

- [ ] Payment initiation successful
- [ ] Phone number validation works
  - ✅ `0712345678`
  - ✅ `254712345678`
  - ❌ Invalid formats rejected
- [ ] STK prompt appears on test phone
- [ ] Bot polls payment status
- [ ] PDF sent after successful payment
- [ ] Error handling for declined payment

### Session Management

- [ ] Multiple users can use bot simultaneously
- [ ] Sessions timeout after 24 hours
- [ ] Fresh `/start` creates new session
- [ ] `/cancel` clears state

### Error Scenarios

- [ ] API is offline → error message shown
- [ ] Invalid input rejected with validation message
- [ ] Payment timeout → graceful fallback
- [ ] Missing fields → prompts user to complete

## Performance Testing

- [ ] Single document creation < 5 seconds
- [ ] Payment polling responsive (updates every 2 seconds)
- [ ] PDF download completes < 10 seconds
- [ ] Memory usage stable after 1 hour of testing
- [ ] No memory leaks with 10+ concurrent sessions

## Security Checklist

- [ ] Bot token stored securely (env variable)
- [ ] HTTPS enforced for API calls
- [ ] Session IDs validated server-side
- [ ] Phone numbers sanitized before M-Pesa call
- [ ] No sensitive data in logs (test with `LOG_LEVEL=debug`)
- [ ] CORS configured if applicable

## Deployment (Docker)

- [ ] Dockerfile builds successfully:
  ```bash
  docker build -t invosafi-telegram-bot .
  ```
- [ ] Container runs with test token:
  ```bash
  docker run -e TELEGRAM_BOT_TOKEN=xxx invosafi-telegram-bot
  ```
- [ ] Health check endpoint works
- [ ] Graceful shutdown on SIGTERM
- [ ] Volumes/logging configured (if needed)

## Production Deployment

### Choose Platform

#### Railway.app (Easiest)

- [ ] Create Railway account
- [ ] Link GitHub repository
- [ ] Set environment variables:
  ```
  TELEGRAM_BOT_TOKEN=xxx
  API_BASE_URL=https://yourdomain.com
  ```
- [ ] Deploy
- [ ] Test in Telegram: bot should respond

#### Docker Compose (Local Server)

- [ ] Server has Docker installed
- [ ] Create docker-compose.yml
- [ ] Set environment variables
- [ ] Run: `docker-compose up -d`
- [ ] Check logs: `docker-compose logs -f invosafi-bot`

#### AWS/GCP/Azure

- [ ] Push Docker image to registry
- [ ] Configure container service (ECS/Cloud Run/Container Instances)
- [ ] Set environment variables
- [ ] Enable auto-restart
- [ ] Configure health checks
- [ ] Set up CloudWatch/Stackdriver logs

### Post-Deployment

- [ ] Bot responds to `/start` in production
- [ ] Complete test transaction (create document + pay)
- [ ] Verify document created in production database
- [ ] Check payment in M-Pesa callback logs
- [ ] Monitor logs for errors:
  ```bash
  # Railway
  railway logs

  # Docker
  docker logs invosafi-telegram-bot -f

  # Server logs
  tail -f /var/log/invosafi-bot.log
  ```

## Monitoring & Maintenance

### Set up Alerts

- [ ] Telegram webhook down (missing heartbeat)
- [ ] High error rate
- [ ] Memory usage > 80%
- [ ] API timeout errors

### Logging

- [ ] Logs shipped to centralized service (if applicable)
  - Sentry (errors)
  - DataDog / New Relic (performance)
  - CloudWatch / Stackdriver (infrastructure)
- [ ] Log rotation configured (if on-server)
- [ ] Sensitive data (tokens) redacted from logs

### Regular Tasks

- [ ] Weekly: Review error logs
- [ ] Monthly: Update dependencies
  ```bash
  npm update
  npm audit fix
  ```
- [ ] Monthly: Performance review
  - Concurrent user capacity
  - API response times
  - Memory stability
- [ ] Quarterly: Security review
  - Update Node.js version
  - Review dependencies for vulnerabilities

## Rollback Plan

If deployment fails:

1. **Immediate**: Stop bot container
   ```bash
   docker-compose down
   # or
   railway down
   ```

2. **Verify**: Check if API is being called incorrectly
   ```bash
   tail -f /path/to/next-app/logs
   ```

3. **Revert**: Deploy previous working version
   ```bash
   git revert
   docker build .
   docker-compose up -d
   ```

4. **Notify**: Alert users that bot is temporarily unavailable

## Scaling (Future)

When handling 10,000+ concurrent users:

- [ ] Migrate to Redis for shared state
- [ ] Deploy multiple bot instances behind load balancer
- [ ] Upgrade Next.js backend resource allocation
- [ ] Monitor M-Pesa rate limits
- [ ] Consider async PDF generation queue

See [README.md#future-enhancements](./README.md#future-enhancements) for details.

---

**Checklist Owner**: DevOps/Security Team  
**Last Updated**: February 2026  
**Next Review**: May 2026
