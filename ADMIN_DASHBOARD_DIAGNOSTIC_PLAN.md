# Admin Dashboard Data Accuracy Diagnostic & Improvement Plan

**Date Created:** March 19, 2026  
**Issue:** Missing recent payments, incorrect subscription records (cancelled paid transactions showing as active subscribers)

---

## 🔍 **Phase 1: Root Cause Analysis**

### Current Data Flow Architecture

```
M-Pesa Payment Initiated
    ↓
1. STK Push Request → Daraja API
    ↓
2. Payment record created with status=INITIATED
    ↓
3a. Success Path:
    → Daraja callback received
    → Payment status = COMPLETED
    → Document marked as isPaid=true
    → Subscription status updated to ACTIVE (if subscription)
    
3b. Timeout Path:
    → No callback received after ~2 hours
    → Status marked FAILED with "Expired - timed out"
    → BUT real Daraja status unknown
    → Reconciliation job required: /api/admin/reconcile-payments ⚠️
    
3c. User-Cancelled Path:
    → User cancels STK prompt
    → Callback received with ResultCode=1 (cancelled)
    → Status = FAILED with "The user cancelled the operation"
```

### **Identified Root Causes**

#### 1️⃣ **Missing Payments in Admin View**
- **Cause:** Payments table has completed payments BUT:
  - Query may only show `limit=30` per page (can miss payments)
  - Multiple payment tables queried in parallel (race conditions possible)
  - Pagination offset calculations may be wrong
- **Impact:** Scrolling reveals later payments, but not continuous listing

#### 2️⃣ **Incorrect Subscriber Status (Showing Cancelled as Active)**
- **Cause:** Subscription activation relies on Daraja callback
  - If callback fails/delays → subscription stays PENDING
  - If callback eventually arrives → subscription becomes ACTIVE
  - If later payment is somehow cancelled/failed → subscription should move to CANCELLED, but may not
- **Issue:** Database RPC `activate_subscription` may not handle edge cases like:
  - Duplicate activation attempts
  - Race conditions between callback and reconciliation
  - Manual subscription cancellations not properly cascading
- **Impact:** Cancelled paid subscriptions still show as ACTIVE subscribers

#### 3️⃣ **Payment Records Not Synced with Subscriptions**
- **Cause:** Two separate tables track subscriptions:
  - `Subscription` table (status: PENDING/ACTIVE/EXPIRED/CANCELLED)
  - `SubscriptionPayment` table (status: INITIATED/COMPLETED/FAILED)
  - No atomic transaction linking them
- **Impact:** Payment can be COMPLETED but subscription still PENDING, or vice versa

#### 4️⃣ **Reconciliation Job Not Running**
- **Cause:** `/api/admin/reconcile-payments` endpoint exists but is manual intervention
  - Requires external cron job (Railway Cron Job, AWS Lambda, etc.)
  - Currently NOT configured in your setup
  - Failed/Expired payments stuck indefinitely
- **Impact:** Payments marked as FAILED may actually be successful at Daraja
  - Real status never confirmed
  - Users can't see their subscription as activated

#### 5️⃣ **Admin Stats Calculation Issues**
- **Cause:** Platform stats pulled from RPC function `get_platform_stats`
  - May include PENDING subscriptions in "active" count
  - May sum all amountPaid without filtering status
  - May not exclude cancelled transactions properly
- **Impact:** Dashboard metrics don't match reality

---

## 📋 **Phase 2: Diagnostics & Data Audit (Do This First)**

### **Step 1: Check Payment Tables Directly**

Run these queries in Supabase SQL editor to audit data:

```sql
-- 1a. Count all payments by status
SELECT status, COUNT(*) as count, SUM(amount) as total_amount
FROM Payment
GROUP BY status
ORDER BY count DESC;

-- 1b. Check for duplicate checkoutRequestIds (should be unique)
SELECT checkoutRequestId, COUNT(*) as dupes
FROM Payment
WHERE checkoutRequestId IS NOT NULL
GROUP BY checkoutRequestId
HAVING COUNT(*) > 1;

-- 1c. Check for COMPLETED payments in last 30 days
SELECT id, checkoutRequestId, status, amount, createdAt, completedAt
FROM Payment
WHERE status = 'COMPLETED'
AND createdAt >= NOW() - INTERVAL '30 days'
ORDER BY createdAt DESC
LIMIT 100;

-- 1d. Check all document payment tables (repeat for each)
SELECT status, COUNT(*) FROM CashSalePayment GROUP BY status;
SELECT status, COUNT(*) FROM DeliveryNotePayment GROUP BY status;
SELECT status, COUNT(*) FROM ReceiptPayment GROUP BY status;
SELECT status, COUNT(*) FROM PurchaseOrderPayment GROUP BY status;
SELECT status, COUNT(*) FROM QuotationPayment GROUP BY status;
```

