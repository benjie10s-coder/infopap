# Resend Setup Checklist

Complete these steps to enable email sharing in Invopap.

## Phase 1: Resend Account Setup (5-10 minutes)

- [ ] Go to https://resend.com
- [ ] Create account and verify email
- [ ] Navigate to API Keys / Integrations
- [ ] Create new API key named "Invopap"
- [ ] Copy the API key (starts with `re_`)

## Phase 2: Environment Configuration (2 minutes)

### Development Setup
- [ ] Create/update `.env.local` in project root
- [ ] Add:
  ```env
  RESEND_API_KEY=re_xxxxxxxxxxxxx
  RESEND_FROM_EMAIL=onboarding@resend.dev
  RESEND_FROM_NAME=Invopap Documents
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
- [ ] Restart dev server: `npm run dev`

### Production Setup
- [ ] In your deployment platform (Railway, Vercel, etc)
- [ ] Add `RESEND_API_KEY` secret
- [ ] Add `RESEND_FROM_EMAIL` variable
- [ ] Add `RESEND_FROM_NAME` variable
- [ ] Redeploy application

## Phase 3: Testing (2-5 minutes)

### Option A: Quick Test Script
```bash
node scripts/test-resend.js
# Or with your email:
node scripts/test-resend.js your-email@example.com
```
- [ ] Run test script
- [ ] Verify no errors in output
- [ ] Check email inbox for test message
- [ ] ✓ If received: Email is working!

### Option B: Manual Testing in App
- [ ] Open development app at http://localhost:3000
- [ ] Create or find an existing document
- [ ] Mark document as "Paid"
- [ ] Click "Share" button
- [ ] Select "Email" option
- [ ] Enter recipient email address
- [ ] Click "Send"
- [ ] Check recipient inbox for email
- [ ] ✓ If received: Email is working!

## Phase 4: Production Prep (Optional but Recommended)

### Set up Domain Email (Better Deliverability)

- [ ] Decide on email domain (e.g., `documents.yourdomain.com`)
- [ ] In Resend Dashboard → Domains
- [ ] Click "Add Domain"
- [ ] Enter your domain
- [ ] Copy DNS records provided by Resend
- [ ] Log into your domain registrar (GoDaddy, Cloudflare, etc)
- [ ] Add CNAME record(s) to DNS:
  ```
  Name: documents (or whatever subdomain)
  Value: [CNAME value from Resend]
  TTL: 3600
  ```
- [ ] Wait 5-30 minutes for DNS propagation
- [ ] Return to Resend dashboard
- [ ] Click "Verify Domain"
- [ ] Once verified, copy the verified email address
- [ ] Update `.env.local` and production env:
  ```env
  RESEND_FROM_EMAIL=documents@yourdomain.com
  ```
- [ ] Redeploy and test again

### Monitor Email Health
- [ ] Sign into Resend dashboard regularly
- [ ] Check **Logs** → Review sent emails
- [ ] Monitor **Bounces** → Identify invalid recipients
- [ ] Watch **Domains** → Ensure domain is verified
- [ ] Set up email alerts if available

## Phase 5: Verification Checklist

- [ ] ✓ API key is working (no errors from test script)
- [ ] ✓ Email sends without errors
- [ ] ✓ Email arrives in recipient inbox
- [ ] ✓ Email displays correctly
- [ ] ✓ PDF attachment is present
- [ ] ✓ Recipient can view document online via email link
- [ ] ✓ Resend dashboard shows successful send
- [ ] ✓ Database logs email in `DocumentEmailLog`

## Troubleshooting

### Test Script Fails
```
❌ RESEND_API_KEY environment variable is not set!
```
**Solution**: Add `RESEND_API_KEY` to `.env.local` and restart server

### "Email service not configured" Error
```
Email service not configured. Set RESEND_API_KEY environment variable.
```
**Solution**: 
1. Check `.env.local` has `RESEND_API_KEY`
2. Restart dev server: `npm run dev`
3. Check logs for environment variable issues

### Email Doesn't Arrive
1. Check Resend Dashboard → Logs
   - Should show "Sent" status
   - Look for error messages
2. If using sandbox (`onboarding@resend.dev`):
   - Recipient email must be pre-verified in Resend
   - Go to Resend → Testing → add recipient email
3. Check spam/junk folder
4. Verify domain is properly set up (if using custom domain)

### Email Goes to Spam
- If using custom domain: ensure SPF/DKIM records are added to DNS
- Resend provides these records during domain setup
- Allow 24-48 hours for email reputation to build
- Consider warming up domain (gradually increase volume)

### Rate Limit Errors
```
Rate limit exceeded: 10 emails per hour
```
**Solution**:
- Each user gets 10 emails/hour
- Check `DocumentEmailLog` in Supabase
- Contact admin if genuine need for higher limits

## Important Notes

⚠️ **Sandbox Email Warning:**
- `onboarding@resend.dev` is for development only
- Recipient must be pre-added in Resend dashboard
- Cannot email random addresses
- Perfect for testing with team emails

⚠️ **Domain Deliverability:**
- Custom domain improves email deliverability
- Takes 5-30 minutes to verify DNS
- SPF/DKIM records are essential for production
- Monitor bounce rates in Resend dashboard

⚠️ **Document Access:**
- Documents must be marked as "Paid" to share
- Unpaid documents cannot be emailed
- Share tokens don't expire automatically
- View links are public-accessible

## Success! 🎉

Once all checkboxes are complete, your platform is ready for email sharing:

✅ Users can click "Share" → "Email"  
✅ Download PDFs of documents  
✅ Send documents to clients  
✅ Clients receive professional emails  
✅ Recipients can view documents online  

## Next Steps

1. **Enable for Users**: Announce email sharing feature
2. **Monitor**: Check Resend dashboard weekly for issues
3. **Optimize**: Customize email templates as needed
4. **Scale**: As volume increases, monitor deliverability
5. **Enhance**: Consider bounce handling, tracking, etc

---

**Questions?** See [RESEND_SETUP.md](../RESEND_SETUP.md) for detailed configuration guide.
