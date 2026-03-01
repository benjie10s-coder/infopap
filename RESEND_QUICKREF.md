# Resend Quick Reference

## TL;DR - Get Email Sharing Working in 5 Minutes

### 1. Get API Key (2 min)
```
https://resend.com → Sign up → Settings → Create API Key
Copy the key (re_xxx...)
```

### 2. Set Environment (1 min)
```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Invopap Documents
```

### 3. Test (1 min)
```bash
npm run dev
# In another terminal:
node scripts/test-resend.js
# Check email inbox
```

### 4. Use in App (1 min)
- Open document → Share → Email
- Send to someone
- Done! ✓

---

## Configuration Options

### Development (Sandbox)
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Invopap
```
✓ Free, easy  
✗ Recipients must be pre-verified

### Production (Professional Domain)
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=documents@yourdomain.com
RESEND_FROM_NAME=Invopap Documents
```
✓ Send to anyone, professional  
✗ Requires domain verification

---

## Key Commands

```bash
# Test email setup
node scripts/test-resend.js

# Test with specific email
node scripts/test-resend.js you@example.com

# Run development server
npm run dev

# Run production build
npm run build && npm start
```

---

## Important Files

| File | Purpose |
|------|---------|
| `lib/email.ts` | Email sending logic |
| `components/ShareModal.tsx` | Share feature UI |
| `scripts/test-resend.js` | Email test script |
| `.env.local` | Environment config |
| `RESEND_SETUP.md` | Full setup guide |
| `RESEND_CHECKLIST.md` | Step-by-step checklist |
| `RESEND_MONITORING.md` | Debugging & monitoring |

---

## Endpoints

```
POST /api/documents/email/invoice/abc123
POST /api/documents/email/quotation/abc123
POST /api/documents/email/cash-sale/abc123
POST /api/documents/email/delivery-note/abc123
POST /api/documents/email/purchase-order/abc123
POST /api/documents/email/receipt/abc123
```

Request:
```json
{
  "recipientEmail": "client@example.com",
  "recipientName": "John Doe"
}
```

Response:
```json
{
  "success": true,
  "resendId": "email-123456"
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "API key not set" | Add `RESEND_API_KEY` to `.env.local` → Restart server |
| Email not sending | Run test script: `node scripts/test-resend.js` |
| Email not arriving | Check Resend Logs at https://resend.com/dashboard |
| Sandbox restrictions | Add recipient in Resend → Testing |
| Domain issues | Verify DNS in Resend → Domains |

---

## Resend Dashboard

- **Logs**: https://resend.com/dashboard → See all sent emails
- **Domains**: Manage verified domains and SPF/DKIM
- **API Keys**: https://resend.com/settings
- **Pricing**: Always free tier available
- **Status**: https://status.resend.com

---

## Database

```sql
-- View all emails sent
SELECT * FROM DocumentEmailLog
ORDER BY createdAt DESC;

-- Failed emails
SELECT * FROM DocumentEmailLog
WHERE status = 'failed';

-- Rate check (emails past hour)
SELECT COUNT(*) FROM DocumentEmailLog
WHERE createdAt >= NOW() - INTERVAL '1 hour'
AND userId = 'user-id';
```

---

## Features

✅ Send PDFs via email  
✅ Include sender name  
✅ Personalize email (recipient name)  
✅ Professional HTML template  
✅ View link in email  
✅ Plain text fallback  
✅ Email logging & tracking  
✅ Rate limiting (10/hour)  
✅ Error reporting  
✅ Guest sharing support  

---

## Supported Documents

- Invoices
- Quotations
- Cash Sales
- Delivery Notes
- Purchase Orders
- Receipts

---

## Security

✓ Email validation  
✓ Payment verification (paid only)  
✓ Rate limiting  
✓ Secure tokens  
✓ Guest support  
✓ Logging for audit trail  

---

## Monitoring

```bash
# Watch for email events
npm run dev
# Look for: email_sent, email_send_failed

# Check rate limiting
SELECT COUNT(*) FROM DocumentEmailLog
WHERE userId = 'x' AND createdAt >= NOW() - '1 hour'::interval;

# View bounces
# https://resend.com/dashboard → Logs → "Bounced"
```

---

## Cost

- **Resend**: Free tier includes 100 emails/day, unlimited domains
- **Invopap**: No additional costs

---

## Need More Info?

- **Setup**: See [RESEND_SETUP.md](RESEND_SETUP.md)
- **Checklist**: See [RESEND_CHECKLIST.md](RESEND_CHECKLIST.md)
- **Debug**: See [RESEND_MONITORING.md](RESEND_MONITORING.md)
- **Implementation**: See [RESEND_IMPLEMENTATION.md](RESEND_IMPLEMENTATION.md)
- **Resend Docs**: https://resend.com/docs

---

**Status**: ✅ Ready to use - Infrastructure already built  
**Next Step**: Get API key and set `.env.local`
