-- Migration: 155_fix_tom_yam_paste_and_sereh_costs
-- Description: Fix Tom yam paste batch costs (13000→200/piece, package price entered as unit price)
--              Fix Sereh (Lemon grass) batch costs (5000-10000→1286/piece)
--              Recalculate affected Tom Yum sales_transactions JSONB (actual_cost, profit_calculation)
-- Date: 2026-02-25
-- Applied: DEV + PROD
-- Root cause: Purchasing entered package price (Rp 13,000 per Lobo pack) as cost-per-piece
--             instead of base unit cost (Rp 200/piece, 500 pieces per Rp 100,000 pack)

-- STEP 1: Fix Tom yam paste batches (13000/14000 → 200/piece)
UPDATE storage_batches
SET cost_per_unit = 200,
    total_value = current_quantity * 200
WHERE item_id IN (SELECT id::text FROM products WHERE name ILIKE '%tom yam paste%')
  AND cost_per_unit > 1000
  AND is_negative IS NOT TRUE;

UPDATE storage_batches
SET cost_per_unit = 200,
    total_value = current_quantity * 200
WHERE item_id IN (SELECT id::text FROM products WHERE name ILIKE '%tom yam paste%')
  AND cost_per_unit > 1000
  AND is_negative = true;

-- STEP 2: Fix Sereh (Lemon grass) batches (>3000 → 1286/piece)
UPDATE storage_batches
SET cost_per_unit = 1286,
    total_value = current_quantity * 1286
WHERE item_id IN (SELECT id::text FROM products WHERE name ILIKE '%sereh%')
  AND cost_per_unit > 3000;

-- STEP 3: Recalculate Tom Yum sales_transactions
-- Fixes actual_cost JSONB (productCosts entries) and profit_calculation
DO $$
DECLARE
  rec RECORD;
  v_actual_cost jsonb;
  v_product_costs jsonb;
  v_new_products jsonb;
  v_elem jsonb;
  v_new_total_cost numeric;
  v_prep_total numeric;
  v_prod_total numeric;
  v_revenue numeric;
  v_profit numeric;
  v_margin numeric;
  v_old_discount numeric;
  v_bill_discount numeric;
  v_updated int := 0;
BEGIN
  FOR rec IN
    SELECT st.id, st.actual_cost, st.profit_calculation, st.unit_price, st.total_price
    FROM sales_transactions st
    WHERE st.menu_item_name = 'Tom Yum'
      AND st.actual_cost IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(st.actual_cost->'productCosts') e
          WHERE e->>'productName' = 'Tom yam paste'
            AND (e->>'averageCostPerUnit')::numeric > 500
        )
        OR
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(st.actual_cost->'productCosts') e
          WHERE e->>'productName' LIKE 'Sereh%'
            AND (e->>'averageCostPerUnit')::numeric > 3000
        )
      )
  LOOP
    v_actual_cost := rec.actual_cost;
    v_product_costs := v_actual_cost->'productCosts';
    v_new_products := '[]'::jsonb;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_product_costs)
    LOOP
      IF v_elem->>'productName' = 'Tom yam paste' AND (v_elem->>'averageCostPerUnit')::numeric > 500 THEN
        v_elem := jsonb_set(v_elem, '{averageCostPerUnit}', '200'::jsonb);
        v_elem := jsonb_set(v_elem, '{totalCost}', to_jsonb((v_elem->>'quantity')::numeric * 200));
        IF v_elem ? 'batchAllocations' THEN
          v_elem := jsonb_set(v_elem, '{batchAllocations}',
            (SELECT COALESCE(jsonb_agg(
              jsonb_set(jsonb_set(ba, '{costPerUnit}', '200'::jsonb),
                '{totalCost}', to_jsonb((ba->>'allocatedQuantity')::numeric * 200))
            ), '[]'::jsonb)
            FROM jsonb_array_elements(v_elem->'batchAllocations') ba)
          );
        END IF;
      ELSIF v_elem->>'productName' LIKE 'Sereh%' AND (v_elem->>'averageCostPerUnit')::numeric > 3000 THEN
        v_elem := jsonb_set(v_elem, '{averageCostPerUnit}', '1286'::jsonb);
        v_elem := jsonb_set(v_elem, '{totalCost}', to_jsonb(ROUND((v_elem->>'quantity')::numeric * 1286, 2)));
        IF v_elem ? 'batchAllocations' THEN
          v_elem := jsonb_set(v_elem, '{batchAllocations}',
            (SELECT COALESCE(jsonb_agg(
              jsonb_set(jsonb_set(ba, '{costPerUnit}', '1286'::jsonb),
                '{totalCost}', to_jsonb(ROUND((ba->>'allocatedQuantity')::numeric * 1286, 2)))
            ), '[]'::jsonb)
            FROM jsonb_array_elements(v_elem->'batchAllocations') ba)
          );
        END IF;
      END IF;
      v_new_products := v_new_products || jsonb_build_array(v_elem);
    END LOOP;

    SELECT COALESCE(SUM((e->>'totalCost')::numeric), 0) INTO v_prod_total
    FROM jsonb_array_elements(v_new_products) e;
    SELECT COALESCE(SUM((e->>'totalCost')::numeric), 0) INTO v_prep_total
    FROM jsonb_array_elements(v_actual_cost->'preparationCosts') e;
    v_new_total_cost := ROUND(v_prod_total + v_prep_total, 2);

    v_actual_cost := jsonb_set(v_actual_cost, '{productCosts}', v_new_products);
    v_actual_cost := jsonb_set(v_actual_cost, '{totalCost}', to_jsonb(v_new_total_cost));

    v_revenue := COALESCE((rec.profit_calculation->>'finalRevenue')::numeric,
                          (rec.profit_calculation->>'revenue')::numeric,
                          rec.total_price::numeric);
    v_old_discount := COALESCE((rec.profit_calculation->>'itemOwnDiscount')::numeric, 0);
    v_bill_discount := COALESCE((rec.profit_calculation->>'allocatedBillDiscount')::numeric, 0);
    v_profit := v_revenue - v_new_total_cost;
    v_margin := CASE WHEN v_revenue > 0 THEN ROUND(v_profit / v_revenue * 100, 2) ELSE 0 END;

    UPDATE sales_transactions
    SET actual_cost = v_actual_cost,
        profit_calculation = jsonb_build_object(
          'cost', v_new_total_cost,
          'revenue', v_revenue,
          'profit', v_profit,
          'profitMargin', v_margin,
          'ingredientsCost', v_new_total_cost,
          'originalPrice', COALESCE((rec.profit_calculation->>'originalPrice')::numeric, rec.unit_price::numeric),
          'finalRevenue', v_revenue,
          'itemOwnDiscount', v_old_discount,
          'allocatedBillDiscount', v_bill_discount
        )
    WHERE id = rec.id;

    v_updated := v_updated + 1;
  END LOOP;

  RAISE NOTICE 'Updated % Tom Yum sales transactions', v_updated;
END;
$$;
