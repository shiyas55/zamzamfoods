-- =============================================================================
-- FIX: Remove ghost ADJUSTMENT transactions created by old order-edit logic
-- =============================================================================
--
-- Problem:
--   When an order was edited, the old code created a new ADJUSTMENT transaction
--   with reference_order set to the edited order's ID.
--
--   The get_customers_opening_balances_for_date() formula subtracted ALL
--   ADJUSTMENT transactions (created_at__date >= target_date), which caused
--   the Prev. Due to drift by the edit delta on every recalculation.
--
-- Fix Applied in Code (2026-10-07):
--   update_order_service() now updates the CREDIT_SALE entry in-place instead
--   of creating a new ADJUSTMENT. The formula now only subtracts STANDALONE
--   adjustments (reference_order IS NULL).
--
-- This SQL removes the ghost records from existing live data.
-- The CREDIT_SALE entries already have the correct current order total,
-- so removing the linked ADJUSTMENT records will not cause data loss.
--
-- BACKUP your database before running this!
-- =============================================================================

BEGIN;

-- Preview what will be deleted (run this SELECT first to verify)
SELECT
    ct.id,
    c.name AS customer,
    ct.amount,
    ct.balance_after,
    ct.notes,
    ct.created_at,
    o.order_number
FROM credits_credittransaction ct
JOIN customers_customer c ON c.id = ct.customer_id
JOIN orders_order o ON o.id = ct.reference_order_id
WHERE ct.transaction_type = 'ADJUSTMENT'
  AND ct.reference_order_id IS NOT NULL
ORDER BY ct.created_at;

-- =============================================================================
-- After reviewing the preview above, uncomment and run the DELETE:
-- =============================================================================

-- DELETE FROM credits_credittransaction
-- WHERE transaction_type = 'ADJUSTMENT'
--   AND reference_order_id IS NOT NULL;

COMMIT;
