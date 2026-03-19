# Admin Dashboard Improvement Implementation Checklist

**Date Started:** ___________  
**Target Completion:** ___________  
**Owner:** ___________

---

## 🎯 Phase 1: Diagnosis (Do This First)

- [ ] **Read** [ADMIN_DIAGNOSTICS_QUICK_START.md](ADMIN_DIAGNOSTICS_QUICK_START.md) (10 min)
- [ ] **Run** `/api/admin/data-integrity` test in browser console
  - Note result: Data Quality Score = ___/100
  - Errors found: ___
- [ ] **Run** SQL audit queries from [ADMIN_AUDIT_QUERIES.sql](ADMIN_AUDIT_QUERIES.sql)
  - [ ] Section 1: Payment audit
  - [ ] Section 2: Subscription audit  
    - Active subscriptions with `cancelledAt` date: ___ (should be 0)
    - Pending subscriptions older than 24h: ___ 
  - [ ] Section 3: Consistency checks
    - Active subs without completed payment: ___ (should be 0)
  - [ ] Section 4: Data quality summary

**Issues Found:**
- [ ] Problem 1: _________________________________
- [ ] Problem 2: _________________________________
- [ ] Problem 3: _________________________________

---

## 🔧 Phase 2: Critical Fixes (Apply in Order)

### Fix #1: Set Up Reconciliation Job (MANDATORY)

**Status:** ☐ Not Started | ☐ In Progress | ☐ Completed

This is your #1 priority. Without it, payment/subscription sync will keep breaking.

**Choose one option:**

#### Option A: Railway Cron (Recommended if hosting on Railway)
- [ ] Go to Railway Dashboard → Project → Settings
- [ ] Click "Add Cron Job"
- [ ] **URL:** `https://<your-domain>/api/admin/reconcile-payments`
- [ ] **Method:** POST
- [ ] **Headers:** `x-admin-secret: <ADMIN_SECRET>`
- [ ] **Schedule:** `*/5 * * * *`
- [ ] Save and deploy
- [ ] **Test:** Verify cron appears in logs within 5 minutes

#### Option B: External Service (Uptime Robot, EasyCron, etc.)
- [ ] Service: _____________________
- [ ] Login URL: _____________________
- [ ] Created cron job: Date _______ Time _______
- [ ] Configured POST to: `https://<your-domain>/api/admin/reconcile-payments`
- [ ] Headers set correctly
- [ ] Schedule: Every 5 minutes
- [ ] **Test:** Check logs for execution

#### Option C: Manual (Temporary until automated)
- [ ] Created bash script at: ___________________
- [ ] Running manually every day: ☐ Yes ☐ No (not ideal)
- [ ] **Note:** Switch to Option A or B as soon as possible

**Verification:**
- [ ] Ran reconciliation once manually
- [ ] Command: `curl -X POST https://<domain>/api/admin/reconcile-payments -H "x-admin-secret: <SECRET>"`
- [ ] Response status: _____ (200 = success)
- [ ] Check logs for result: `reconciliation_start` → `reconciliation_complete`

---

### Fix #2: Clean Up Stale Pending Subscriptions

**Status:** ☐ Not Started | ☐ In Progress | ☐ Completed

**Prerequisite:** Complete Fix #1 first

**Step 1: Verify the issue exists**
```sql
SELECT COUNT(*) as stale_pending
FROM Subscription
WHERE status = 'PENDING'
AND createdAt < NOW() - INTERVAL '24 hours';
```
Result: _____ pending (if 0, skip this fix)

**Step 2: Backup (optional but recommended)**
- [ ] Exported Subscription table data
- [ ] Saved to: ___________________

**Step 3: Run the fix**
```sql
UPDATE Subscription
SET status = 'EXPIRED'
WHERE status = 'PENDING'
AND createdAt < NOW() - INTERVAL '24 hours'
AND NOT EXISTS (
  SELECT 1 FROM SubscriptionPayment 
  WHERE checkoutRequestId = Subscription.checkoutRequestId 
  AND status = 'COMPLETED'
);
```

- [ ] Executed in Supabase SQL editor
- [ ] Rows affected: _____
- [ ] Verified new state: All old PENDING now EXPIRED

---

### Fix #3: Fix Cancelled Subscriptions Still Marked ACTIVE

**Status:** ☐ Not Started | ☐ In Progress | ☐ Completed

**Step 1: Verify the issue exists**
```sql
SELECT COUNT(*) as cancelled_but_active
FROM Subscription
WHERE status = 'ACTIVE'
AND cancelledAt IS NOT NULL;
```
Result: _____ subscriptions (if 0, skip this fix)

**Step 2: Run the fix**
```sql
UPDATE Subscription
SET status = 'CANCELLED'
WHERE status = 'ACTIVE'
AND cancelledAt IS NOT NULL;
```

- [ ] Executed in Supabase SQL editor
- [ ] Rows affected: _____
- [ ] Verified: No more ACTIVE subs with cancelledAt

---

### Fix #4: Validate Payment ↔ Subscription Consistency

**Status:** ☐ Not Started | ☐ In Progress | ☐ Completed

