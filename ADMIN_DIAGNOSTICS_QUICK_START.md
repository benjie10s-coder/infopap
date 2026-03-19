# Admin Dashboard Quick Start Diagnostic Guide

## 🎯 Start Here

You have **missing payments** and **incorrect subscriber records** showing in your admin dashboard. This guide will help you diagnose and fix the data accuracy issues.

---

## 📁 What You Have

I've created **3 diagnostic tools** to help you identify problems:

### 1. **Main Comprehensive Plan** 
📄 **[ADMIN_DASHBOARD_DIAGNOSTIC_PLAN.md](ADMIN_DASHBOARD_DIAGNOSTIC_PLAN.md)**
- Complete root cause analysis
- Data flow architecture explanation
- 5 phases of diagnostics and fixes
- Testing scenarios
- Full implementation checklist

### 2. **SQL Audit Queries** 
📋 **[ADMIN_AUDIT_QUERIES.sql](ADMIN_AUDIT_QUERIES.sql)**
- Copy-paste queries to run in Supabase SQL editor
- Organized into 5 sections:
  - Payment audit (all document types)
  - Subscription audit
  - Consistency checks
  - Data quality summary
  - Recommended fixes
- Safe to run (read-only by default)

### 3. **Data Integrity Checker** 
⚙️ **[lib/admin/data-integrity-checker.ts](lib/admin/data-integrity-checker.ts)**
- Automated checks run on-demand
- TypeScript utility you can use in code
- Available via new API endpoint: `/api/admin/data-integrity`

### 4. **Integrity API Endpoint** 
🔌 **[app/api/admin/data-integrity/route.ts](app/api/admin/data-integrity/route.ts)**
- GET endpoint that returns JSON integrity report
- Auth: Same as other admin endpoints (Bearer token)
- Response includes: issues, metrics, recommendations

---

## 🚀 Start the Diagnostic Process (Right Now)

### **Step 1: Quick Test (5 minutes)**

Open your browser console while logged into admin dashboard:

```javascript
// Test if checker works
fetch('/api/admin/data-integrity', {
  headers: {
    'Authorization': `Bearer ${sessionStorage.getItem('adminSecret')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Data Quality Score:', data.summary.dataQualityScore, '/100');
  console.log('Issues Found:', data.summary.totalIssues);
  console.log('Issues:', data.issues);
  console.tabulate(data.metrics);
})
.catch(e => console.error('API call failed:', e));
```

This will show:
- ✅ Quality score (0-100)
- ❌ Any critical issues found
- 📊 Summary metrics

### **Step 2: Deep Audit (15 minutes)**

Go to **Supabase Dashboard** → **SQL Editor** and run:

1. Copy the entire contents of **[ADMIN_AUDIT_QUERIES.sql](ADMIN_AUDIT_QUERIES.sql)**
2. Paste into Supabase SQL editor
3. Run each section one by one:
   - **Section 1**: Payment audit
   - **Section 2**: Subscription audit
   - **Section 3**: Consistency checks
   - **Section 4**: Data quality summary

**Look for:**
- ❌ Any ACTIVE subscriptions with `cancelledAt` (MAJOR BUG)
- ❌ ACTIVE subscriptions without completed payments
- ⚠️ PENDING subscriptions older than 24 hours
- ⚠️ Lots of INITIATED payments (waiting for callbacks)

### **Step 3: Identify Your Specific Issues**

Based on what you find, decide which fixes to apply:

| Issue Found | Fix Location in Plan |
|---|---|
| Cancelled subs showing as active | **Fix 3** in Phase 3 |
| PENDING subs older than 24h | **Fix 2** in Phase 3 |
| Payment records not syncing | **Fix 4** in Phase 3 |
| No reconciliation running | **Fix 1** in Phase 3 (CRITICAL) |
| Wrong stats displayed | **Fix 5** in Phase 3 |

---

## 🔧 Most Likely Fixes You Need

### If you have 0 pending recurring subscriptions but they show as "active":

**The Problem:** Cancelled payment records showing as active subscribers

**The Fix:** Run this SQL in Supabase:
```sql
-- First, verify this is the issue
SELECT COUNT(*) FROM Subscription 
WHERE status = 'ACTIVE' AND cancelledAt IS NOT NULL;