### **Step 2: Audit Subscription Consistency**

```sql
-- 2a. Check subscriptions with mismatched status
SELECT 
  s.id,
  s.userId,
  s.status as sub_status,
  s.checkoutRequestId,
  p.status as payment_status,
  p.completedAt,
  s.createdAt,
  s.expiresAt
FROM Subscription s
LEFT JOIN SubscriptionPayment p ON s.checkoutRequestId = p.checkoutRequestId
WHERE s.status = 'ACTIVE' AND (p.status IS NULL OR p.status != 'COMPLETED')
ORDER BY s.createdAt DESC;

-- 2b. Check for cancelled subscriptions still marked ACTIVE
SELECT id, userId, status, plan, createdAt, cancelledAt, expiresAt
FROM Subscription
WHERE status = 'ACTIVE' AND cancelledAt IS NOT NULL
ORDER BY updatedAt DESC;

-- 2c. Count subscriptions by status
SELECT status, COUNT(*) as count, SUM(amountPaid) as total_revenue
FROM Subscription
GROUP BY status;

-- 2d. Check pending subscriptions (should have limited age)
SELECT id, userId, status, createdAt, checkoutRequestId
FROM Subscription
WHERE status = 'PENDING'
AND createdAt < NOW() - INTERVAL '24 hours'
ORDER BY createdAt DESC;
```

### **Step 3: Cross-Check with Payment Callback Logs**

```sql
-- 3a. Check audit log for payment callbacks
SELECT *
FROM AuditLog
WHERE action ILIKE 'payment%' OR action ILIKE 'callback%'
ORDER BY createdAt DESC
LIMIT 50;

-- 3b. Find orphaned payments (no matching subscription)
SELECT p.id, p.checkoutRequestId, p.status, p.amount
FROM SubscriptionPayment p
LEFT JOIN Subscription s ON p.checkoutRequestId = s.checkoutRequestId
WHERE s.id IS NULL;
```

### **Step 4: Admin Dashboard Verification**

In your admin dashboard:
1. Navigate to **Payments** tab
   - Click through all pages
   - Count total unique payments
   - Compare to SQL query: `SELECT COUNT(*) FROM Payment` (sum all 6 tables)

2. Navigate to **Subscriptions** tab
   - Check "ACTIVE" count
   - Click each active subscription
   - Verify `expiresAt` is in future
   - Check if any have `cancelledAt` date (should not)

3. Check **Stats** card
   - Note "Active Subscribers" number
   - Compare to `SELECT COUNT(*) FROM Subscription WHERE status = 'ACTIVE'`
   - Verify revenue number matches

---

## 🔧 **Phase 3: Immediate Fixes (Apply in Order)**

### **Fix 1: Set Up Reconciliation Job** ✅ CRITICAL

The `/api/admin/reconcile-payments` endpoint exists but needs to run automatically.

**Option A: Railway (Recommended)**
1. Go to Railway Dashboard → Project → Settings
2. Add a cron job:
   - **URL:** `https://your-domain.com/api/admin/reconcile-payments`
   - **HTTP Method:** POST
   - **Header:** `x-admin-secret: <your-ADMIN_SECRET>`
   - **Schedule:** `*/5 * * * *` (every 5 minutes)

**Option B: External Cron Service (Uptime Robot, EasyCron)**
```bash
POST https://your-domain.com/api/admin/reconcile-payments
Header: x-admin-secret=YOUR_ADMIN_SECRET
Schedule: Every 5 minutes
```

**Option C: Manual (Temporary)**
Until automated: Run this in browser console while logged into admin:
```javascript
fetch('/api/admin/reconcile-payments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionStorage.getItem('adminSecret')}`,
    'x-admin-secret': sessionStorage.getItem('adminSecret')
  }
}).then(r => r.json()).then(console.log);
```

### **Fix 2: Clean Up Stale Pending Subscriptions**

Run in Supabase SQL editor:

```sql
-- Mark as EXPIRED any PENDING subscription older than 24 hours (payment never completed)
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

### **Fix 3: Fix Cancelled Subscriptions Still Showing as Active**

```sql
-- Mark as CANCELLED any subscription with a cancelledAt date that's still ACTIVE
UPDATE Subscription
SET status = 'CANCELLED'
WHERE status = 'ACTIVE'
AND cancelledAt IS NOT NULL;

-- Verify:
SELECT COUNT(*) as now_cancelled
FROM Subscription
WHERE status = 'CANCELLED' AND cancelledAt IS NOT NULL;
```

