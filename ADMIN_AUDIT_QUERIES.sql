-- ADMIN DASHBOARD DATA INTEGRITY AUDIT QUERIES
-- Run these in Supabase SQL Editor to diagnose data accuracy issues
-- Copy entire sections as needed

-- ============================================================================
-- SECTION 1: PAYMENT AUDIT (All document types)
-- ============================================================================

-- 1.1 Overall payment status distribution
SELECT 
  'Payment' as table_name,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM Payment
GROUP BY status
ORDER BY count DESC;

-- 1.2 Payment status for other document types
-- (Repeat this query replacing 'Payment' with: CashSalePayment, DeliveryNotePayment, ReceiptPayment, PurchaseOrderPayment, QuotationPayment)
SELECT 
  'CashSalePayment' as table_name,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM CashSalePayment
GROUP BY status
ORDER BY count DESC;

-- 1.3 Check for duplicate checkoutRequestIds (these should be unique!)
SELECT 
  'Payment' as table_name,
  checkoutRequestId,
  COUNT(*) as duplicate_count,
  array_agg(id) as payment_ids
FROM Payment
WHERE checkoutRequestId IS NOT NULL
GROUP BY checkoutRequestId
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 1.4 Recent completed payments (last 30 days)
SELECT 
  id,
  invoiceId,
  checkoutRequestId,
  status,
  amount,
  mpesaReceiptNumber,
  createdAt,
  completedAt
FROM Payment
WHERE status = 'COMPLETED'
AND createdAt >= NOW() - INTERVAL '30 days'
ORDER BY completedAt DESC
LIMIT 50;

-- 1.5 Payments stuck in INITIATED (no callback received)
SELECT 
  'Payment' as doc_type,
  COUNT(*) as count,
  MAX(createdAt) as oldest_initiated,
  MIN(createdAt) as newest_initiated
FROM Payment
WHERE status = 'INITIATED'
UNION ALL
SELECT 
  'CashSalePayment',
  COUNT(*),
  MAX(createdAt),
  MIN(createdAt)
FROM CashSalePayment
WHERE status = 'INITIATED'
UNION ALL
SELECT 
  'DeliveryNotePayment',
  COUNT(*),
  MAX(createdAt),
  MIN(createdAt)
FROM DeliveryNotePayment
WHERE status = 'INITIATED'
UNION ALL
SELECT 
  'ReceiptPayment',
  COUNT(*),
  MAX(createdAt),
  MIN(createdAt)
FROM ReceiptPayment
WHERE status = 'INITIATED'
UNION ALL
SELECT 
  'PurchaseOrderPayment',
  COUNT(*),
  MAX(createdAt),
  MIN(createdAt)
FROM PurchaseOrderPayment
WHERE status = 'INITIATED'
UNION ALL
SELECT 
  'QuotationPayment',
  COUNT(*),
  MAX(createdAt),
  MIN(createdAt)
FROM QuotationPayment
WHERE status = 'INITIATED';

-- ============================================================================
-- SECTION 2: SUBSCRIPTION AUDIT
-- ============================================================================

-- 2.1 Overall subscription status distribution
SELECT 
  status,
  COUNT(*) as count,
  COUNT(DISTINCT userId) as unique_users,
  SUM(COALESCE(amountPaid, 0)) as total_revenue,
  AVG(COALESCE(amountPaid, 0)) as avg_amount_paid,
  MAX(createdAt) as most_recent
FROM Subscription
GROUP BY status
ORDER BY count DESC;

-- 2.2 Check for ACTIVE subscriptions that are actually expired
SELECT 
  id,
  userId,
  plan,
  status,
  createdAt,
  expiresAt,
  cancelledAt,
  EXTRACT(EPOCH FROM (expiresAt - NOW())) / 86400 as days_until_expiry
FROM Subscription
WHERE status = 'ACTIVE'
AND expiresAt < NOW()
ORDER BY expiresAt DESC;

-- 2.3 Check for cancelled subscriptions still marked ACTIVE (MAJOR BUG!)
SELECT 
  id,
  userId,
  plan,
  status,
  createdAt,
  cancelledAt,
  expiresAt
FROM Subscription
WHERE status = 'ACTIVE'
AND cancelledAt IS NOT NULL
ORDER BY cancelledAt DESC;

-- 2.4 Check for PENDING subscriptions older than 24 hours (payment probably failed)
SELECT 
  id,
  userId,
  plan,
  status,
  createdAt,
  EXTRACT(EPOCH FROM (NOW() - createdAt)) / 3600 as hours_pending,
  checkoutRequestId
FROM Subscription
WHERE status = 'PENDING'
AND createdAt < NOW() - INTERVAL '24 hours'
ORDER BY createdAt ASC;

-- 2.5 Subscription with payment status mismatch
SELECT 
  s.id as sub_id,
  s.userId,
  s.status as sub_status,
  s.plan,
  s.checkoutRequestId,
  COALESCE(p.status, 'NO_PAYMENT_RECORD') as payment_status,
  s.amountPaid,
  s.createdAt,
  s.expiresAt
FROM Subscription s
LEFT JOIN SubscriptionPayment p ON s.checkoutRequestId = p.checkoutRequestId
WHERE 
  -- Active subscription but no completed payment
  (s.status = 'ACTIVE' AND (p.status IS NULL OR p.status != 'COMPLETED'))
  OR
  -- Pending subscription but payment completed (edge case, should be activated)
  (s.status = 'PENDING' AND p.status = 'COMPLETED')
ORDER BY s.createdAt DESC;