-- If count > 0, fix it:
UPDATE Subscription
SET status = 'CANCELLED'
WHERE status = 'ACTIVE'
AND cancelledAt IS NOT NULL;
```

### If you have recent payments but they're not in the admin list:

**The Problem:** Payments exist but may not be fully processed or indexed

**The Fix:**
1. Check if reconciliation job is running
2. If not, set up the cron job (see Phase 3, Fix 1)
3. Run reconciliation now (temporary):
```javascript
// In browser console on admin page
fetch('/api/admin/reconcile-payments', {
  method: 'POST',
  headers: {
    'x-admin-secret': sessionStorage.getItem('adminSecret')
  }
}).then(r => r.json()).then(console.log);
```

### If you see LOTS of INITIATED/PENDING payments:

**The Problem:** M-Pesa callbacks never arrived, reconciliation not running

**The Fix:**
1. Enable reconciliation job (Fix 1, Phase 3)
2. Manually run it now to catch up with old payments
3. This will query Daraja to confirm real status of each payment

---

## 📊 Metrics to Track Daily

Once you've fixed the issues, monitor these metrics:

```javascript
// Paste in browser console daily
fetch('/api/admin/data-integrity', {
  headers: { 'Authorization': `Bearer ${sessionStorage.getItem('adminSecret')}` }
})
.then(r => r.json())
.then(d => {
  console.log(`%c=== Daily Integrity Check ===`, 'font-weight: bold');
  console.log(`Quality: ${d.summary.dataQualityScore}/100 ${d.summary.dataQualityScore >= 95 ? '✅' : '⚠️'}`);
  console.log(`Issues: ${d.summary.totalIssues}`);
  console.log(`Active Subs: ${d.metrics.activeSubscriptions}`);
  console.log(`Completed Payments: ${d.metrics.completedPayments}`);
  console.table(d.recommendations);
});
```

**Target metrics:**
- ✅ Quality Score: **95+/100**
- ✅ Critical Errors: **0**
- ✅ Warnings: **0-2**
- ✅ All payments either COMPLETED or processed by reconciliation

---

## 🔄 Ongoing Setup (One Time)

### Set Up Automatic Reconciliation

This is your **#1 priority** to prevent future issues. The reconciliation job needs to run every 5 minutes to catch delayed M-Pesa callbacks.

**Option A: Railway (if you host there)**
1. Project → Settings → Add Cron Job
2. **URL:** `https://your-domain.com/api/admin/reconcile-payments`
3. **Method:** POST
4. **Header:** `x-admin-secret: <ADMIN_SECRET>`
5. **Schedule:** `*/5 * * * *`
6. **Save**

**Option B: External Service (Uptime Robot, EasyCron)**
1. Create new "Check"
2. **Method:** POST
3. **URL:** `https://your-domain.com/api/admin/reconcile-payments`
4. **Custom Headers:** `x-admin-secret: <ADMIN_SECRET>`
5. **Interval:** 5 minutes

**Option C: Manual Until Set Up**
Run this in your admin terminal every 5 minutes:
```bash
curl -X POST https://your-domain.com/api/admin/reconcile-payments \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"
```

---

## 📋 Checklist: What to Do Now

- [ ] **Read** [ADMIN_DASHBOARD_DIAGNOSTIC_PLAN.md](ADMIN_DASHBOARD_DIAGNOSTIC_PLAN.md) (Phase 1 for context)
- [ ] **Test** `/api/admin/data-integrity` endpoint in browser
- [ ] **Run** SQL audit queries from [ADMIN_AUDIT_QUERIES.sql](ADMIN_AUDIT_QUERIES.sql)
- [ ] **Identify** which issues affect you
- [ ] **Apply** the fixes from Phase 3 of the plan
- [ ] **Set up** automatic reconciliation job (CRITICAL)
- [ ] **Test** with a real payment to verify everything works
- [ ] **Monitor** daily using the data integrity checker
- [ ] **Document** your setup (for future reference)

---

## 🆘 If You Get Stuck

### "The endpoint returns 401 Unauthorized"
→ Check your `ADMIN_SECRET` is set in `.env`
→ Restart your dev server after adding it

### "The SQL queries show issues but I can't run the fixes"
→ You may lack database permissions. Contact Supabase support or use a different user role.

### "I ran the fixes but data still looks wrong"
→ The reconciliation job may need to run. Check if you have it set up.
→ Run the data integrity checker again: `fetch('/api/admin/data-integrity', ...)`

### "Stats are still showing wrong numbers after fixes"
→ The `get_platform_stats` RPC function may need updating
→ See: Phase 3, Fix 5 in comprehensive plan

---

## 📞 Key API Endpoints

Once set up, these are your daily-use endpoints:

```bash
# Check data integrity (read-only)
GET /api/admin/data-integrity
Header: Authorization: Bearer <secret>

# Trigger payment reconciliation (idempotent, safe to run often)
POST /api/admin/reconcile-payments
Header: x-admin-secret: <secret>

# List all payments
GET /api/admin/payments
Header: Authorization: Bearer <secret>

# List all subscriptions  
GET /api/admin/subscriptions
Header: Authorization: Bearer <secret>

# View platform stats
GET /api/admin/stats
Header: Authorization: Bearer <secret>
```

---

## 🎓 Final Notes

- **All fixes are non-destructive**: You can safely run diagnostics without changing data
- **Read-first approach**: Run queries first, understand results, then apply fixes
- **Idempotent operations**: The reconciliation job can run 100 times safely (won't create duplicates)
- **Backup first**: If possible, backup your Supabase database before running SQL updates
- **Monitor going forward**: Use the integrity checker weekly to catch issues early

---

**You're ready! Start with the quick test above. 🚀**
