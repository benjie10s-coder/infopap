# Resend Email Setup Guide

This document guides you through setting up Resend for email sharing on Invopap.

## Prerequisites

- A Resend account (free tier available at https://resend.com)
- A custom domain (optional but recommended for production)

---

## Step 1: Create Resend Account & Get API Key

1. Go to [resend.com](https://resend.com)
2. Click "Sign Up" and create your account
3. Verify your email
4. In the dashboard, go to **Integrations** → **API Keys** (or **Settings** → **API Keys**)
5. Click "Create API Key" and name it "Invopap"
6. Copy the key (starts with `re_`)

---

## Step 2: Configure Email Domain

### Option A: Development/Testing (Fastest)

Use the Resend sandbox email for testing:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Invopap
```

Recipients must be verified emails in your Resend account for sandbox testing. See "Add Recipient Email" below.

### Option B: Production (Recommended)

Configure your own domain:

1. In Resend dashboard, go to **Domains**
2. Click "Add Domain"
3. Enter your domain (e.g., `documents.yourdomain.com` or `mail.yourdomain.com`)
4. Follow the DNS verification steps:
   - Add the provided CNAME or TXT records to your domain's DNS settings
   - Wait 5-10 minutes for DNS to propagate
5. Once verified, copy the verified email address shown in Resend
6. Update your environment variables:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=documents@yourdomain.com
RESEND_FROM_NAME=Invopap Documents
```

---

## Step 3: Add Recipient Email (Development/Sandbox)

If using sandbox testing, authorized recipients must be pre-verified:

1. In Resend dashboard, go to **Testing** or **Receivers**
2. Add recipient email addresses you want to test with
3. Those emails will receive emails from `onboarding@resend.dev`

---

## Step 4: Set Environment Variables

### Local Development

Create `.env.local` in project root:

```env
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Invopap
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Deployment

Set these in your deployment platform (Railway, Vercel, etc.):

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=documents@yourdomain.com
RESEND_FROM_NAME=Invopap Documents
```

---

## Step 5: Test Email Sending

### Using the Test Script

Run the test script from project root:

```bash
node scripts/test-resend.js
```

### Manual Testing

1. **In Development:**
   - Open a document in your app
   - Click "Share" → "Email"
   - Enter a verified test email address
   - Click "Send"
   - Check email in a few seconds

2. **Watch Logs:**
   ```bash
   npm run dev
   # Look for "email_sent" or "email_send_failed" logs
   ```

3. **Check Resend Dashboard:**
   - Go to **Logs** in Resend dashboard
   - You should see your sent emails listed
   - Check delivery status and any bounces

---

## Step 6: Features & Capabilities

Your email sharing implementation includes:

✅ **PDF Attachment** - Documents sent as PDF with sender name  
✅ **Rich HTML Email** - Professional branded email template  
✅ **Recipient Personalization** - Optional recipient name support  
✅ **View Online Link** - Link to view document online  
✅ **Email Logging** - All sent/failed emails logged in database  
✅ **Rate Limiting** - 10 emails per hour per user/session  
✅ **Error Handling** - Detailed error messages and recovery  

---

## Supported Document Types

The following documents can be emailed:

- Invoices
- Quotations
- Cash Sales
- Delivery Notes
- Purchase Orders
- Receipts

---

## Troubleshooting

### Email Not Sending

1. **Check API Key:**
   ```bash
   # Verify RESEND_API_KEY is set
   echo $RESEND_API_KEY
   ```

2. **Check Logs:**
   - Look for "email_send_failed" in application logs
   - Check Resend dashboard → Logs for detailed error

3. **Verify Domain/Email:**
   - For sandbox: ensure recipient is added in Resend
   - For production: ensure domain is verified (green checkmark in Resend)

4. **Rate Limit:**
   - Check `DocumentEmailLog` table in Supabase
   - 10 emails per hour per user is the default limit

### Emails Going to Spam

1. **Configure SPF/DKIM:**
   - Resend provides SPF and DKIM records during domain setup
   - Ensure these are properly added to your DNS

2. **Use Reply-To Header:**
   - Modify email template to include Reply-To header
   - Helps with email authentication

### Database Setup for Logs

Ensure the `DocumentEmailLog` table exists in Supabase:

```sql
CREATE TABLE DocumentEmailLog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentType VARCHAR NOT NULL,
  documentId UUID NOT NULL,
  publicId VARCHAR NOT NULL,
  userId UUID REFERENCES auth.users(id),
  guestSessionId VARCHAR,
  recipientEmail VARCHAR NOT NULL,
  recipientName VARCHAR,
  senderEmail VARCHAR,
  subject VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  resendId VARCHAR,
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Send Email

**POST** `/api/documents/email/{type}/{publicId}`

```bash
curl -X POST http://localhost:3000/api/documents/email/invoice/abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "client@example.com",
    "recipientName": "John Doe"
  }'
```

Response:
```json
{
  "success": true,
  "resendId": "email-id-123"
}
```

---

## Environment Variable Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `RESEND_API_KEY` | Yes (for email) | `re_xxx` | Get from Resend dashboard |
| `RESEND_FROM_EMAIL` | Yes | `onboarding@resend.dev` | Must be verified domain |
| `RESEND_FROM_NAME` | No | `Invopap Documents` | Sender name in email |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Used in email links |

---

## Support

- Resend Docs: https://resend.com/docs
- Resend Status: https://status.resend.com
- Report Issues: Check logs in Resend dashboard
