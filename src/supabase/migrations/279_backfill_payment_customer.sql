-- Migration: 279_backfill_payment_customer
-- Description: Populate customer_id on historical payments from bill JSONB data
-- Date: 2026-03-31
-- Context: Must run BEFORE tier RPCs switch to payments (Phase 2)

-- Backfill payments.customer_id from bill.customerId (JSONB in orders)
UPDATE payments p SET
  customer_id = sub.cid,
  customer_name = sub.cname
FROM (
  SELECT p2.id AS pid,
    COALESCE(
      (SELECT (bill->>'customerId')::uuid FROM jsonb_array_elements(o.bills) bill
       WHERE bill->>'customerId' IS NOT NULL AND bill->>'id' = ANY(p2.bill_ids) LIMIT 1),
      o.customer_id
    ) AS cid,
    c.name AS cname
  FROM payments p2
  JOIN orders o ON o.id = p2.order_id
  LEFT JOIN customers c ON c.id = COALESCE(
    (SELECT (bill->>'customerId')::uuid FROM jsonb_array_elements(o.bills) bill
     WHERE bill->>'customerId' IS NOT NULL AND bill->>'id' = ANY(p2.bill_ids) LIMIT 1),
    o.customer_id
  )
  WHERE p2.customer_id IS NULL AND p2.status IN ('completed','refunded')
) sub
WHERE p.id = sub.pid AND sub.cid IS NOT NULL;