-- ============================================================================
-- SECTION 3: SUBSCRIPTION ↔ PAYMENT CONSISTENCY
-- ============================================================================

-- 3.1 Orphaned subscription payments (no matching subscription)
SELECT 
  p.id as payment_id,
  p.checkoutRequestId,
  p.status as payment_status,
  p.amount,
  p.mpesaReceiptNumber,
  p.createdAt,
  CASE WHEN s.id IS NULL THEN 'ORPHANED' ELSE 'OK' END as status
FROM SubscriptionPayment p
LEFT JOIN Subscription s ON p.checkoutRequestId = s.checkoutRequestId
WHERE s.id IS NULL
ORDER BY p.createdAt DESC;

-- 3.2 Subscription activation timeline
SELECT 
  s.id,
  s.userId,
  s.status,
  s.createdAt as sub_created,
  p.createdAt as payment_created,
  p.completedAt as payment_completed,
  (p.completedAt - s.createdAt) as time_to_activation,
  s.expiresAt,
  CASE 
    WHEN s.status = 'ACTIVE' AND p.status = 'COMPLETED' THEN '✅ Normal activation'
    WHEN s.status = 'ACTIVE' AND p.status != 'COMPLETED' THEN '⚠️ Active but payment not complete'
    WHEN s.status = 'PENDING' AND p.status = 'COMPLETED' THEN '⚠️ Payment complete but sub not activated'
    WHEN s.status != 'ACTIVE' AND p.status = 'COMPLETED' THEN '✅ Normal (completed then cancelled/expired)'
    ELSE '❓ Check'
  END as status_check
FROM Subscription s
LEFT JOIN SubscriptionPayment p ON s.checkoutRequestId = p.checkoutRequestId
ORDER BY s.createdAt DESC
LIMIT 100;

-- ============================================================================
-- SECTION 4: DATA QUALITY SUMMARY
-- ============================================================================

-- 4.1 Overall data health dashboard
WITH payment_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_payments,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_payments,
    COUNT(*) FILTER (WHERE status = 'INITIATED') as initiated_payments,
    COUNT(*) as total_payments
  FROM (
    SELECT status FROM Payment
    UNION ALL SELECT status FROM CashSalePayment
    UNION ALL SELECT status FROM DeliveryNotePayment
    UNION ALL SELECT status FROM ReceiptPayment
    UNION ALL SELECT status FROM PurchaseOrderPayment
    UNION ALL SELECT status FROM QuotationPayment
  ) all_payments
),
sub_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_subs,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_subs,
    COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired_subs,
    SUM(COALESCE(amountPaid, 0)) FILTER (WHERE status = 'ACTIVE') as active_revenue,
    COUNT(*) as total_subs
  FROM Subscription
),
mismatch_check AS (
  SELECT COUNT(*) as mismatch_count
  FROM Subscription s
  LEFT JOIN SubscriptionPayment p ON s.checkoutRequestId = p.checkoutRequestId
  WHERE (s.status = 'ACTIVE' AND (p.status IS NULL OR p.status != 'COMPLETED'))
     OR (s.status = 'PENDING' AND p.status = 'COMPLETED')
)
SELECT 
  'PAYMENTS' as category,
  'Total Completed' as metric,
  (SELECT completed_payments::text FROM payment_stats) as value
UNION ALL
SELECT 'PAYMENTS', 'Total Failed', (SELECT failed_payments::text FROM payment_stats)
UNION ALL
SELECT 'PAYMENTS', 'Total Initiated (waiting)', (SELECT initiated_payments::text FROM payment_stats)
UNION ALL
SELECT 'SUBSCRIPTIONS', 'Active Subscribers', (SELECT active_subs::text FROM sub_stats)
UNION ALL
SELECT 'SUBSCRIPTIONS', 'Pending (unpaid)', (SELECT pending_subs::text FROM sub_stats)
UNION ALL
SELECT 'SUBSCRIPTIONS', 'Active Revenue (KSH)', (SELECT ROUND(active_revenue)::text FROM sub_stats)
UNION ALL
SELECT 'DATA_QUALITY', 'Sub/Payment Mismatches', (SELECT mismatch_count::text FROM mismatch_check)
ORDER BY category, metric;

-- ============================================================================
-- SECTION 5: RECOMMENDED FIXES (Copy-paste these)
-- ============================================================================

-- FIX 5.1: Mark stale PENDING subscriptions as EXPIRED
-- DO THIS ONLY AFTER CONFIRMING in 2.4 that these failed
/*
UPDATE Subscription
SET status = 'EXPIRED'
WHERE status = 'PENDING'
AND createdAt < NOW() - INTERVAL '24 hours'
AND NOT EXISTS (
  SELECT 1 FROM SubscriptionPayment 
  WHERE checkoutRequestId = Subscription.checkoutRequestId 
  AND status = 'COMPLETED'
);
*/

-- FIX 5.2: Fix cancelled subscriptions still marked ACTIVE
-- DO THIS AFTER CONFIRMING in 2.3 that these exist
/*
UPDATE Subscription
SET status = 'CANCELLED'
WHERE status = 'ACTIVE'
AND cancelledAt IS NOT NULL;
*/

-- FIX 5.3: Activate pending subscriptions with completed payments
-- DO THIS AFTER CONFIRMING in 3.2 that these exist
/*
UPDATE Subscription
SET status = 'ACTIVE', updatedAt = NOW()
WHERE status = 'PENDING'
AND EXISTS (
  SELECT 1 FROM SubscriptionPayment 
  WHERE checkoutRequestId = Subscription.checkoutRequestId 
  AND status = 'COMPLETED'
);
*/
