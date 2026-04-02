-- Migration: 194_fix_variance_portion_size_bug
-- Description: Fix critical portion_size unit mismatch in variance report
-- Date: 2026-03-10
-- Author: Claude
--
-- BUG: When recipes reference portion-type preparations (output_quantity=1, portion_size=30),
-- the theoretical sales calculation uses PORTIONS as consumed_qty but divides by
-- total_output_GRAMS (output_quantity * portion_size). This under-counts product usage
-- by a factor of portion_size (e.g., 30x for Salmon portion 30g).
--
-- PROOF (PROD data, March 2026):
--   Salmon filet via "Salmon portion 30g": 62 portions consumed
--   BUGGY:  62 * 30 / (1 * 30) = 62g  (what the report shows)
--   FIXED:  62 * 30 * 30 / (1 * 30) = 1,860g  (correct answer)
--
-- SCOPE: Affects all 23 portion-type preparations (portion_size > 1) on PROD
-- FIX: Normalize consumed quantities to GRAMS before decomposition by multiplying
--      by COALESCE(prep.portion_size, 1) when the unit is 'portion'/'pcs'
--
-- Functions updated:
--   1. get_product_variance_report_v4 (main report)
--   2. calc_product_theoretical_sales (helper for details_v3)
--   3. calc_prep_decomposition_factors (helper for recursive decomposition)
--   4. calc_product_writeoffs_decomposed (helper - sub-prep recursion fix)
--   5. calc_product_loss_decomposed (helper - sub-prep recursion fix)
--   6. calc_product_inpreps (helper - sub-prep recursion fix)

-- =============================================
-- 1. FIX: get_product_variance_report_v4
-- =============================================

