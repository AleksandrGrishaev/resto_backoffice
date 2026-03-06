-- Migration: 150_fix_udang_cascade_batch_costs
-- Description: Fix data entry error in Udang (shrimp) storage batches that
--   cascaded through preparation hierarchy: Udang → Shrimp prep → Tom yam pack → Tom Yum sales
-- Date: 2026-02-07
-- Author: Claude Code
--
-- ROOT CAUSE:
-- Udang (raw shrimp) storage batches from Jan 26 and Jan 31 had cost_per_unit = 3375/g
-- instead of the correct 135/g (25× inflation). This appears to be a data entry error
-- where the total purchase price (Rp 135,000/kg = 135/g) was entered as per-unit cost
-- for a small receipt quantity (40g).
--
-- CASCADE EFFECT:
-- Udang 3375/g (25× wrong) → Shrimp prep batch 844.08/g (vs normal 270/g)
--   → Tom yam pack batch 370.2/g (vs normal 145/g) → Tom Yum 187.6% food cost
--
-- FIXES:
-- 1. Udang storage batches: 3375 → 135/g (correct price per gram)
-- 2. Shrimp prep batch (Jan 29): 844.08 → 270/g + last_known_cost
-- 3. Tom yam pack batch (Jan 31): 370.2 → 145/g + last_known_cost
-- 4. Recalculate affected Tom Yum sales transactions
--
-- NOTE: This migration uses criteria-based WHERE clauses (not hard-coded UUIDs)
-- to be safe across environments. Only batches matching the inflated cost patterns
-- will be affected.

-- =============================================================================
-- 1. Fix Udang storage batches with inflated cost_per_unit
-- =============================================================================
-- Correct value: 135/g (from Rp 135,000/kg)
-- Inflated value: 3375/g (25× too high)
UPDATE storage_batches
SET cost_per_unit = 135,
    total_value = current_quantity * 135,
    updated_at = NOW()
WHERE item_id = (SELECT id::text FROM products WHERE name = 'Udang' LIMIT 1)
  AND cost_per_unit > 1000  -- Only fix inflated batches (normal = 135)
  AND cost_per_unit <= 5000;

-- =============================================================================
-- 2. Fix Shrimp (udang) thawed preparation batches
-- =============================================================================
-- Correct value: ~270/g
-- Inflated value: ~844/g (from inflated Udang cost cascading)
UPDATE preparation_batches
SET cost_per_unit = 270,
    total_value = current_quantity * 270,
    updated_at = NOW()
WHERE preparation_id = (SELECT id FROM preparations WHERE name = 'Shrimp (udang) thawed 30pc' LIMIT 1)
  AND cost_per_unit > 500  -- Only fix inflated batches (normal ≈ 270)
  AND cost_per_unit < 2000
  AND is_active = true;

-- Fix last_known_cost for Shrimp preparation
UPDATE preparations
SET last_known_cost = 270,
    updated_at = NOW()
WHERE name = 'Shrimp (udang) thawed 30pc'
  AND last_known_cost > 500;

-- =============================================================================
-- 3. Fix Tom yam seafood pack preparation batches
-- =============================================================================
-- Correct value: 145/g
-- Inflated value: ~370/g (from inflated Shrimp cost cascading)
UPDATE preparation_batches
SET cost_per_unit = 145,
    total_value = current_quantity * 145,
    updated_at = NOW()
WHERE preparation_id = (SELECT id FROM preparations WHERE name = 'Tom yam seafood pack' LIMIT 1)
  AND cost_per_unit > 200  -- Only fix inflated batches (normal = 145)
  AND cost_per_unit < 1000
  AND is_active = true;

-- Fix last_known_cost for Tom yam pack
UPDATE preparations
SET last_known_cost = 145,
    updated_at = NOW()
WHERE name = 'Tom yam seafood pack'
  AND last_known_cost > 200;

