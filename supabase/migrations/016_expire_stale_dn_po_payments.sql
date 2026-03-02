-- Migration 016: Expire stale PENDING payments blocking DeliveryNote and PurchaseOrder
-- These 4 payments were left in PENDING from failed/timed-out STK push attempts,
-- preventing new payment attempts for the same documents.
-- No behavioral changes — just data cleanup.

UPDATE "DeliveryNotePayment"
SET status = 'FAILED',
    "resultDesc" = 'Expired – stale payment cleanup',
    "updatedAt" = NOW()
WHERE id IN ('vyy3ifracvdf09tvu92vh9dg', 'mz1j2o9yb5069z5l9m08pl56')
  AND status = 'PENDING';

UPDATE "PurchaseOrderPayment"
SET status = 'FAILED',
    "resultDesc" = 'Expired – stale payment cleanup',
    "updatedAt" = NOW()
WHERE id IN ('anx57ci2h08np5zt60xmy426', 'o9axm7vlulv0wdkrx4xih4q5')
  AND status = 'PENDING';
