# Resend Integration Summary

Your InvoSafi platform has a complete email sharing system already implemented with Resend. Here's what's set up:

## ✅ What's Already Implemented

### Email Infrastructure
- **Email Service**: Resend API v6.9.2
- **Email Sending**: Full PDF document delivery with attachments
- **HTML Templates**: Professional, branded email templates
- **Plain Text Fallback**: Accessible plain text alternatives
- **Rate Limiting**: 10 emails/hour per user/session
- **Email Logging**: All sends tracked in `DocumentEmailLog` table
- **Error Handling**: Comprehensive error messages and recovery

### UI/UX Components
- **Share Modal**: Multi-channel document sharing (Email, WhatsApp, Link, Download)
- **Email Form**: Recipient email and name input with validation
- **Success/Error States**: User feedback for all operations
- **Link Generation**: Shareable link generation with token-based access
- **WhatsApp Integration**: One-click share to WhatsApp

### Document Support
- ✓ Invoices
- ✓ Quotations
- ✓ Cash Sales
- ✓ Delivery Notes
- ✓ Purchase Orders
- ✓ Receipts

### API Endpoints
- `POST /api/documents/email/{type}/{publicId}` - Send document via email
- `POST /api/documents/share/{type}/{publicId}` - Generate/retrieve share link
- `GET /api/documents/shared/{token}` - Access shared documents

## 🚀 Quick Start

### 1. Get Resend API Key
```
Visit https://resend.com → Sign up → Create API Key
```

### 2. Set Environment Variables
```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=InvoSafi Documents
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Test It
```bash
node scripts/test-resend.js
# Or with specific email:
node scripts/test-resend.js your-email@example.com
```

### 4. Try In App
1. Open a document in your app
2. Click "Share" button
3. Select "Email"
4. Enter recipient email
5. Send!

## 📁 Key Files

| File | Purpose |
|------|---------|
| [lib/email.ts](lib/email.ts) | Email service & Resend client |
| [components/ShareModal.tsx](components/ShareModal.tsx) | Share UI component |
| [app/api/documents/email/\[type\]/\[publicId\]/route.ts](app/api/documents/email/[type]/[publicId]/route.ts) | Email endpoint |
| [app/api/documents/share/\[type\]/\[publicId\]/route.ts](app/api/documents/share/[type]/[publicId]/route.ts) | Share link endpoint |
| [RESEND_SETUP.md](RESEND_SETUP.md) | Detailed setup guide |

## 🔧 Configuration Options

### Development (Sandbox)
```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=InvoSafi
```
✓ Free  
✓ No domain needed  
✗ Email recipients must be pre-verified

### Production (Verified Domain)
```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=documents@yourdomain.com
RESEND_FROM_NAME=InvoSafi Documents
```
✓ Send to any email  
✓ Professional domain  
✗ Requires domain verification

## 📊 Database Schema

### DocumentEmailLog Table
```sql
CREATE TABLE DocumentEmailLog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentType VARCHAR,           -- "invoice", "quotation", etc
  documentId UUID,
  publicId VARCHAR,
  userId UUID,
  guestSessionId VARCHAR,
  recipientEmail VARCHAR,
  recipientName VARCHAR,
  senderEmail VARCHAR,
  subject VARCHAR,
  status VARCHAR,                 -- "sent", "failed", "delivered", "bounced"
  resendId VARCHAR,               -- Resend's email ID
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Security Features

- ✓ Email validation before send
- ✓ Payment verification (must be paid to share)
- ✓ Share token expiration tracking
- ✓ Rate limiting per user/session
- ✓ PDF generation with no watermark on email
- ✓ Secure view tokens for shared links
- ✓ Guest session support for non-authenticated sharing

## 🧪 Testing

### Test Email Endpoint (Development)
File: [scripts/test-resend.js](scripts/test-resend.js)

```bash
# Basic test
node scripts/test-resend.js

# Test with specific email
node scripts/test-resend.js recipient@example.com

# Expected output:
# ✓ Email sent successfully!
# 📬 Resend Email ID: email-id-123
```

### Manual Testing in App
1. Create a document (Invoice, Quotation, etc)
2. Mark as paid
3. Click Share → Email
4. Enter recipient email
5. Check inbox for email

## 📋 Debugging

### Email not sending?
1. Check logs: `npm run dev` → look for "email_sent" or "email_send_failed"
2. Verify API key: `echo $RESEND_API_KEY`
3. Check app domain verification in Resend dashboard
4. For sandbox: ensure recipient email is in Resend's verified list

### Emails going to spam?
1. Configure SPF/DKIM records (Resend provides during domain setup)
2. Use a verified domain (not sandbox email)
3. Add Reply-To header in email template
4. Monitor bounce rates in Resend dashboard

### Rate limiting issues?
1. Check `DocumentEmailLog` table in Supabase
2. Default: 10 emails/hour per user
3. Adjust limit in [lib/email.ts](lib/email.ts) → `checkEmailRateLimit()` function

## 🔗 Resources

- **Resend Docs**: https://resend.com/docs
- **Setup Guide**: See [RESEND_SETUP.md](RESEND_SETUP.md)
- **Status Page**: https://status.resend.com
- **Pricing**: https://resend.com/pricing

## 🎯 What's Next?

### Optional Enhancements
1. **Domain Warmup** - Gradually increase email volume for new domains
2. **Bounce Handling** - Auto-remove bounced emails from recipient list
3. **Email Templates** - Customize templates for different document types
4. **Tracking Pixels** - Add open/click tracking (Resend supports this)
5. **Scheduled Emails** - Queue emails for future delivery
6. **Batch Sending** - Send to multiple recipients at once
7. **Custom Reply-To** - Allow recipients to reply to document sender

### For Admins
- Monitor email logs in Supabase dashboard
- Check Resend logs for bounces/blocks
- Set up email alerts for failed sends
- Review email engagement metrics

---

**Need help?** Check [RESEND_SETUP.md](RESEND_SETUP.md) for the complete setup guide.