This is a diagnostic fix that identifies any remaining mismatches.

**Step 1: Create validation view (one-time)**
```sql
CREATE OR REPLACE VIEW subscription_payment_check AS
SELECT 
  s.id, s.userId, s.status, s.checkoutRequestId,
  COALESCE(p.status, 'NONE') as payment_status,
  CASE
    WHEN s.status = 'ACTIVE' AND (p.status IS NULL OR p.status != 'COMPLETED') 
    THEN 'ERROR: Active but no complete payment'
    ELSE 'OK'
  END as status
FROM Subscription s
LEFT JOIN SubscriptionPayment p ON s.checkoutRequestId = p.checkoutRequestId;
```

- [ ] View created successfully

**Step 2: Check for issues**
```sql
SELECT * FROM subscription_payment_check
WHERE status LIKE 'ERROR%';
```

Issues found: _____ 
List them: _________________________________

**Step 3: Remediate (if any found)**
- [ ] For each error, investigate the specific subscription
- [ ] Contact user? ☐ Yes ☐ No
- [ ] Manual payment refund needed? ☐ Yes ☐ No
- [ ] Notes: _________________________________

---

### Fix #5: Verify Admin Stats RPC Function

**Status:** ☐ Not Started | ☐ In Progress | ☐ Completed

**Step 1: Check current function**
Go to Supabase → Functions → Search for `get_platform_stats`

- [ ] Function exists
- [ ] Current implementation:
  ```
  <paste the function code here>
  ```

**Step 2: Verify it counts correctly**

Test query:
```sql
SELECT 
  COUNT(*) as active_count FROM Subscription WHERE status = 'ACTIVE'
UNION ALL
SELECT 
  SUM(amountPaid) as revenue FROM Subscription WHERE status = 'ACTIVE';
```

Expected from function: 
- Active subscribers: _____
- Revenue: KSH _____

Actual from test queries:
- Active subscribers: _____
- Revenue: KSH _____

- [ ] Numbers match ✅
- [ ] Numbers don't match ⚠️ Update function needed

**Step 3: Update function (if needed)**
- [ ] Function updated to only count status='ACTIVE'
- [ ] Function updated to only sum amountPaid WHERE status='ACTIVE'
- [ ] Tested again
- [ ] Numbers now match ✅

---

## ✅ Phase 3: Verify Fixes Worked

- [ ] Run `/api/admin/data-integrity` again
  - New Data Quality Score: ___/100
  - New error count: ___
  - Improvement: ___points

- [ ] Expected metrics (post-fix):
  - Active Subscribers: _____ (should match actual paid users)
  - ACTIVE subs with completed payments: 100% ✅
  - CANCELLED subs still ACTIVE: 0 ✅
  - PENDING subs older than 24h: < 5 ✅

- [ ] Manual test:
  - [ ] Create a test subscription
  - [ ] Complete M-Pesa payment
  - [ ] Wait 30-60 seconds
  - [ ] Verify admin dashboard shows it as ACTIVE
  - [ ] Verify revenue increased

---

## 🚀 Phase 4: Ongoing Monitoring (Setup Once)

- [ ] **Daily Check (1 minute)**
  - Browser console: `fetch('/api/admin/data-integrity', ...).then(r=>r.json()).then(console.log)`
  - Screenshot Data Quality Score: Each morning at start
  
- [ ] **Weekly Deep Audit (every Monday)**
  - Run 1-2 SQL queries from audit suite
  - Check for new issues
  - Review reconciliation logs

- [ ] **Monthly Review (1st of month)**
  - Read through integrity report
  - Update this checklist status
  - Document any patterns/trends

---

## 📋 Final Sign-Off

- [ ] All critical fixes applied
- [ ] Data Quality Score ≥ 95/100
- [ ] No active errors in integrity report
- [ ] Reconciliation job running every 5 min
- [ ] Team trained on monitoring
- [ ] Documentation shared with team

**Final Status:** ☐ Complete ✅

**Signed by:** ___________________  
**Date:** ___________________  
**Notes:** ___________________________________

---

## 📞 Troubleshooting

**Problem:** Endpoint returns 401 Unauthorized
**Solution:**
- [ ] Check ADMIN_SECRET is set in .env
- [ ] Restart dev server
- [ ] Verify sessionStorage has correct token

**Problem:** SQL queries error "permission denied"
**Solution:**
- [ ] Use a Supabase user with admin/owner role
- [ ] Contact Supabase support if stuck

**Problem:** Reconciliation job not running
**Solution:**
- [ ] Check cron logs in Railway/service dashboard
- [ ] Verify URL is accessible: `curl https://<domain>/api/admin/health`
- [ ] Check ADMIN_SECRET in cron job config matches .env

**Problem:** Stats still wrong after fixes
**Solution:**
- [ ] Wait 5 minutes for reconciliation to catch up
- [ ] Clear browser cache / refresh admin page
- [ ] Re-run the data integrity check
- [ ] If still wrong, check `get_platform_stats` RPC (Fix #5)

---

**Keep this checklist. You may need it again if issues resurface. 👍**