-- =============================================================================
-- 4. Recalculate Tom Yum sales transactions from Feb 1
--    that used the inflated Tom yam pack cost
-- =============================================================================
-- Identify and fix transactions where Tom yam pack cost > 200/g in allocations
DO $$
DECLARE
  v_tx RECORD;
  v_new_prep_costs JSONB;
  v_prep JSONB;
  v_new_total NUMERIC;
  v_new_ingredients_cost NUMERIC;
  v_new_profit NUMERIC;
  v_new_margin NUMERIC;
  v_prep_total NUMERIC;
  v_fixed_count INT := 0;
BEGIN
  FOR v_tx IN
    SELECT id, actual_cost, profit_calculation
    FROM sales_transactions
    WHERE menu_item_name = 'Tom Yum'
      AND sold_at >= '2026-02-01'
      AND actual_cost IS NOT NULL
      AND actual_cost::text LIKE '%Tom yam seafood pack%'
      -- Only fix if the Tom yam pack cost is inflated
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(actual_cost->'preparationCosts') p
        WHERE p->>'preparationName' = 'Tom yam seafood pack'
          AND (p->>'averageCostPerUnit')::numeric > 200
      )
  LOOP
    v_new_prep_costs := '[]'::JSONB;
    v_new_total := 0;

    -- Add product costs unchanged
    v_new_total := v_new_total + COALESCE(
      (SELECT SUM((item->>'totalCost')::numeric)
       FROM jsonb_array_elements(v_tx.actual_cost->'productCosts') item), 0);

    -- Process each preparation cost
    FOR v_prep IN SELECT * FROM jsonb_array_elements(v_tx.actual_cost->'preparationCosts')
    LOOP
      IF (v_prep->>'preparationName') = 'Tom yam seafood pack'
         AND (v_prep->>'averageCostPerUnit')::numeric > 200 THEN
        -- Recalculate with correct cost (145/g)
        v_prep_total := (v_prep->>'quantity')::numeric * 145;
        v_new_prep_costs := v_new_prep_costs || jsonb_build_object(
          'preparationId', v_prep->>'preparationId',
          'preparationName', v_prep->>'preparationName',
          'quantity', v_prep->>'quantity',
          'unit', v_prep->>'unit',
          'source', v_prep->>'source',
          'totalCost', ROUND(v_prep_total, 2),
          'averageCostPerUnit', 145,
          'allocations', v_prep->'allocations',
          'usedNegativeBatch', COALESCE((v_prep->>'usedNegativeBatch')::boolean, false),
          'fixed', 'udang_cascade_150'
        );
      ELSE
        v_new_prep_costs := v_new_prep_costs || v_prep;
        v_prep_total := (v_prep->>'totalCost')::numeric;
      END IF;
      v_new_total := v_new_total + v_prep_total;
    END LOOP;

    -- Update transaction
    v_new_ingredients_cost := ROUND(v_new_total, 2);
    v_new_profit := (v_tx.profit_calculation->>'finalRevenue')::numeric - v_new_ingredients_cost;
    v_new_margin := CASE
      WHEN (v_tx.profit_calculation->>'finalRevenue')::numeric > 0
      THEN ROUND(v_new_profit / (v_tx.profit_calculation->>'finalRevenue')::numeric * 100, 2)
      ELSE 0
    END;

    UPDATE sales_transactions
    SET actual_cost = jsonb_build_object(
          'method', v_tx.actual_cost->>'method',
          'totalCost', v_new_ingredients_cost,
          'calculatedAt', v_tx.actual_cost->>'calculatedAt',
          'productCosts', COALESCE(v_tx.actual_cost->'productCosts', '[]'::JSONB),
          'preparationCosts', v_new_prep_costs,
          'recalculatedAt', NOW()::text,
          'fixedBy', 'migration_150_udang_cascade'
        ),
        profit_calculation = v_tx.profit_calculation || jsonb_build_object(
          'ingredientsCost', v_new_ingredients_cost,
          'profit', v_new_profit,
          'profitMargin', v_new_margin
        ),
        updated_at = NOW()
    WHERE id = v_tx.id;

    v_fixed_count := v_fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'Fixed % Tom Yum transactions with inflated Tom yam pack cost', v_fixed_count;
END $$;