DROP FUNCTION IF EXISTS get_product_variance_report_v4(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION get_product_variance_report_v4(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_department TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_opening_date DATE;
  v_closing_date DATE;
  v_is_current_period BOOLEAN;
  v_filter_end_date TIMESTAMPTZ;
BEGIN
  IF p_department IS NOT NULL AND p_department NOT IN ('kitchen', 'bar') THEN
    RAISE EXCEPTION 'Invalid department: %. Must be kitchen, bar, or NULL', p_department;
  END IF;

  v_opening_date := (p_start_date::DATE - INTERVAL '1 day')::DATE;
  v_closing_date := p_end_date::DATE;
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  v_is_current_period := (p_end_date::DATE >= CURRENT_DATE);

  WITH
  -- Product base info
  product_info AS (
    SELECT p.id, p.name, p.code, p.base_unit,
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department,
      COALESCE((SELECT AVG(sb.cost_per_unit) FROM storage_batches sb
         WHERE sb.item_id = p.id::TEXT AND sb.item_type = 'product' AND sb.status = 'active'), p.last_known_cost) as avg_cost
    FROM products p WHERE p.is_active = true
  ),

  -- Opening stock
  opening_stock AS (
    SELECT inv_s.item_id, inv_s.quantity as qty, inv_s.total_cost as amount
    FROM inventory_snapshots inv_s WHERE inv_s.snapshot_date = v_opening_date
  ),

  -- Received
  received AS (
    SELECT sri.item_id, SUM(sri.received_quantity) as qty,
           SUM(sri.received_quantity * COALESCE(sri.actual_base_cost, sri.ordered_base_cost)) as amount
    FROM supplierstore_receipt_items sri JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
    WHERE sr.delivery_date >= p_start_date AND sr.delivery_date < v_filter_end_date AND sr.status = 'completed'
    GROUP BY sri.item_id
  ),

  -- Completed orders
  completed_orders AS (
    SELECT DISTINCT o.id as order_id FROM orders o JOIN payments pay ON pay.order_id = o.id
    WHERE pay.status = 'completed' AND pay.created_at >= p_start_date AND pay.created_at < v_filter_end_date
  ),
  order_items_data AS (
    SELECT oi.menu_item_id, oi.variant_id, oi.quantity as order_qty, oi.department
    FROM order_items oi JOIN completed_orders co ON co.order_id = oi.order_id WHERE oi.status != 'cancelled'
  ),
  variant_compositions AS (
    SELECT mi.id as menu_item_id, (v->>'id') as variant_id, (c->>'id') as composition_id,
           (c->>'type') as composition_type, (c->>'quantity')::NUMERIC as composition_qty
    FROM menu_items mi, LATERAL jsonb_array_elements(mi.variants) as v, LATERAL jsonb_array_elements(v->'composition') as c
    WHERE mi.is_active = true
  ),

  -- Direct product sales
  direct_product_sales AS (
    SELECT vc.composition_id::UUID as product_id, SUM(oid.order_qty * vc.composition_qty) as qty
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'product' GROUP BY vc.composition_id
  ),

  -- Recipe product sales
  recipe_product_sales AS (
    SELECT rc.component_id::UUID as product_id,
           SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0)) as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe' AND rc.component_type = 'product'
    GROUP BY rc.component_id
  ),

  -- FIX: Prep orders from menu items (direct) — normalize to GRAMS
  -- Menu compositions always use "portions" for preparations
  direct_prep_orders AS (
    SELECT vc.composition_id::UUID as preparation_id,
           SUM(oid.order_qty * vc.composition_qty * COALESCE(prep.portion_size, 1)) as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN preparations prep ON prep.id = vc.composition_id::UUID
    WHERE vc.composition_type = 'preparation' GROUP BY vc.composition_id
  ),

  -- FIX: Prep orders from recipes — conditionally normalize to GRAMS
  -- rc.unit='portion' → multiply by prep.portion_size; rc.unit='gram' → keep as-is
  recipe_prep_orders AS (
    SELECT rc.component_id::UUID as preparation_id,
           SUM(oid.order_qty * vc.composition_qty * rc.quantity
               * CASE WHEN rc.unit IN ('portion', 'pcs') THEN COALESCE(prep.portion_size, 1) ELSE 1 END
               / NULLIF(r.portion_size, 0)) as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    JOIN preparations prep ON prep.id = rc.component_id::UUID
    WHERE vc.composition_type = 'recipe' AND rc.component_type = 'preparation'
    GROUP BY rc.component_id
  ),

  -- All preps consumed (now in GRAMS after fixes above)
  all_preps AS (
    SELECT preparation_id, SUM(qty) as qty FROM (
      SELECT * FROM direct_prep_orders UNION ALL SELECT * FROM recipe_prep_orders
    ) combined GROUP BY preparation_id
  ),

  -- Prep recipes (shared) — product ingredients per batch
  prep_recipes AS (
    SELECT p.id as preparation_id,
           (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output_quantity,
           pi.ingredient_id::TEXT as product_id, pi.quantity::NUMERIC as recipe_product_qty
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product' AND p.is_active = true
  ),

  -- FIX: Recursive prep decomposition — normalize sub-prep ingredients to GRAMS
  recursive_prep_decomposition AS (
    WITH RECURSIVE prep_tree AS (
      SELECT ap.preparation_id as root_prep_id, ap.preparation_id as current_prep_id, ap.qty::NUMERIC as consumed_qty, 1 as depth
      FROM all_preps ap
      UNION ALL
      SELECT pt.root_prep_id, pi.ingredient_id as current_prep_id,
        -- FIX: when sub-prep ingredient is in portions, convert to grams
        (pt.consumed_qty * pi.quantity
          * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(sub_p.portion_size, 1) ELSE 1 END
          / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        pt.depth + 1
      FROM prep_tree pt
      JOIN preparations p ON p.id = pt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      JOIN preparations sub_p ON sub_p.id = pi.ingredient_id
      WHERE pi.type = 'preparation' AND p.is_active = true AND pt.depth < 5
    )
    SELECT root_prep_id, current_prep_id, consumed_qty, depth FROM prep_tree
  ),
  products_from_preparations AS (
    SELECT pr.product_id::UUID as product_id,
           SUM(rpd.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)) as qty
    FROM recursive_prep_decomposition rpd
    JOIN prep_recipes pr ON rpd.current_prep_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  -- Theoretical sales combined
  theoretical_sales AS (
    SELECT product_id, SUM(qty) as qty FROM (
      SELECT product_id, qty FROM direct_product_sales
      UNION ALL SELECT product_id, qty FROM recipe_product_sales
      UNION ALL SELECT product_id, qty FROM products_from_preparations
    ) all_sales GROUP BY product_id
  ),

  -- =============================================
  -- WRITE-OFFS with amounts
  -- =============================================
  direct_writeoffs AS (
    SELECT (item->>'itemId') as item_id,
           SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),
  prep_writeoffs_raw AS (
    SELECT (item->>'itemId')::UUID as preparation_id, SUM((item->>'quantity')::NUMERIC) as qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemType') = 'preparation'
    GROUP BY (item->>'itemId')
  ),
  -- FIX: sub-prep recursion with unit normalization
  prep_writeoffs_decomposed AS (
    WITH RECURSIVE wo_prep_tree AS (
      SELECT pwr.preparation_id as root_prep_id, pwr.preparation_id as current_prep_id, pwr.qty::NUMERIC as consumed_qty, 1 as depth
      FROM prep_writeoffs_raw pwr
      UNION ALL
      SELECT wpt.root_prep_id, pi.ingredient_id as current_prep_id,
        (wpt.consumed_qty * pi.quantity
          * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(sub_p.portion_size, 1) ELSE 1 END
          / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        wpt.depth + 1
      FROM wo_prep_tree wpt
      JOIN preparations p ON p.id = wpt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      JOIN preparations sub_p ON sub_p.id = pi.ingredient_id
      WHERE pi.type = 'preparation' AND p.is_active = true AND wpt.depth < 5
    )
    SELECT pr.product_id as item_id,
           SUM(wpt.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)) as qty
    FROM wo_prep_tree wpt
    JOIN prep_recipes pr ON wpt.current_prep_id = pr.preparation_id
    GROUP BY pr.product_id
  ),
  combined_writeoffs AS (
    SELECT item_id, SUM(qty) as qty, SUM(amount) as amount
    FROM (
      SELECT item_id, qty, amount FROM direct_writeoffs
      UNION ALL SELECT item_id, qty, 0 as amount FROM prep_writeoffs_decomposed
    ) all_wo GROUP BY item_id
  ),

  -- =============================================
  -- LOSS with amounts
  -- =============================================
  direct_loss AS (
    SELECT (item->>'itemId') as item_id,
           SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),
  prep_loss_raw AS (
    SELECT (item->>'itemId')::UUID as preparation_id, SUM((item->>'quantity')::NUMERIC) as qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'preparation'
    GROUP BY (item->>'itemId')
  ),
  -- FIX: sub-prep recursion with unit normalization
  prep_loss_decomposed AS (
    WITH RECURSIVE loss_prep_tree AS (
      SELECT plr.preparation_id as root_prep_id, plr.preparation_id as current_prep_id, plr.qty::NUMERIC as consumed_qty, 1 as depth
      FROM prep_loss_raw plr
      UNION ALL
      SELECT lpt.root_prep_id, pi.ingredient_id as current_prep_id,
        (lpt.consumed_qty * pi.quantity
          * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(sub_p.portion_size, 1) ELSE 1 END
          / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        lpt.depth + 1
      FROM loss_prep_tree lpt
      JOIN preparations p ON p.id = lpt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      JOIN preparations sub_p ON sub_p.id = pi.ingredient_id
      WHERE pi.type = 'preparation' AND p.is_active = true AND lpt.depth < 5
    )
    SELECT pr.product_id as item_id,
           SUM(lpt.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)) as qty
    FROM loss_prep_tree lpt
    JOIN prep_recipes pr ON lpt.current_prep_id = pr.preparation_id
    GROUP BY pr.product_id
  ),
  combined_loss_from_writeoffs AS (
    SELECT item_id, SUM(qty) as qty, SUM(amount) as amount
    FROM (
      SELECT item_id, qty, amount FROM direct_loss
      UNION ALL SELECT item_id, qty, 0 as amount FROM prep_loss_decomposed
    ) all_loss GROUP BY item_id
  ),

  -- Corrections
  corrections_loss AS (
    SELECT (item->>'itemId') as item_id, SUM(ABS((item->>'quantity')::NUMERIC)) as qty,
           SUM(ABS(COALESCE((item->>'totalCost')::NUMERIC, 0))) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (item->>'itemType') = 'product' AND (item->>'quantity')::NUMERIC < 0
    GROUP BY (item->>'itemId')
  ),
  corrections_gain AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (item->>'itemType') = 'product' AND (item->>'quantity')::NUMERIC > 0
    GROUP BY (item->>'itemId')
  ),

  -- Closing stock
  closing_from_batches AS (
    SELECT sb.item_id, SUM(sb.current_quantity) as qty, SUM(sb.current_quantity * sb.cost_per_unit) as amount
    FROM storage_batches sb WHERE sb.status = 'active' AND sb.item_type = 'product' AND sb.current_quantity > 0
    GROUP BY sb.item_id
  ),
  closing_from_snapshot AS (
    SELECT inv_s.item_id, inv_s.quantity as qty, inv_s.total_cost as amount
    FROM inventory_snapshots inv_s WHERE inv_s.snapshot_date = v_closing_date
  ),
  actual_closing AS (
    SELECT item_id, qty, amount FROM closing_from_batches WHERE v_is_current_period
    UNION ALL
    SELECT item_id, qty, amount FROM closing_from_snapshot WHERE NOT v_is_current_period
  ),

  -- FIX: Products in preps — sub-prep recursion with unit normalization
  products_in_preps AS (
    WITH RECURSIVE prep_batch_tree AS (
      SELECT pb.preparation_id as root_prep_id, pb.preparation_id as current_prep_id,
             pb.current_quantity::NUMERIC as batch_qty, 1 as depth
      FROM preparation_batches pb WHERE pb.status = 'active' AND pb.current_quantity > 0
      UNION ALL
      SELECT pbt.root_prep_id, pi.ingredient_id as current_prep_id,
        (pbt.batch_qty * pi.quantity
          * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(sub_p.portion_size, 1) ELSE 1 END
          / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as batch_qty,
        pbt.depth + 1
      FROM prep_batch_tree pbt
      JOIN preparations p ON p.id = pbt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      JOIN preparations sub_p ON sub_p.id = pi.ingredient_id
      WHERE pi.type = 'preparation' AND p.is_active = true AND pbt.depth < 5
    )
    SELECT pr.product_id as item_id,
           SUM(pbt.batch_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)) as qty,
           SUM(pbt.batch_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0) * pi.avg_cost) as amount
    FROM prep_batch_tree pbt
    JOIN prep_recipes pr ON pbt.current_prep_id = pr.preparation_id
    JOIN product_info pi ON pi.id::TEXT = pr.product_id
    GROUP BY pr.product_id
  ),

  products_with_preps AS (
    SELECT DISTINCT pi.ingredient_id::TEXT as item_id FROM preparation_ingredients pi
    JOIN preparations p ON p.id = pi.preparation_id WHERE pi.type = 'product' AND p.is_active = true
  ),

  -- Product report with proper amounts
  product_report AS (
    SELECT
      pi.id as product_id, pi.name as product_name, pi.code as product_code,
      pi.base_unit as unit, pi.kpi_department as department, pi.avg_cost,
      COALESCE(os.qty, 0) as opening_qty, COALESCE(os.amount, 0) as opening_amount,
      COALESCE(r.qty, 0) as received_qty, COALESCE(r.amount, 0) as received_amount,
      -- Sales breakdown
      COALESCE(dps.qty, 0) as direct_sales_qty,
      COALESCE(rps.qty, 0) as via_recipes_qty,
      COALESCE(pfp.qty, 0) as via_preps_qty,
      COALESCE(ts.qty, 0) as sales_qty, COALESCE(ts.qty, 0) * pi.avg_cost as sales_amount,
      -- Write-offs (decomposed from preps)
      COALESCE(cw.qty, 0) as writeoffs_qty,
      COALESCE(cw.amount, 0) + (COALESCE(cw.qty, 0) - COALESCE(dwo.qty, 0)) * pi.avg_cost as writeoffs_amount,
      -- Loss and gain (decomposed from preps)
      COALESCE(clw.qty, 0) + COALESCE(cl.qty, 0) as loss_qty,
      COALESCE(clw.amount, 0) + COALESCE(cl.amount, 0) +
        (COALESCE(clw.qty, 0) - COALESCE(dl.qty, 0)) * pi.avg_cost as loss_amount,
      COALESCE(cg.qty, 0) as gain_qty, COALESCE(cg.amount, 0) as gain_amount,
      COALESCE(ac.qty, 0) as closing_qty, COALESCE(ac.amount, 0) as closing_amount,
      COALESCE(pip.qty, 0) as in_preps_qty, COALESCE(pip.amount, 0) as in_preps_amount,
      CASE WHEN pwp.item_id IS NOT NULL THEN true ELSE false END as has_preparations,
      -- Expected = Opening + Received - Sales - Loss + Gain
      (COALESCE(os.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0)
        - COALESCE(clw.qty, 0) - COALESCE(cl.qty, 0) + COALESCE(cg.qty, 0)) as expected_qty,
      (COALESCE(os.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost
        - COALESCE(clw.amount, 0) - COALESCE(cl.amount, 0)
        - (COALESCE(clw.qty, 0) - COALESCE(dl.qty, 0)) * pi.avg_cost
        + COALESCE(cg.amount, 0)) as expected_amount,
      COALESCE(ac.qty, 0) + COALESCE(pip.qty, 0) as actual_qty,
      COALESCE(ac.amount, 0) + COALESCE(pip.amount, 0) as actual_amount,
      -- Variance = Actual - Expected
      (COALESCE(ac.qty, 0) + COALESCE(pip.qty, 0))
        - (COALESCE(os.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0)
        - COALESCE(clw.qty, 0) - COALESCE(cl.qty, 0) + COALESCE(cg.qty, 0)) as variance_qty,
      (COALESCE(ac.amount, 0) + COALESCE(pip.amount, 0))
        - (COALESCE(os.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost
        - COALESCE(clw.amount, 0) - COALESCE(cl.amount, 0)
        - (COALESCE(clw.qty, 0) - COALESCE(dl.qty, 0)) * pi.avg_cost
        + COALESCE(cg.amount, 0)) as variance_amount
    FROM product_info pi
    LEFT JOIN opening_stock os ON os.item_id = pi.id::TEXT
    LEFT JOIN received r ON r.item_id = pi.id::TEXT
    LEFT JOIN direct_product_sales dps ON dps.product_id = pi.id
    LEFT JOIN recipe_product_sales rps ON rps.product_id = pi.id
    LEFT JOIN products_from_preparations pfp ON pfp.product_id = pi.id
    LEFT JOIN theoretical_sales ts ON ts.product_id = pi.id
    LEFT JOIN combined_writeoffs cw ON cw.item_id = pi.id::TEXT
    LEFT JOIN direct_writeoffs dwo ON dwo.item_id = pi.id::TEXT
    LEFT JOIN combined_loss_from_writeoffs clw ON clw.item_id = pi.id::TEXT
    LEFT JOIN direct_loss dl ON dl.item_id = pi.id::TEXT
    LEFT JOIN corrections_loss cl ON cl.item_id = pi.id::TEXT
    LEFT JOIN corrections_gain cg ON cg.item_id = pi.id::TEXT
    LEFT JOIN actual_closing ac ON ac.item_id = pi.id::TEXT
    LEFT JOIN products_in_preps pip ON pip.item_id = pi.id::TEXT
    LEFT JOIN products_with_preps pwp ON pwp.item_id = pi.id::TEXT
    WHERE (COALESCE(os.qty, 0) != 0 OR COALESCE(r.qty, 0) > 0 OR COALESCE(ts.qty, 0) > 0 OR
           COALESCE(cw.qty, 0) > 0 OR COALESCE(clw.qty, 0) > 0 OR COALESCE(cl.qty, 0) > 0 OR
           COALESCE(cg.qty, 0) > 0 OR COALESCE(ac.qty, 0) != 0 OR COALESCE(pip.qty, 0) > 0)
      AND (p_department IS NULL OR pi.kpi_department = p_department)
  )

  SELECT jsonb_build_object(
    'version', 'v4.1',
    'period', jsonb_build_object('dateFrom', p_start_date::DATE, 'dateTo', p_end_date::DATE,
      'openingSnapshotDate', v_opening_date, 'closingSnapshotDate', v_closing_date,
      'closingSource', CASE WHEN v_is_current_period THEN 'batches' ELSE 'snapshot' END,
      'isSingleDay', p_start_date::DATE = p_end_date::DATE),
    'formula', 'Expected = Opening + Received - Sales - Loss + Gain; Variance = Actual - Expected',
    'summary', (SELECT jsonb_build_object(
      'totalProducts', COUNT(*), 'productsWithActivity', COUNT(*) FILTER (WHERE sales_qty > 0 OR loss_qty > 0),
      'totalSalesAmount', ROUND(COALESCE(SUM(sales_amount), 0), 2),
      'totalWriteoffsAmount', ROUND(COALESCE(SUM(writeoffs_amount), 0), 2),
      'totalLossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
      'totalInPrepsAmount', ROUND(COALESCE(SUM(in_preps_amount), 0), 2),
      'totalVarianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2)
    ) FROM product_report),
    'products', (SELECT jsonb_agg(jsonb_build_object(
      'productId', product_id, 'productName', product_name, 'productCode', product_code,
      'unit', unit, 'department', department, 'avgCost', ROUND(avg_cost, 2),
      'opening', jsonb_build_object('quantity', ROUND(opening_qty, 3), 'amount', ROUND(opening_amount, 2)),
      'received', jsonb_build_object('quantity', ROUND(received_qty, 3), 'amount', ROUND(received_amount, 2)),
      'sales', jsonb_build_object(
        'quantity', ROUND(sales_qty, 3),
        'amount', ROUND(sales_amount, 2),
        'direct', jsonb_build_object('quantity', ROUND(direct_sales_qty, 3)),
        'viaRecipes', jsonb_build_object('quantity', ROUND(via_recipes_qty, 3)),
        'viaPreparations', jsonb_build_object('quantity', ROUND(via_preps_qty, 3))
      ),
      'writeoffs', jsonb_build_object('quantity', ROUND(writeoffs_qty, 3), 'amount', ROUND(writeoffs_amount, 2)),
      'salesWriteoffDiff', jsonb_build_object(
        'quantity', ROUND(sales_qty - writeoffs_qty, 3),
        'amount', ROUND(sales_amount - writeoffs_amount, 2)
      ),
      'loss', jsonb_build_object('quantity', ROUND(loss_qty, 3), 'amount', ROUND(loss_amount, 2)),
      'closing', jsonb_build_object('quantity', ROUND(closing_qty, 3), 'amount', ROUND(closing_amount, 2)),
      'inPreps', jsonb_build_object('quantity', ROUND(in_preps_qty, 3), 'amount', ROUND(in_preps_amount, 2)),
      'variance', jsonb_build_object('quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2)),
      'hasPreparations', has_preparations
    ) ORDER BY ABS(variance_amount) DESC) FROM product_report),
    'generatedAt', NOW()
  ) INTO v_result;
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_product_variance_report_v4(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS
'Product Variance Report V4.1 - Fixed portion_size unit normalization for portion-type preparations';

GRANT EXECUTE ON FUNCTION get_product_variance_report_v4(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;


-- =============================================
-- 2. FIX: calc_product_theoretical_sales
-- =============================================

DROP FUNCTION IF EXISTS calc_product_theoretical_sales(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION calc_product_theoretical_sales(
  p_product_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  direct_qty NUMERIC,
  via_recipes_qty NUMERIC,
  via_preps_qty NUMERIC,
  total_qty NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH
  completed_orders AS (
    SELECT DISTINCT o.id as order_id
    FROM orders o JOIN payments pay ON pay.order_id = o.id
    WHERE pay.status = 'completed'
      AND pay.created_at >= p_start_date
      AND pay.created_at < (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ
  ),
  order_items_data AS (
    SELECT oi.menu_item_id, oi.variant_id, oi.quantity as order_qty
    FROM order_items oi JOIN completed_orders co ON co.order_id = oi.order_id
    WHERE oi.status != 'cancelled'
  ),
  variant_compositions AS (
    SELECT mi.id as menu_item_id, (v->>'id') as variant_id, (c->>'id') as composition_id,
           (c->>'type') as composition_type, (c->>'quantity')::NUMERIC as composition_qty
    FROM menu_items mi,
    LATERAL jsonb_array_elements(mi.variants) as v,
    LATERAL jsonb_array_elements(v->'composition') as c
    WHERE mi.is_active = true
  ),

  -- 1. Direct product sales
  direct_product_sales AS (
    SELECT SUM(oid.order_qty * vc.composition_qty)::NUMERIC as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_id = p_product_id::TEXT AND vc.composition_type = 'product'
  ),

  -- 2. Recipe product sales
  recipe_product_sales AS (
    SELECT SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0))::NUMERIC as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe' AND rc.component_id = p_product_id::TEXT AND rc.component_type = 'product'
  ),

  -- FIX: Prep orders — normalize to GRAMS
  direct_prep_orders AS (
    SELECT vc.composition_id::UUID as preparation_id,
           SUM(oid.order_qty * vc.composition_qty * COALESCE(prep.portion_size, 1))::NUMERIC as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN preparations prep ON prep.id = vc.composition_id::UUID
    WHERE vc.composition_type = 'preparation'
    GROUP BY vc.composition_id
  ),
  recipe_prep_orders AS (
    SELECT rc.component_id::UUID as preparation_id,
           SUM(oid.order_qty * vc.composition_qty * rc.quantity
               * CASE WHEN rc.unit IN ('portion', 'pcs') THEN COALESCE(prep.portion_size, 1) ELSE 1 END
               / NULLIF(r.portion_size, 0))::NUMERIC as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    JOIN preparations prep ON prep.id = rc.component_id::UUID
    WHERE vc.composition_type = 'recipe' AND rc.component_type = 'preparation'
    GROUP BY rc.component_id
  ),
  all_preps_consumed AS (
    SELECT preparation_id, SUM(qty)::NUMERIC as qty
    FROM (SELECT * FROM direct_prep_orders UNION ALL SELECT * FROM recipe_prep_orders) combined
    GROUP BY preparation_id
  ),

  -- FIX: Recursive decomposition with sub-prep unit normalization
  recursive_prep_decomposition AS (
    WITH RECURSIVE prep_tree AS (
      SELECT apc.preparation_id as root_prep_id, apc.preparation_id as current_prep_id,
             apc.qty::NUMERIC as consumed_qty, 1 as depth
      FROM all_preps_consumed apc
      UNION ALL
      SELECT pt.root_prep_id, pi.ingredient_id as current_prep_id,
        (pt.consumed_qty * pi.quantity
          * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(sub_p.portion_size, 1) ELSE 1 END
          / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        pt.depth + 1
      FROM prep_tree pt
      JOIN preparations p ON p.id = pt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      JOIN preparations sub_p ON sub_p.id = pi.ingredient_id
      WHERE pi.type = 'preparation' AND p.is_active = true AND pt.depth < 5
    )
    SELECT root_prep_id, current_prep_id, consumed_qty, depth FROM prep_tree
  ),
  prep_recipes AS (
    SELECT p.id as preparation_id,
           (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output_quantity,
           pi.ingredient_id::TEXT as product_id, pi.quantity::NUMERIC as recipe_product_qty
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product' AND p.is_active = true
  ),
  products_from_preparations AS (
    SELECT SUM(rpd.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0))::NUMERIC as qty
    FROM recursive_prep_decomposition rpd
    JOIN prep_recipes pr ON rpd.current_prep_id = pr.preparation_id
    WHERE pr.product_id = p_product_id::TEXT
  )

  SELECT
    COALESCE((SELECT qty FROM direct_product_sales), 0) as direct_qty,
    COALESCE((SELECT qty FROM recipe_product_sales), 0) as via_recipes_qty,
    COALESCE((SELECT qty FROM products_from_preparations), 0) as via_preps_qty,
    COALESCE((SELECT qty FROM direct_product_sales), 0) +
    COALESCE((SELECT qty FROM recipe_product_sales), 0) +
    COALESCE((SELECT qty FROM products_from_preparations), 0) as total_qty;
END;
$$;

COMMENT ON FUNCTION calc_product_theoretical_sales(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculates theoretical product consumption from orders. V2: Fixed portion_size unit normalization.';

GRANT EXECUTE ON FUNCTION calc_product_theoretical_sales(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- =============================================
-- 3. FIX: calc_prep_decomposition_factors
-- =============================================

DROP FUNCTION IF EXISTS calc_prep_decomposition_factors(UUID);

CREATE OR REPLACE FUNCTION calc_prep_decomposition_factors(p_product_id UUID)
RETURNS TABLE (
  preparation_id UUID,
  preparation_name TEXT,
  total_output_qty NUMERIC,
  product_qty_per_batch NUMERIC,
  factor NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
  direct_product_preps AS (
    SELECT p.id as prep_id, p.name as prep_name,
      (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output,
      pi.quantity::NUMERIC as product_qty,
      (pi.quantity / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as decomp_factor,
      1 as depth
    FROM preparations p
    JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.ingredient_id = p_product_id AND pi.type = 'product' AND p.is_active = true
  ),
  prep_tree AS (
    SELECT dpp.prep_id, dpp.prep_name, dpp.prep_output, dpp.product_qty, dpp.decomp_factor, dpp.depth
    FROM direct_product_preps dpp
    UNION ALL
    -- FIX: normalize sub-prep ingredient quantity to grams
    SELECT parent_p.id as prep_id, parent_p.name as prep_name,
      (parent_p.output_quantity * COALESCE(parent_p.portion_size, 1))::NUMERIC as prep_output,
      (pt.product_qty * pi.quantity
        * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(child_info.portion_size, 1) ELSE 1 END
        / NULLIF(pt.prep_output, 0))::NUMERIC as product_qty,
      (pt.decomp_factor * pi.quantity
        * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(child_info.portion_size, 1) ELSE 1 END
        / NULLIF(parent_p.output_quantity * COALESCE(parent_p.portion_size, 1), 0))::NUMERIC as decomp_factor,
      pt.depth + 1
    FROM prep_tree pt
    JOIN preparation_ingredients pi ON pi.ingredient_id = pt.prep_id AND pi.type = 'preparation'
    JOIN preparations parent_p ON parent_p.id = pi.preparation_id
    JOIN preparations child_info ON child_info.id = pt.prep_id
    WHERE parent_p.is_active = true AND pt.depth < 5
  )
  SELECT pt.prep_id as preparation_id, pt.prep_name as preparation_name,
    pt.prep_output as total_output_qty, pt.product_qty as product_qty_per_batch,
    pt.decomp_factor as factor
  FROM prep_tree pt;
END;
$$;

COMMENT ON FUNCTION calc_prep_decomposition_factors(UUID) IS
'Returns decomposition factors for preparations using a product. V2: Fixed portion_size unit normalization.';

GRANT EXECUTE ON FUNCTION calc_prep_decomposition_factors(UUID) TO authenticated;


-- =============================================
-- 4. FIX: calc_product_writeoffs_decomposed
-- =============================================

DROP FUNCTION IF EXISTS calc_product_writeoffs_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION calc_product_writeoffs_decomposed(
  p_product_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ
)
RETURNS TABLE (direct_qty NUMERIC, from_preps_qty NUMERIC, total_qty NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE v_filter_end_date TIMESTAMPTZ;
BEGIN
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  RETURN QUERY
  WITH
  direct_writeoffs AS (
    SELECT SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemType') = 'product' AND (item->>'itemId')::UUID = p_product_id
  ),
  prep_writeoffs_raw AS (
    SELECT (item->>'itemId')::UUID as preparation_id, SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemType') = 'preparation'
    GROUP BY (item->>'itemId')
  ),
  prep_writeoffs_decomposed AS (
    WITH RECURSIVE wo_prep_tree AS (
      SELECT pwr.preparation_id as root_prep_id, pwr.preparation_id as current_prep_id,
             pwr.qty::NUMERIC as consumed_qty, 1 as depth
      FROM prep_writeoffs_raw pwr
      UNION ALL
      -- FIX: sub-prep unit normalization
      SELECT wpt.root_prep_id, pi.ingredient_id as current_prep_id,
        (wpt.consumed_qty * pi.quantity
          * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(sub_p.portion_size, 1) ELSE 1 END
          / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        wpt.depth + 1
      FROM wo_prep_tree wpt
      JOIN preparations p ON p.id = wpt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      JOIN preparations sub_p ON sub_p.id = pi.ingredient_id
      WHERE pi.type = 'preparation' AND p.is_active = true AND wpt.depth < 5
    ),
    prep_recipes AS (
      SELECT p.id as preparation_id,
             (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output_quantity,
             pi.ingredient_id::TEXT as product_id, pi.quantity::NUMERIC as recipe_product_qty
      FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'product' AND p.is_active = true
    )
    SELECT SUM(wpt.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0))::NUMERIC as qty
    FROM wo_prep_tree wpt
    JOIN prep_recipes pr ON wpt.current_prep_id = pr.preparation_id
    WHERE pr.product_id = p_product_id::TEXT
  )
  SELECT
    COALESCE((SELECT qty FROM direct_writeoffs), 0) as direct_qty,
    COALESCE((SELECT qty FROM prep_writeoffs_decomposed), 0) as from_preps_qty,
    COALESCE((SELECT qty FROM direct_writeoffs), 0) +
    COALESCE((SELECT qty FROM prep_writeoffs_decomposed), 0) as total_qty;
END;
$$;

COMMENT ON FUNCTION calc_product_writeoffs_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculates actual write-offs (sales_consumption) with prep decomposition. V2: Fixed sub-prep unit normalization.';

GRANT EXECUTE ON FUNCTION calc_product_writeoffs_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- =============================================
-- 5. FIX: calc_product_loss_decomposed
-- =============================================

DROP FUNCTION IF EXISTS calc_product_loss_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION calc_product_loss_decomposed(
  p_product_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  direct_loss_qty NUMERIC,
  from_preps_loss_qty NUMERIC,
  corrections_loss_qty NUMERIC,
  total_loss_qty NUMERIC,
  corrections_gain_qty NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE v_filter_end_date TIMESTAMPTZ;
BEGIN
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  RETURN QUERY
  WITH
  direct_loss AS (
    SELECT SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'product' AND (item->>'itemId')::UUID = p_product_id
  ),
  prep_loss_raw AS (
    SELECT (item->>'itemId')::UUID as preparation_id, SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'preparation'
    GROUP BY (item->>'itemId')
  ),
  prep_loss_decomposed AS (
    WITH RECURSIVE loss_prep_tree AS (
      SELECT plr.preparation_id as root_prep_id, plr.preparation_id as current_prep_id,
             plr.qty::NUMERIC as consumed_qty, 1 as depth
      FROM prep_loss_raw plr
      UNION ALL
      -- FIX: sub-prep unit normalization
      SELECT lpt.root_prep_id, pi.ingredient_id as current_prep_id,
        (lpt.consumed_qty * pi.quantity
          * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(sub_p.portion_size, 1) ELSE 1 END
          / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        lpt.depth + 1
      FROM loss_prep_tree lpt
      JOIN preparations p ON p.id = lpt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      JOIN preparations sub_p ON sub_p.id = pi.ingredient_id
      WHERE pi.type = 'preparation' AND p.is_active = true AND lpt.depth < 5
    ),
    prep_recipes AS (
      SELECT p.id as preparation_id,
             (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output_quantity,
             pi.ingredient_id::TEXT as product_id, pi.quantity::NUMERIC as recipe_product_qty
      FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'product' AND p.is_active = true
    )
    SELECT SUM(lpt.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0))::NUMERIC as qty
    FROM loss_prep_tree lpt
    JOIN prep_recipes pr ON lpt.current_prep_id = pr.preparation_id
    WHERE pr.product_id = p_product_id::TEXT
  ),
  neg_corrections AS (
    SELECT SUM(ABS((item->>'quantity')::NUMERIC))::NUMERIC as qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date AND so.status = 'confirmed'
      AND (item->>'itemType') = 'product' AND (item->>'itemId')::UUID = p_product_id
      AND (item->>'quantity')::NUMERIC < 0
  ),
  pos_corrections AS (
    SELECT SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date AND so.status = 'confirmed'
      AND (item->>'itemType') = 'product' AND (item->>'itemId')::UUID = p_product_id
      AND (item->>'quantity')::NUMERIC > 0
  )
  SELECT
    COALESCE((SELECT qty FROM direct_loss), 0) as direct_loss_qty,
    COALESCE((SELECT qty FROM prep_loss_decomposed), 0) as from_preps_loss_qty,
    COALESCE((SELECT qty FROM neg_corrections), 0) as corrections_loss_qty,
    COALESCE((SELECT qty FROM direct_loss), 0) +
    COALESCE((SELECT qty FROM prep_loss_decomposed), 0) +
    COALESCE((SELECT qty FROM neg_corrections), 0) as total_loss_qty,
    COALESCE((SELECT qty FROM pos_corrections), 0) as corrections_gain_qty;
END;
$$;

COMMENT ON FUNCTION calc_product_loss_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculates product losses with prep decomposition. V2: Fixed sub-prep unit normalization.';

GRANT EXECUTE ON FUNCTION calc_product_loss_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- =============================================
-- 6. FIX: calc_product_inpreps
-- =============================================

DROP FUNCTION IF EXISTS calc_product_inpreps(UUID);

CREATE OR REPLACE FUNCTION calc_product_inpreps(p_product_id UUID)
RETURNS TABLE (qty NUMERIC, amount NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE v_product_avg_cost NUMERIC;
BEGIN
  SELECT COALESCE(
    (SELECT AVG(sb.cost_per_unit) FROM storage_batches sb
     WHERE sb.item_id = p_product_id::TEXT AND sb.item_type = 'product' AND sb.status = 'active'),
    (SELECT last_known_cost FROM products WHERE id = p_product_id)
  ) INTO v_product_avg_cost;

  RETURN QUERY
  WITH RECURSIVE
  prep_batch_tree AS (
    SELECT pb.preparation_id as root_prep_id, pb.preparation_id as current_prep_id,
           pb.current_quantity::NUMERIC as batch_qty, 1 as depth
    FROM preparation_batches pb WHERE pb.status = 'active' AND pb.current_quantity > 0
    UNION ALL
    -- FIX: sub-prep unit normalization
    SELECT pbt.root_prep_id, pi.ingredient_id as current_prep_id,
      (pbt.batch_qty * pi.quantity
        * CASE WHEN pi.unit IN ('portion', 'pcs') THEN COALESCE(sub_p.portion_size, 1) ELSE 1 END
        / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as batch_qty,
      pbt.depth + 1
    FROM prep_batch_tree pbt
    JOIN preparations p ON p.id = pbt.current_prep_id
    JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    JOIN preparations sub_p ON sub_p.id = pi.ingredient_id
    WHERE pi.type = 'preparation' AND p.is_active = true AND pbt.depth < 5
  ),
  prep_recipes AS (
    SELECT p.id as preparation_id,
           (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output_quantity,
           pi.ingredient_id::TEXT as product_id, pi.quantity::NUMERIC as recipe_product_qty
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product' AND p.is_active = true
  ),
  product_in_preps AS (
    SELECT SUM(pbt.batch_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0))::NUMERIC as total_qty
    FROM prep_batch_tree pbt
    JOIN prep_recipes pr ON pbt.current_prep_id = pr.preparation_id
    WHERE pr.product_id = p_product_id::TEXT
  )
  SELECT
    COALESCE((SELECT total_qty FROM product_in_preps), 0) as qty,
    COALESCE((SELECT total_qty FROM product_in_preps), 0) * COALESCE(v_product_avg_cost, 0) as amount;
END;
$$;

COMMENT ON FUNCTION calc_product_inpreps(UUID) IS
'Calculates product quantity in active prep batches. V2: Fixed sub-prep unit normalization.';

GRANT EXECUTE ON FUNCTION calc_product_inpreps(UUID) TO authenticated;
