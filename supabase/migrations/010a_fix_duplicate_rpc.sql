-- 010_fix_duplicate_rpc.sql
-- Drop duplicate RPC overloads that cause PostgREST PGRST203 ambiguity errors.
-- The correct signatures (with p_payment_id as the FIRST parameter) are defined in
-- 007_cash_sales.sql and 008_purchase_orders.sql and are NOT affected by these drops.
--
-- The old overloads have p_payment_id as the LAST parameter, giving signature:
--   (text, text, text, numeric, text) — i.e. p_amount at position 4, p_payment_id at position 5
-- The correct overloads have signature:
--   (text, text, text, text, numeric) — i.e. p_payment_id at position 1, p_amount at position 5

-- Drop the old cash sale overload (p_cash_sale_id, p_user_id, p_phone_number, p_amount, p_payment_id)
DROP FUNCTION IF EXISTS public.create_cash_sale_payment_if_unpaid(text, text, text, numeric, text);

-- Drop the old purchase order overload (p_purchase_order_id, p_user_id, p_phone_number, p_amount, p_payment_id)
DROP FUNCTION IF EXISTS public.create_purchase_order_payment_if_unpaid(text, text, text, numeric, text);
