-- Migration: 122_fix_inflated_negative_batch_costs
-- Description: Fix negative batches that have inflated costs due to AVG calculation bug
-- Date: 2026-01-31
--
-- Problem: Old RPC used AVG(depleted_batches) which included batches with wrong costs
-- Solution: Reset cost_per_unit to product's last_known_cost or base_cost_per_unit

-- Fix all negative batches where cost > 150% of correct cost
UPDATE storage_batches sb
SET
  cost_per_unit = COALESCE(p.last_known_cost, p.base_cost_per_unit),
  total_value = sb.current_quantity * COALESCE(p.last_known_cost, p.base_cost_per_unit),
  updated_at = NOW()
FROM products p
WHERE sb.item_id::uuid = p.id
  AND sb.is_negative = true
  AND sb.status = 'active'
  AND COALESCE(p.last_known_cost, p.base_cost_per_unit) > 0
  AND sb.cost_per_unit > COALESCE(p.last_known_cost, p.base_cost_per_unit) * 1.5;