### **Fix 4: Validate Payment ↔ Subscription Consistency**

```sql
-- Create a reconciliation view:
CREATE OR REPLACE VIEW subscription_payment_status_check AS
SELECT 
  s.id as sub_id,
  s.userId,
  s.status as sub_status,
  s.checkoutRequestId,
  COALESCE(p.status, 'NO_PAYMENT_RECORD') as payment_status,
  CASE
    WHEN s.status = 'ACTIVE' AND (p.status IS NULL OR p.status != 'COMPLETED') THEN '❌ MISMATCH: Active sub but payment not complete'
    WHEN s.status = 'ACTIVE' AND p.status = 'COMPLETED' THEN '✅ OK: Active and paid'
    WHEN s.status IN ('CANCELLED', 'EXPIRED') AND p.status = 'COMPLETED' THEN '⚠️ INFO: Cancelled but paid (may be downgrade)'
    WHEN s.status = 'PENDING' AND (p.status IS NULL OR p.status = 'FAILED') THEN 'ℹ️ OK: Pending, awaiting payment or failed'
    ELSE 'ℹ️ OTHER: Check manually'
  END as status_check
FROM Subscription s
LEFT JOIN SubscriptionPayment p ON s.checkoutRequestId = p.checkoutRequestId
ORDER BY s.createdAt DESC;

-- Query to find issues:
SELECT * FROM subscription_payment_status_check
WHERE status_check LIKE '%MISMATCH%' OR status_check LIKE '%⚠️%';
```

### **Fix 5: Update Admin Stats RPC (if needed)**

Check Supabase Functions → `get_platform_stats` to ensure it:
- Only counts `status = 'ACTIVE'` for active subscribers (not PENDING)
- Only sums `amountPaid` WHERE `status = 'ACTIVE'`
- Excludes CANCELLED subscriptions from active count

If the RPC is wrong, update it:
```sql
-- Example corrected query (compare with your actual RPC)
SELECT 
  (SELECT COUNT(*) FROM Subscription WHERE status = 'ACTIVE') as active_subscribers,
  (SELECT SUM(amountPaid) FROM Subscription WHERE status = 'ACTIVE') as total_revenue,
  (SELECT COUNT(*) FROM User) as total_users,
  (SELECT COUNT(*) FROM Invoice) as total_invoices,
  -- Add other relevant metrics
AS result;
```

---

## 📊 **Phase 4: Data Quality Improvements (Ongoing)**

### **4.1 Add Data Validation Tests**

Create [test/admin-data-integrity.test.ts](test/admin-data-integrity.test.ts):

```typescript
import { describe, it, expect } from 'vitest';
import { getAdminClient } from '@/lib/supabase/admin';

describe('Admin Data Integrity', () => {
  const admin = getAdminClient();

  it('should not have active subscriptions without completed payments', async () => {
    const { data, error } = await admin.rpc('check_subscription_payment_consistency');
    expect(error).toBeNull();
    expect(data?.mismatches || []).toHaveLength(0);
  });

  it('should not have duplicate checkoutRequestIds', async () => {
    const { data, error } = await admin
      .from('SubscriptionPayment')
      .select('checkoutRequestId, count:*')
      .not('checkoutRequestId', 'is', null);
    
    const dupes = data?.filter((row: any) => row.count > 1) || [];
    expect(dupes).toHaveLength(0);
  });

  it('should have all payments accounted for in stats', async () => {
    const { data: allPayments } = await admin
      .from('SubscriptionPayment')
      .select('COUNT(*)', { count: 'exact' });
    
    const { data: stats } = await admin.rpc('get_platform_stats');
    expect(stats?.total_payments).toBe(allPayments?.[0]?.count);
  });

  it('should not have cancelled subscriptions with active status', async () => {
    const { data, error } = await admin
      .from('Subscription')
      .select('id')
      .eq('status', 'ACTIVE')
      .not('cancelledAt', 'is', null);
    
    expect(error).toBeNull();
    expect(data || []).toHaveLength(0);
  });
});
```

### **4.2 Add Admin Dashboard Audit Trail**

Create [lib/db/admin-audit.ts](lib/db/admin-audit.ts):

```typescript
export async function logAdminAction(
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  const admin = getAdminClient();
  await admin.from('AuditLog').insert({
    id: createId(),
    action,
    details: JSON.stringify(details),
    createdAt: new Date().toISOString(),
  });
}

// Usage in payment callbacks:
await logAdminAction('payment_callback_received', {
  checkoutRequestId,
  status: parsed.status,
  documentType: payment.documentType,
});

await logAdminAction('subscription_activated', {
  subscriptionId,
  userId,
  plan,
  amount,
});
```

