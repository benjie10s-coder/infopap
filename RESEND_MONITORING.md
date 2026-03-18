# Resend Monitoring & Debugging Guide

This guide helps you monitor and troubleshoot email delivery in your InvoSafi platform.

## 📊 Monitoring Dashboard

### Resend Dashboard
Visit: https://resend.com/dashboard

#### Logs Section
- **View All Sent Emails**: Logs → Email Logs
- **Status Indicators**:
  - 🟢 **Sent** - Email successfully sent to recipient
  - 🟡 **Delivered** - Email received by recipient's mail server
  - 🔴 **Bounced** - Email rejected (hard/soft bounce)
  - ⚠️ **Complained** - Recipient marked as spam
  - ❌ **Failed** - Send error

#### Bounces Section
- **Hard Bounces**: Invalid email addresses (permanent)
- **Soft Bounces**: Temporary issues (will retry)
- **Block List**: Emails that rejected your domain

#### Domain Status
- **Verified** 🟢 - Domain is operational
- **Pending** 🟡 - DNS records detected, awaiting confirmation
- **Failed** 🔴 - DNS records not found or incorrect
- **Unverified** ⚠️ - Domain not yet verified

---

## 📱 Application Logs

### Check Console Output
```bash
npm run dev
# Look for these log messages:
# ✓ email_sent - Successfully sent
# ✗ email_send_failed - Send error
# ⚠️ email_send_exception - Unexpected error
```

### Example Success Log
```
[info] email_sent {
  documentType: "invoice",
  publicId: "doc-123",
  recipientEmail: "client@example.com",
  resendId: "email-123456789"
}
```

### Example Error Log
```
[error] email_send_failed {
  documentId: "doc-123",
  recipientEmail: "invalid@",
  error: "Invalid email address format"
}
```

---

## 🗄️ Database Monitoring

### DocumentEmailLog Table

List all sent emails:
```sql
SELECT * FROM DocumentEmailLog
ORDER BY createdAt DESC
LIMIT 50;
```

Emails sent today:
```sql
SELECT * FROM DocumentEmailLog
WHERE createdAt >= NOW() - INTERVAL '1 day'
ORDER BY createdAt DESC;
```

Failed emails:
```sql
SELECT * FROM DocumentEmailLog
WHERE status = 'failed'
ORDER BY createdAt DESC;
```

Emails by user:
```sql
SELECT 
  userId,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent
FROM DocumentEmailLog
WHERE userId IS NOT NULL
GROUP BY userId
ORDER BY total_sent DESC;
```

Rate limit check (emails this hour):
```sql
SELECT 
  userId,
  COUNT(*) as emails_this_hour
FROM DocumentEmailLog
WHERE createdAt >= NOW() - INTERVAL '1 hour'
  AND userId = 'user-id-here'
GROUP BY userId;
```

Bounced/failed recipients:
```sql
SELECT DISTINCT recipientEmail, status, COUNT(*) as attempts
FROM DocumentEmailLog
WHERE status IN ('failed', 'bounced')
GROUP BY recipientEmail, status
ORDER BY attempts DESC;
```

---

## 🔍 Diagnosing Send Failures

### Step 1: Check Resend Dashboard Logs

Visit: https://resend.com/dashboard → Logs

Look for your email and note:
- Status (Sent, Failed, Bounced)
- Error message (if failed)
- Timestamp

### Step 2: Check Application Logs

From browser/terminal where app is running:
```
[error] email_send_failed {
  error: "Invalid email address format"
}
```

### Step 3: Check Database Log Entry

```sql
SELECT * FROM DocumentEmailLog
WHERE createdAt >= NOW() - INTERVAL '5 minutes'
ORDER BY createdAt DESC;
```

Look for the email entry with error details.

### Step 4: Common Error Messages

#### "Invalid email address"
```
Error: Invalid email address format
```
**Fix**: User entered invalid email. Validate in UI.

#### "Unauthorized - API key invalid"
```
Error: Unauthorized. Please provide a valid API key.
```
```bash
# Fix: Check API key
echo $RESEND_API_KEY
# Re-verify it's correct in .env.local or platform env vars
```

#### "Domains disabled"
```
Error: Domain does not have a valid SPF/DKIM configuration
```
**Fix**:
- Go to Resend → Domains
- Copy SPF and DKIM records
- Add to domain DNS
- Wait 5-30 minutes for verification
- Resend will auto-verify

#### "Rate limit exceeded - 10 emails per hour"
```
Error: Rate limit exceeded
```
```sql
-- Check user's emails this hour
SELECT COUNT(*) FROM DocumentEmailLog
WHERE userId = 'user-id'
  AND createdAt >= NOW() - INTERVAL '1 hour';
```

---

## 🚀 Email Delivery Best Practices

### 1. Domain Verification ✓
- [ ] Domain verified in Resend (green checkmark)
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] Monitor "Verified" status in Resend

### 2. Monitor Bounce Rates
```bash
# Soft bounces (temporary) - Resend retries automatically
# Hard bounces (permanent) - Consider removing from future sends
```

**Check bounces in Resend:**
Logs → Filter by "Bounced" status

### 3. Warm Up New Domains
New domains start with lower reputation. Gradually increase volume:

**Week 1**: Send 50-100 emails/day  
**Week 2**: Send 200-500 emails/day  
**Week 3**: Send 1000+ emails/day  

Monitor bounce rates stay below 2%.

### 4. Monitor Email Health Metrics

**Desired Ranges:**
- Delivery Rate: > 99%
- Bounce Rate: < 2%
- Complaint Rate: < 0.1%
- Spam Rate: < 0.1%

**Check in Resend Dashboard:**
- Settings → Analytics
- Logs → Review recent emails

### 5. Failed Email Handling

When email fails:
1. Log is stored in `DocumentEmailLog`
2. User sees error message in app
3. They can retry sending
4. Document remains available to share via link

---

## 📧 Email Content Debugging

### Test Email Template

Emails are generated in [lib/email.ts](../../lib/email.ts):  
- HTML template: `generateEmailHtml()`
- Plain text: `generatePlainText()`

### Check Template Variables

Email includes:
- Document type and number ✓
- Sender name ✓
- Recipient greeting ✓
- PDF attachment ✓
- View online link ✓
- Branding ✓

### Test with Sample Data

```bash
# Send to your own email
node scripts/test-resend.js your-email@example.com
```

Check email renders correctly:
- [ ] HTML displays properly
- [ ] Colors/styling visible
- [ ] Links are clickable
- [ ] PDF attachment present
- [ ] Subject line correct

---

## 🔐 Security Monitoring

### Track Who Shared What

```sql
SELECT 
  le.userId,
  COUNT(*) as documents_shared,
  COUNT(DISTINCT le.documentId) as unique_docs,
  MAX(le.createdAt) as last_share
FROM DocumentEmailLog le
GROUP BY le.userId
ORDER BY documents_shared DESC;
```

### Detect Unusual Activity

```sql
-- Users sending many emails (possible spam)
SELECT 
  userId,
  COUNT(*) as emails_sent,
  COUNT(DISTINCT recipientEmail) as unique_recipients,
  DATE_TRUNC('hour', createdAt) as hour
FROM DocumentEmailLog
WHERE createdAt >= NOW() - INTERVAL '24 hours'
GROUP BY userId, DATE_TRUNC('hour', createdAt)
HAVING COUNT(*) > 20
ORDER BY emails_sent DESC;
```

---

## 📊 Create Email Analytics View

### SQL to create analytics view

```sql
CREATE VIEW email_analytics AS
SELECT 
  DATE(createdAt) as send_date,
  status,
  documentType,
  COUNT(*) as count
FROM DocumentEmailLog
GROUP BY DATE(createdAt), status, documentType
ORDER BY send_date DESC;

-- Query recent stats
SELECT * FROM email_analytics
WHERE send_date >= CURRENT_DATE - INTERVAL '7 days';
```

---

## ⚙️ Configuration Check

### Verify All Settings

```bash
# Check if email is enabled
curl -s http://localhost:3000/api/health | jq '.email.enabled'

# Check config values (don't expose API key)
echo "From Email: $RESEND_FROM_EMAIL"
echo "From Name: $RESEND_FROM_NAME"
echo "API Key set: $([ -n "$RESEND_API_KEY" ] && echo 'Yes' || echo 'No')"
```

### Environment Variables

```bash
# In development
cat .env.local | grep RESEND

# In production (varies by platform)
# Railway: Settings → Environment
# Vercel: Settings → Environment Variables
# Render: Environment
```

---

## 🆘 Getting Help

### From Resend Support
1. Visit https://resend.com/support
2. Check status: https://status.resend.com
3. Email support: support@resend.com

### From Your App
1. Check recent error logs
2. Review `DocumentEmailLog` table
3. Test with `node scripts/test-resend.js`
4. Check browser console for client-side errors

### Common Resources
- Resend Docs: https://resend.com/docs
- Email troubleshooting: https://resend.com/docs/frequently-asked-questions
- Status page: https://status.resend.com

---

## 📝 Maintenance Checklist

### Weekly
- [ ] Check bounce rate in Resend
- [ ] Review failed emails in database
- [ ] Verify domain status is "Verified" 🟢

### Monthly
- [ ] Analyze email send patterns
- [ ] Check delivery rates > 99%
- [ ] Review DocumentEmailLog table size
- [ ] Archive old logs if needed

### Quarterly
- [ ] Review email template design
- [ ] Check domain reputation
- [ ] Analyze user feedback on emails
- [ ] Plan domain warmup if expanding

---

**Questions?** Check app logs with `npm run dev` or contact Resend support.