### **4.3 Add Real-Time Alerts**

Modify [app/api/admin/stats/route.ts](app/api/admin/stats/route.ts) to include data quality scores:

```typescript
// Additional stats
const dataQuality = {
  pendingPaymentCount: <PENDING payments>,
  orphanedPaymentCount: <payments with no matching document>,
  subscriptionPaymentMismatchCount: <mismatches>,
  staleExpiredPaymentCount: <FAILED expired payments not reconciled>,
  dataQualityScore: 95, // 100 - (issues * 5)
  warnings: [
    ...(pendingPaymentCount > 10 ? ['⚠️ 10+ pending payments — reconciliation may be delayed'] : []),
    ...(orphanedPaymentCount > 0 ? ['❌ Orphaned payments detected — investigate callback logs'] : []),
  ]
};

return NextResponse.json({
  ...stats,
  dataQuality,
});
```

---

## 🎯 **Phase 5: Testing & Validation**

### **Test Scenario 1: Successful Payment Flow**
1. Initiate subscription purchase
2. Complete M-Pesa payment
3. Verify within 60 seconds:
   - ✅ `Subscription.status` = ACTIVE
   - ✅ `SubscriptionPayment.status` = COMPLETED
   - ✅ `SubscriptionPayment.completedAt` is recent
4. Admin dashboard shows in "Active Subscribers"

### **Test Scenario 2: Delayed Callback (Reconciliation)**
1. Initiate subscription purchase
2. Complete M-Pesa BUT don't receive callback immediately
3. Wait 2+ hours
4. Verify:
   - ✅ Payment initially marked FAILED
   - ✅ Reconciliation job runs
   - ✅ Payment corrected to COMPLETED
   - ✅ Subscription activated retroactively

### **Test Scenario 3: User Cancelled Payment**
1. Initiate subscription purchase
2. User cancels STK prompt
3. Verify:
   - ✅ `SubscriptionPayment.status` = FAILED
   - ✅ `SubscriptionPayment.resultDesc` = "User cancelled"
   - ✅ `Subscription.status` = PENDING (not ACTIVE)
   - ❌ Should NOT appear in "Active Subscribers"

### **Test Scenario 4: Subscription Cancellation**
1. User with ACTIVE subscription cancels it
2. Verify:
   - ✅ `Subscription.status` = CANCELLED
   - ✅ `Subscription.cancelledAt` is set
   - ✅ Disappears from "Active Subscribers" count
   - ✅ History retained in database

---

## 🚀 **Implementation Checklist**

- [ ] **Phase 2: Run all diagnostics queries**
  - [ ] Note current payment counts and statuses
  - [ ] Identify mismatched subscriptions
  - [ ] Check for orphaned records
  - [ ] Verify stats calculations

- [ ] **Phase 3: Apply immediate fixes**
  - [ ] Set up reconciliation job (Railway/external/manual)
  - [ ] Clean up stale pending subscriptions
  - [ ] Fix cancelled subscriptions showing as active
  - [ ] Validate payment ↔ subscription consistency
  - [ ] Verify admin stats RPC

- [ ] **Phase 4: Improvements**
  - [ ] Add data validation tests
  - [ ] Implement audit trail logging
  - [ ] Add data quality alerts to dashboard

- [ ] **Phase 5: Testing**
  - [ ] Test successful payment flow
  - [ ] Test delayed callback/reconciliation
  - [ ] Test user cancellation
  - [ ] Test subscription cancellation

- [ ] **Documentation**
  - [ ] Document final data flow
  - [ ] Update runbook for support team
  - [ ] Create monitoring dashboard

---

## 📞 **Quick Reference: Key Endpoints**

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `POST /api/admin/reconcile-payments` | Reconcile failed/expired payments | `x-admin-secret` header |
| `GET /api/admin/stats` | Platform stats | `Authorization: Bearer <secret>` |
| `GET /api/admin/payments` | List all payments | Bearer token |
| `GET /api/admin/subscriptions` | List subscriptions | Bearer token |
| `GET /api/admin/audit` | Audit log | Bearer token |

---

## 📝 **Notes**

- **Test in sandbox first** before applying fixes to production data
- **Backup your Supabase database** before running destructive SQL updates
- **Monitor logs** after setting up reconciliation: check success/failure rates
- **Schedule weekly** data integrity check (use the validation tests)

---

**Next Step:** Start with **Phase 2** diagnostic queries to understand your current data state.
