-- Migration: 198_snapshot_inpreps_columns
-- Description: Add in_preps columns to inventory_snapshots + update trigger + update variance functions
-- Date: 2026-03-10
--
-- CONTEXT: Opening InPreps was estimated from preparation_batches (migration 197).
-- This migration makes it exact by storing InPreps data during Shift Close.
-- Variance report checks: if in_preps_quantity IS NOT NULL → use exact, else → fallback to estimation.
--
-- Changes:
-- 1. ALTER TABLE: add in_preps_quantity, in_preps_cost columns (NULL = no data)
-- 2. Update trigger: calculate InPreps per product at shift close using calc_opening_inpreps_bulk
-- 3. Update get_product_variance_report_v4 to prefer snapshot InPreps
-- 4. Update get_product_variance_details_v3 to prefer snapshot InPreps

-- ============================================================================
-- PART 1: Add columns
-- ============================================================================

ALTER TABLE inventory_snapshots
  ADD COLUMN IF NOT EXISTS in_preps_quantity NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS in_preps_cost NUMERIC DEFAULT NULL;

COMMENT ON COLUMN inventory_snapshots.in_preps_quantity IS 'Product quantity frozen in preparations at snapshot time. NULL = no data (pre-migration snapshots)';
COMMENT ON COLUMN inventory_snapshots.in_preps_cost IS 'Cost of product frozen in preparations at snapshot time. NULL = no data';

-- ============================================================================
-- PART 2: Update trigger to store InPreps
-- ============================================================================

CREATE OR REPLACE FUNCTION create_inventory_snapshot_on_shift_close()
RETURNS TRIGGER AS $$
DECLARE
  v_snapshot_date DATE;
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    v_snapshot_date := COALESCE(NEW.end_time, NOW())::DATE;

    -- 1. Snapshot PRODUCTS (raw stock)
    INSERT INTO inventory_snapshots (
      snapshot_date, item_id, item_type, department, unit, quantity, total_cost, average_cost, source, source_document_id
    )
    SELECT
      v_snapshot_date,
      sb.item_id,
      'product' as item_type,
      p.used_in_departments[1] as department,
      p.base_unit as unit,
      SUM(sb.current_quantity) as quantity,
      SUM(sb.current_quantity * sb.cost_per_unit) as total_cost,
      CASE WHEN SUM(sb.current_quantity) > 0
           THEN SUM(sb.current_quantity * sb.cost_per_unit) / SUM(sb.current_quantity)
           ELSE 0 END as average_cost,
      'shift_close' as source,
      NEW.id::TEXT as source_document_id
    FROM storage_batches sb
    LEFT JOIN products p ON p.id::TEXT = sb.item_id
    WHERE sb.status = 'active'
      AND sb.item_type = 'product'
      AND sb.current_quantity != 0
    GROUP BY sb.item_id, p.used_in_departments[1], p.base_unit
    ON CONFLICT (snapshot_date, item_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      total_cost = EXCLUDED.total_cost,
      average_cost = EXCLUDED.average_cost,
      source = EXCLUDED.source,
      source_document_id = EXCLUDED.source_document_id,
      updated_at = NOW();

    -- 2. Snapshot PREPARATIONS
    INSERT INTO inventory_snapshots (
      snapshot_date, item_id, item_type, department, unit, quantity, total_cost, average_cost, source, source_document_id
    )
    SELECT
      v_snapshot_date,
      pb.preparation_id as item_id,
      'preparation' as item_type,
      pr.department as department,
      pr.output_unit as unit,
      SUM(pb.current_quantity) as quantity,
      SUM(pb.current_quantity * pb.cost_per_unit) as total_cost,
      CASE WHEN SUM(pb.current_quantity) > 0
           THEN SUM(pb.current_quantity * pb.cost_per_unit) / SUM(pb.current_quantity)
           ELSE 0 END as average_cost,
      'shift_close' as source,
      NEW.id::TEXT as source_document_id
    FROM preparation_batches pb
    LEFT JOIN preparations pr ON pr.id = pb.preparation_id
    WHERE pb.status = 'active'
      AND pb.current_quantity > 0
    GROUP BY pb.preparation_id, pr.department, pr.output_unit
    ON CONFLICT (snapshot_date, item_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      total_cost = EXCLUDED.total_cost,
      average_cost = EXCLUDED.average_cost,
      source = EXCLUDED.source,
      source_document_id = EXCLUDED.source_document_id,
      updated_at = NOW();

    -- 3. Calculate InPreps per PRODUCT and store in snapshot
    -- Uses calc_opening_inpreps_bulk which at shift close time gives exact data
    UPDATE inventory_snapshots snap
    SET in_preps_quantity = oip.qty,
        in_preps_cost = oip.amount
    FROM calc_opening_inpreps_bulk(v_snapshot_date) oip
    WHERE snap.snapshot_date = v_snapshot_date
      AND snap.item_id = oip.item_id
      AND snap.item_type = 'product';

    -- 4. Insert InPreps-only products (have product in preps but no raw stock)
    INSERT INTO inventory_snapshots (
      snapshot_date, item_id, item_type, department, unit,
      quantity, total_cost, average_cost,
      in_preps_quantity, in_preps_cost,
      source, source_document_id
    )
    SELECT
      v_snapshot_date,
      oip.item_id,
      'product',
      COALESCE(p.used_in_departments[1], 'kitchen'),
      p.base_unit,
      0, 0, 0,
      oip.qty,
      oip.amount,
      'shift_close',
      NEW.id::TEXT
    FROM calc_opening_inpreps_bulk(v_snapshot_date) oip
    JOIN products p ON p.id::TEXT = oip.item_id
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_snapshots s
      WHERE s.snapshot_date = v_snapshot_date AND s.item_id = oip.item_id AND s.item_type = 'product'
    )
    AND oip.qty > 0
    ON CONFLICT (snapshot_date, item_id)
    DO UPDATE SET
      in_preps_quantity = EXCLUDED.in_preps_quantity,
      in_preps_cost = EXCLUDED.in_preps_cost,
      updated_at = NOW();

    RAISE NOTICE 'Inventory snapshot with InPreps created for date % (shift %)', v_snapshot_date, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_inventory_snapshot_on_shift_close() IS
  'Creates inventory snapshots for products (with InPreps), preparations when shift completes';

-- ============================================================================
-- PART 3: Update main report to prefer snapshot InPreps
-- ============================================================================
-- Key change: COALESCE(os.in_preps_quantity, oi.qty, 0)
-- If snapshot has InPreps → exact data from shift close
-- If NULL → fallback to calc_opening_inpreps_bulk estimation

CREATE OR REPLACE FUNCTION get_product_variance_report_v4(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_department TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_opening_date DATE;
  v_closing_date DATE;
  v_is_current_period BOOLEAN;
  v_filter_end_date TIMESTAMPTZ;
BEGIN
  IF p_department IS NOT NULL AND p_department NOT IN ('kitchen', 'bar') THEN
    RAISE EXCEPTION 'Invalid department value. Must be kitchen, bar, or NULL';
  END IF;

  v_opening_date := (p_start_date::DATE - INTERVAL '1 day')::DATE;
  v_closing_date := p_end_date::DATE;
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  v_is_current_period := (p_end_date::DATE >= CURRENT_DATE);

  WITH
  product_info AS (
    SELECT p.id, p.name, p.code, p.base_unit,
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department,
      COALESCE((SELECT AVG(sb.cost_per_unit) FROM storage_batches sb
         WHERE sb.item_id = p.id::TEXT AND sb.item_type = 'product' AND sb.status = 'active'), p.last_known_cost) as avg_cost
    FROM products p WHERE p.is_active = true
  ),
  prep_recipes AS (
    SELECT p.id as preparation_id,
           (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output_quantity,
           pi.ingredient_id::TEXT as product_id, pi.quantity::NUMERIC as recipe_product_qty
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product' AND p.is_active = true
  ),
  -- Opening: now includes in_preps columns from snapshot
  opening_stock AS (
    SELECT inv_s.item_id, inv_s.quantity as qty, inv_s.total_cost as amount,
           inv_s.in_preps_quantity, inv_s.in_preps_cost
    FROM inventory_snapshots inv_s WHERE inv_s.snapshot_date = v_opening_date
  ),
  -- Estimated InPreps (fallback when snapshot has no InPreps data)
  opening_inpreps AS (
    SELECT * FROM calc_opening_inpreps_bulk(v_opening_date)
  ),
  received AS (
    SELECT sri.item_id, SUM(sri.received_quantity) as qty,
           SUM(sri.received_quantity * COALESCE(sri.actual_base_cost, sri.ordered_base_cost)) as amount
    FROM supplierstore_receipt_items sri JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
    WHERE sr.delivery_date >= p_start_date AND sr.delivery_date < v_filter_end_date AND sr.status = 'completed'
    GROUP BY sri.item_id
  ),
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
  direct_product_sales AS (
    SELECT vc.composition_id::UUID as product_id, SUM(oid.order_qty * vc.composition_qty) as qty
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'product' GROUP BY vc.composition_id
  ),
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
  direct_prep_orders AS (
    SELECT vc.composition_id::UUID as preparation_id,
           SUM(oid.order_qty * vc.composition_qty * COALESCE(prep.portion_size, 1)) as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN preparations prep ON prep.id = vc.composition_id::UUID
    WHERE vc.composition_type = 'preparation' GROUP BY vc.composition_id
  ),
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
  all_preps AS (
    SELECT preparation_id, SUM(qty) as qty FROM (
      SELECT * FROM direct_prep_orders UNION ALL SELECT * FROM recipe_prep_orders
    ) combined GROUP BY preparation_id
  ),
  recursive_prep_decomposition AS (
    WITH RECURSIVE prep_tree AS (
      SELECT ap.preparation_id as root_prep_id, ap.preparation_id as current_prep_id, ap.qty::NUMERIC as consumed_qty, 1 as depth
      FROM all_preps ap
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
  products_from_preparations AS (
    SELECT pr.product_id::UUID as product_id,
           SUM(rpd.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)) as qty
    FROM recursive_prep_decomposition rpd
    JOIN prep_recipes pr ON rpd.current_prep_id = pr.preparation_id
    GROUP BY pr.product_id
  ),
  theoretical_sales AS (
    SELECT product_id, SUM(qty) as qty FROM (
      SELECT product_id, qty FROM direct_product_sales
      UNION ALL SELECT product_id, qty FROM recipe_product_sales
      UNION ALL SELECT product_id, qty FROM products_from_preparations
    ) all_sales GROUP BY product_id
  ),
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
  product_report AS (
    SELECT
      pi.id as product_id, pi.name as product_name, pi.code as product_code,
      pi.base_unit as unit, pi.kpi_department as department, pi.avg_cost,
      COALESCE(os.qty, 0) as opening_raw_qty, COALESCE(os.amount, 0) as opening_raw_amount,
      -- Prefer snapshot InPreps (exact), fallback to estimation
      COALESCE(os.in_preps_quantity, oi.qty, 0) as opening_inpreps_qty,
      COALESCE(os.in_preps_cost, oi.amount, 0) as opening_inpreps_amount,
      COALESCE(os.qty, 0) + COALESCE(os.in_preps_quantity, oi.qty, 0) as opening_qty,
      COALESCE(os.amount, 0) + COALESCE(os.in_preps_cost, oi.amount, 0) as opening_amount,
      os.in_preps_quantity IS NULL AND oi.qty IS NOT NULL as opening_inpreps_is_estimate,
      COALESCE(r.qty, 0) as received_qty, COALESCE(r.amount, 0) as received_amount,
      COALESCE(dps.qty, 0) as direct_sales_qty,
      COALESCE(rps.qty, 0) as via_recipes_qty,
      COALESCE(pfp.qty, 0) as via_preps_qty,
      COALESCE(ts.qty, 0) as sales_qty, COALESCE(ts.qty, 0) * pi.avg_cost as sales_amount,
      COALESCE(cw.qty, 0) as writeoffs_qty,
      COALESCE(cw.amount, 0) + (COALESCE(cw.qty, 0) - COALESCE(dwo.qty, 0)) * pi.avg_cost as writeoffs_amount,
      COALESCE(clw.qty, 0) + COALESCE(cl.qty, 0) as loss_qty,
      COALESCE(clw.amount, 0) + COALESCE(cl.amount, 0) +
        (COALESCE(clw.qty, 0) - COALESCE(dl.qty, 0)) * pi.avg_cost as loss_amount,
      COALESCE(cg.qty, 0) as gain_qty, COALESCE(cg.amount, 0) as gain_amount,
      COALESCE(ac.qty, 0) as closing_qty, COALESCE(ac.amount, 0) as closing_amount,
      COALESCE(pip.qty, 0) as in_preps_qty, COALESCE(pip.amount, 0) as in_preps_amount,
      CASE WHEN pwp.item_id IS NOT NULL THEN true ELSE false END as has_preparations,
      (COALESCE(os.qty, 0) + COALESCE(os.in_preps_quantity, oi.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0)
        - COALESCE(clw.qty, 0) - COALESCE(cl.qty, 0) + COALESCE(cg.qty, 0)) as expected_qty,
      (COALESCE(os.amount, 0) + COALESCE(os.in_preps_cost, oi.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost
        - COALESCE(clw.amount, 0) - COALESCE(cl.amount, 0)
        - (COALESCE(clw.qty, 0) - COALESCE(dl.qty, 0)) * pi.avg_cost
        + COALESCE(cg.amount, 0)) as expected_amount,
      COALESCE(ac.qty, 0) + COALESCE(pip.qty, 0) as actual_qty,
      COALESCE(ac.amount, 0) + COALESCE(pip.amount, 0) as actual_amount,
      (COALESCE(ac.qty, 0) + COALESCE(pip.qty, 0))
        - (COALESCE(os.qty, 0) + COALESCE(os.in_preps_quantity, oi.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0)
        - COALESCE(clw.qty, 0) - COALESCE(cl.qty, 0) + COALESCE(cg.qty, 0)) as variance_qty,
      (COALESCE(ac.amount, 0) + COALESCE(pip.amount, 0))
        - (COALESCE(os.amount, 0) + COALESCE(os.in_preps_cost, oi.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost
        - COALESCE(clw.amount, 0) - COALESCE(cl.amount, 0)
        - (COALESCE(clw.qty, 0) - COALESCE(dl.qty, 0)) * pi.avg_cost
        + COALESCE(cg.amount, 0)) as variance_amount
    FROM product_info pi
    LEFT JOIN opening_stock os ON os.item_id = pi.id::TEXT
    LEFT JOIN opening_inpreps oi ON oi.item_id = pi.id::TEXT
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
    WHERE (COALESCE(os.qty, 0) != 0 OR COALESCE(os.in_preps_quantity, oi.qty, 0) > 0 OR COALESCE(r.qty, 0) > 0 OR COALESCE(ts.qty, 0) > 0 OR
           COALESCE(cw.qty, 0) > 0 OR COALESCE(clw.qty, 0) > 0 OR COALESCE(cl.qty, 0) > 0 OR
           COALESCE(cg.qty, 0) > 0 OR COALESCE(ac.qty, 0) != 0 OR COALESCE(pip.qty, 0) > 0)
      AND (p_department IS NULL OR pi.kpi_department = p_department)
  )

  SELECT jsonb_build_object(
    'version', 'v4.3',
    'period', jsonb_build_object('dateFrom', p_start_date::DATE, 'dateTo', p_end_date::DATE,
      'openingSnapshotDate', v_opening_date, 'closingSnapshotDate', v_closing_date,
      'closingSource', CASE WHEN v_is_current_period THEN 'batches' ELSE 'snapshot' END,
      'isSingleDay', p_start_date::DATE = p_end_date::DATE),
    'formula', 'Expected = Opening(raw+inPreps) + Received - Sales - Loss + Gain; Variance = Actual - Expected',
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
      'opening', jsonb_build_object(
        'quantity', ROUND(opening_qty, 3), 'amount', ROUND(opening_amount, 2),
        'rawStock', jsonb_build_object('quantity', ROUND(opening_raw_qty, 3), 'amount', ROUND(opening_raw_amount, 2)),
        'inPreps', jsonb_build_object('quantity', ROUND(opening_inpreps_qty, 3), 'amount', ROUND(opening_inpreps_amount, 2),
          'isEstimate', opening_inpreps_is_estimate)
      ),
      'received', jsonb_build_object('quantity', ROUND(received_qty, 3), 'amount', ROUND(received_amount, 2)),
      'sales', jsonb_build_object(
        'quantity', ROUND(sales_qty, 3), 'amount', ROUND(sales_amount, 2),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_product_variance_report_v4(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS
  'Product variance report v4.3 - Opening InPreps: prefer snapshot, fallback to estimation';

-- ============================================================================
-- PART 4: Update detail function to prefer snapshot InPreps
-- ============================================================================
-- Same COALESCE pattern as main report:
-- COALESCE(snapshot.in_preps_quantity, estimation.qty, 0)

CREATE OR REPLACE FUNCTION get_product_variance_details_v3(
  p_product_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_opening_date DATE;
  v_product_avg_cost NUMERIC;
  v_filter_end_date TIMESTAMPTZ;
BEGIN
  v_opening_date := (p_start_date::DATE - INTERVAL '1 day')::DATE;
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ;

  SELECT COALESCE(
    (SELECT AVG(sb.cost_per_unit) FROM storage_batches sb
     WHERE sb.item_id = p_product_id::TEXT AND sb.item_type = 'product' AND sb.status = 'active'),
    (SELECT last_known_cost FROM products WHERE id = p_product_id)
  ) INTO v_product_avg_cost;

  WITH
  product_info AS (
    SELECT p.id, p.name, p.code, p.base_unit, COALESCE(p.used_in_departments[1], 'kitchen') as department
    FROM products p WHERE p.id = p_product_id AND p.is_active = true
  ),
  opening_snapshot AS (
    SELECT inv_s.quantity, inv_s.total_cost as amount, inv_s.snapshot_date, inv_s.source, inv_s.source_document_id,
      inv_s.in_preps_quantity, inv_s.in_preps_cost,
      (SELECT inv_d.document_number FROM inventory_documents inv_d WHERE inv_d.id::TEXT = inv_s.source_document_id LIMIT 1) as document_number
    FROM inventory_snapshots inv_s WHERE inv_s.item_id = p_product_id::TEXT AND inv_s.snapshot_date = v_opening_date LIMIT 1
  ),
  prep_recipes AS (
    SELECT p.id as preparation_id, p.name as preparation_name, p.output_quantity, p.portion_type, p.portion_size,
           pi.quantity as product_qty_per_batch
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.ingredient_id = p_product_id AND pi.type = 'product' AND p.is_active = true
  ),
  opening_inpreps_details AS (
    SELECT pb.preparation_id, pr.preparation_name, pb.production_date::DATE as batch_date,
      (CASE WHEN pb.status = 'active' THEN pb.current_quantity ELSE pb.initial_quantity END)
        * pr.product_qty_per_batch / NULLIF(pr.output_quantity * COALESCE(pr.portion_size, 1), 0) as product_qty,
      (CASE WHEN pb.status = 'active' THEN pb.current_quantity ELSE pb.initial_quantity END)
        * pr.product_qty_per_batch / NULLIF(pr.output_quantity * COALESCE(pr.portion_size, 1), 0) * v_product_avg_cost as product_cost
    FROM preparation_batches pb
    JOIN preparations p ON p.id = pb.preparation_id
    JOIN prep_recipes pr ON pr.preparation_id = pb.preparation_id
    WHERE pb.production_date::DATE <= v_opening_date
      AND (pb.status = 'active' OR pb.updated_at::DATE > v_opening_date)
      AND pb.initial_quantity > 0
    ORDER BY pb.production_date
  ),
  opening_inpreps_totals AS (
    SELECT COALESCE(SUM(product_qty), 0) as qty, COALESCE(SUM(product_cost), 0) as amount FROM opening_inpreps_details
  ),
  received_items AS (
    SELECT sr.id as receipt_id, sr.receipt_number, sr.delivery_date, COALESCE(c.name, 'Unknown Supplier') as supplier_name,
      sri.received_quantity, COALESCE(sri.actual_base_cost, sri.ordered_base_cost) as unit_cost,
      sri.received_quantity * COALESCE(sri.actual_base_cost, sri.ordered_base_cost) as total_cost
    FROM supplierstore_receipt_items sri
    JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
    LEFT JOIN supplierstore_orders po ON po.id = sr.purchase_order_id
    LEFT JOIN counteragents c ON c.id = po.supplier_id::UUID
    WHERE sri.item_id = p_product_id::TEXT AND sr.delivery_date >= p_start_date AND sr.delivery_date < v_filter_end_date AND sr.status = 'completed'
    ORDER BY sr.delivery_date DESC
  ),
  received_totals AS (
    SELECT COALESCE(SUM(received_quantity), 0) as qty, COALESCE(SUM(total_cost), 0) as amount, COUNT(*) as total_count FROM received_items
  ),
  sales_data AS (
    SELECT * FROM calc_product_theoretical_sales(p_product_id, p_start_date, p_end_date)
  ),
  completed_orders AS (
    SELECT DISTINCT o.id as order_id FROM orders o JOIN payments pay ON pay.order_id = o.id
    WHERE pay.status = 'completed' AND pay.created_at >= p_start_date AND pay.created_at < v_filter_end_date
  ),
  order_items_data AS (
    SELECT oi.menu_item_id, oi.variant_id, oi.quantity as order_qty FROM order_items oi
    JOIN completed_orders co ON co.order_id = oi.order_id WHERE oi.status != 'cancelled'
  ),
  variant_compositions AS (
    SELECT mi.id as menu_item_id, mi.name as menu_item_name, (v->>'id') as variant_id, (v->>'name') as variant_name,
      (c->>'id') as composition_id, (c->>'type') as composition_type, (c->>'quantity')::NUMERIC as composition_qty
    FROM menu_items mi, LATERAL jsonb_array_elements(mi.variants) as v, LATERAL jsonb_array_elements(v->'composition') as c
    WHERE mi.is_active = true
  ),
  direct_product_menu_items AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name,
           SUM(oid.order_qty) as quantity_sold,
           SUM(oid.order_qty * vc.composition_qty) as product_used,
           'direct' as sales_type
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
      AND vc.composition_id = p_product_id::TEXT AND vc.composition_type = 'product'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name
  ),
  recipe_product_menu_items AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name,
           SUM(oid.order_qty) as quantity_sold,
           SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0)) as product_used,
           'recipe' as sales_type
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe' AND rc.component_id = p_product_id::TEXT AND rc.component_type = 'product'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name
  ),
  prep_direct_menu_items AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name,
      SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty * COALESCE(pr.portion_size, 1) * pr.product_qty_per_batch
        / NULLIF(pr.output_quantity * COALESCE(pr.portion_size, 1), 0)) as product_used,
      'via_prep' as sales_type, pr.preparation_name
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN prep_recipes pr ON pr.preparation_id = vc.composition_id::UUID
    WHERE vc.composition_type = 'preparation'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, pr.preparation_name
  ),
  prep_via_recipe_menu_items AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name,
      SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty * rc.quantity
        * CASE WHEN rc.unit IN ('portion', 'pcs') THEN COALESCE(prep.portion_size, 1) ELSE 1 END
        * pr.product_qty_per_batch
        / NULLIF(prep.output_quantity * COALESCE(prep.portion_size, 1), 0)
        / NULLIF(r.portion_size, 0)) as product_used,
      'via_prep' as sales_type, pr.preparation_name
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    JOIN preparations prep ON prep.id = rc.component_id::UUID
    JOIN prep_recipes pr ON pr.preparation_id = rc.component_id::UUID
    WHERE vc.composition_type = 'recipe' AND rc.component_type = 'preparation'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, pr.preparation_name
  ),
  all_menu_items AS (
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type, NULL::TEXT as prep_name FROM direct_product_menu_items
    UNION ALL SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type, NULL::TEXT as prep_name FROM recipe_product_menu_items
    UNION ALL SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type, preparation_name as prep_name FROM prep_direct_menu_items
    UNION ALL SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type, preparation_name as prep_name FROM prep_via_recipe_menu_items
  ),
  menu_items_aggregated AS (
    SELECT menu_item_id, menu_item_name, variant_name,
      SUM(quantity_sold) as quantity_sold, SUM(product_used) as product_used,
      CASE WHEN COUNT(DISTINCT prep_name) = 1 THEN MAX(prep_name) ELSE NULL END as via_preparation
    FROM all_menu_items GROUP BY menu_item_id, menu_item_name, variant_name ORDER BY SUM(product_used) DESC
  ),
  writeoffs_data AS (SELECT * FROM calc_product_writeoffs_decomposed(p_product_id, p_start_date, p_end_date)),
  loss_data AS (SELECT * FROM calc_product_loss_decomposed(p_product_id, p_start_date, p_end_date)),
  direct_loss_details AS (
    SELECT so.operation_date::DATE as loss_date, so.write_off_details->>'reason' as reason,
      (item->>'quantity')::NUMERIC as quantity, COALESCE((item->>'totalCost')::NUMERIC, 0) as amount,
      item->>'batchNumber' as batch_number, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemId')::UUID = p_product_id
    ORDER BY so.operation_date DESC
  ),
  loss_by_reason AS (SELECT reason, SUM(quantity) as quantity, SUM(amount) as amount FROM direct_loss_details GROUP BY reason),
  prep_loss_raw_for_breakdown AS (
    SELECT (item->>'itemId')::UUID as preparation_id, SUM((item->>'quantity')::NUMERIC) as prep_qty
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'preparation'
    GROUP BY (item->>'itemId')
  ),
  prep_loss_per_preparation AS (
    SELECT pr.preparation_name,
      SUM(plr.prep_qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity * COALESCE(pr.portion_size, 1), 0)) as loss_qty
    FROM prep_loss_raw_for_breakdown plr
    JOIN prep_recipes pr ON pr.preparation_id = plr.preparation_id
    GROUP BY pr.preparation_name
    HAVING SUM(plr.prep_qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity * COALESCE(pr.portion_size, 1), 0)) > 0
    ORDER BY loss_qty DESC
  ),
  raw_batches AS (
    SELECT sb.id as batch_id, sb.batch_number, sb.receipt_date, sb.current_quantity, sb.cost_per_unit,
      sb.current_quantity * sb.cost_per_unit as total_value
    FROM storage_batches sb WHERE sb.item_id = p_product_id::TEXT AND sb.item_type = 'product' AND sb.status = 'active' AND sb.current_quantity > 0
    ORDER BY sb.receipt_date
  ),
  raw_stock_totals AS (SELECT COALESCE(SUM(current_quantity), 0) as qty, COALESCE(SUM(total_value), 0) as amount FROM raw_batches),
  in_preps_data AS (SELECT * FROM calc_product_inpreps(p_product_id)),
  in_preps_details AS (
    SELECT pb.preparation_id, p.name as preparation_name, pb.production_date::DATE as batch_date,
      pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0) as product_qty,
      pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0) * v_product_avg_cost as product_cost
    FROM preparation_batches pb JOIN preparations p ON p.id = pb.preparation_id
    JOIN prep_recipes pr ON pr.preparation_id = pb.preparation_id
    WHERE pb.status = 'active' AND pb.current_quantity > 0 ORDER BY pb.production_date
  ),
  sales_consumption_writeoffs AS (
    SELECT so.operation_date::DATE as wo_date, SUM((item->>'quantity')::NUMERIC) as qty,
      SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount, COUNT(DISTINCT so.id) as ops_count
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.status = 'confirmed'
      AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND (item->>'itemId')::UUID = p_product_id AND so.write_off_details->>'reason' = 'sales_consumption'
    GROUP BY so.operation_date::DATE
  ),
  sales_consumption_totals AS (
    SELECT COALESCE(SUM(qty), 0) as qty, COALESCE(SUM(amount), 0) as amount, COALESCE(SUM(ops_count), 0) as ops_count FROM sales_consumption_writeoffs
  ),
  production_consumption_writeoffs AS (
    SELECT so.operation_date::DATE as wo_date, SUM((item->>'quantity')::NUMERIC) as qty,
      SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount, COUNT(*) as ops_count
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.status = 'confirmed'
      AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND (item->>'itemId')::UUID = p_product_id AND so.write_off_details->>'reason' = 'production_consumption'
    GROUP BY so.operation_date::DATE
  ),
  production_consumption_totals AS (
    SELECT COALESCE(SUM(qty), 0) as qty, COALESCE(SUM(amount), 0) as amount, COUNT(*) as ops_count FROM production_consumption_writeoffs
  ),
  inventory_corrections AS (
    SELECT so.operation_date::DATE as correction_date, (item->>'quantity')::NUMERIC as qty,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.status = 'confirmed'
      AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND (item->>'itemId')::UUID = p_product_id
    ORDER BY so.operation_date DESC
  ),
  corrections_totals AS (
    SELECT COALESCE(SUM(qty), 0) as qty, COALESCE(SUM(amount), 0) as amount, COUNT(*) as ops_count FROM inventory_corrections
  )

  SELECT jsonb_build_object(
    'product', (SELECT jsonb_build_object('id', id, 'name', name, 'code', code, 'unit', base_unit, 'department', department) FROM product_info),
    'period', jsonb_build_object('dateFrom', p_start_date::DATE, 'dateTo', p_end_date::DATE),
    'opening', jsonb_build_object(
      'quantity', COALESCE((SELECT quantity FROM opening_snapshot), 0)
        + COALESCE((SELECT in_preps_quantity FROM opening_snapshot), (SELECT qty FROM opening_inpreps_totals), 0),
      'amount', COALESCE((SELECT amount FROM opening_snapshot), 0)
        + COALESCE((SELECT in_preps_cost FROM opening_snapshot), (SELECT amount FROM opening_inpreps_totals), 0),
      'rawStock', jsonb_build_object(
        'quantity', COALESCE((SELECT quantity FROM opening_snapshot), 0),
        'amount', COALESCE((SELECT amount FROM opening_snapshot), 0)
      ),
      'inPreparations', jsonb_build_object(
        'quantity', ROUND(COALESCE((SELECT in_preps_quantity FROM opening_snapshot), (SELECT qty FROM opening_inpreps_totals), 0), 3),
        'amount', ROUND(COALESCE((SELECT in_preps_cost FROM opening_snapshot), (SELECT amount FROM opening_inpreps_totals), 0), 2),
        'isEstimate', (SELECT in_preps_quantity FROM opening_snapshot) IS NULL,
        'preparations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'preparationName', preparation_name, 'batchDate', batch_date,
          'productQuantity', ROUND(product_qty, 3), 'productCost', ROUND(product_cost, 2)
        )) FROM (SELECT * FROM opening_inpreps_details WHERE product_qty > 0.001 LIMIT 10) t), '[]'::jsonb)
      ),
      'snapshot', CASE WHEN EXISTS (SELECT 1 FROM opening_snapshot) THEN (SELECT jsonb_build_object('date', snapshot_date, 'source', source, 'documentId', source_document_id, 'documentNumber', document_number) FROM opening_snapshot) ELSE NULL END
    ),
    'received', jsonb_build_object(
      'quantity', (SELECT qty FROM received_totals), 'amount', (SELECT amount FROM received_totals),
      'receipts', COALESCE((SELECT jsonb_agg(jsonb_build_object('receiptId', receipt_id, 'receiptNumber', receipt_number, 'date', delivery_date, 'supplierName', supplier_name, 'quantity', received_quantity, 'unitCost', ROUND(unit_cost, 2), 'totalCost', ROUND(total_cost, 2))) FROM (SELECT * FROM received_items LIMIT 5) t), '[]'::jsonb),
      'totalReceiptsCount', (SELECT total_count FROM received_totals)
    ),
    'sales', jsonb_build_object(
      'quantity', ROUND((SELECT total_qty FROM sales_data), 3),
      'amount', ROUND((SELECT total_qty FROM sales_data) * v_product_avg_cost, 2),
      'direct', jsonb_build_object('quantity', ROUND((SELECT direct_qty FROM sales_data), 3), 'amount', ROUND((SELECT direct_qty FROM sales_data) * v_product_avg_cost, 2)),
      'viaRecipes', jsonb_build_object('quantity', ROUND((SELECT via_recipes_qty FROM sales_data), 3)),
      'viaPreparations', jsonb_build_object('quantity', ROUND((SELECT via_preps_qty FROM sales_data), 3), 'amount', ROUND((SELECT via_preps_qty FROM sales_data) * v_product_avg_cost, 2)),
      'topMenuItems', COALESCE((SELECT jsonb_agg(jsonb_build_object('menuItemId', menu_item_id, 'menuItemName', menu_item_name, 'variantName', variant_name, 'quantitySold', ROUND(quantity_sold, 1), 'productUsed', ROUND(product_used, 3), 'productCost', ROUND(product_used * v_product_avg_cost, 2), 'viaPreparation', via_preparation)) FROM (SELECT * FROM menu_items_aggregated LIMIT 10) t), '[]'::jsonb),
      'totalMenuItemsCount', (SELECT COUNT(*) FROM menu_items_aggregated)
    ),
    'writeoffs', jsonb_build_object(
      'quantity', ROUND((SELECT total_qty FROM writeoffs_data), 3),
      'amount', ROUND((SELECT total_qty FROM writeoffs_data) * v_product_avg_cost, 2),
      'direct', jsonb_build_object('quantity', ROUND((SELECT direct_qty FROM writeoffs_data), 3)),
      'fromPreparations', jsonb_build_object('quantity', ROUND((SELECT from_preps_qty FROM writeoffs_data), 3))
    ),
    'actualWriteOffs', jsonb_build_object(
      'salesConsumption', jsonb_build_object(
        'quantity', ROUND((SELECT qty FROM sales_consumption_totals), 3),
        'amount', ROUND((SELECT amount FROM sales_consumption_totals), 2),
        'operationsCount', (SELECT ops_count FROM sales_consumption_totals)
      ),
      'productionConsumption', jsonb_build_object(
        'quantity', ROUND((SELECT qty FROM production_consumption_totals), 3),
        'amount', ROUND((SELECT amount FROM production_consumption_totals), 2),
        'operationsCount', (SELECT ops_count FROM production_consumption_totals),
        'details', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', wo_date, 'quantity', ROUND(qty, 3), 'amount', ROUND(amount, 2), 'notes', ops_count || ' operation(s)') ORDER BY wo_date) FROM production_consumption_writeoffs), '[]'::jsonb)
      ),
      'total', jsonb_build_object(
        'quantity', ROUND((SELECT qty FROM sales_consumption_totals) + (SELECT qty FROM production_consumption_totals), 3),
        'amount', ROUND((SELECT amount FROM sales_consumption_totals) + (SELECT amount FROM production_consumption_totals), 2)
      ),
      'differenceFromTheoretical', jsonb_build_object(
        'quantity', ROUND((SELECT total_qty FROM sales_data) - (SELECT qty FROM sales_consumption_totals) - (SELECT qty FROM production_consumption_totals), 3),
        'amount', ROUND(((SELECT total_qty FROM sales_data) - (SELECT qty FROM sales_consumption_totals) - (SELECT qty FROM production_consumption_totals)) * v_product_avg_cost, 2),
        'interpretation', CASE
          WHEN (SELECT total_qty FROM sales_data) - (SELECT qty FROM sales_consumption_totals) - (SELECT qty FROM production_consumption_totals) > 0.01 THEN 'under_written_off'
          WHEN (SELECT total_qty FROM sales_data) - (SELECT qty FROM sales_consumption_totals) - (SELECT qty FROM production_consumption_totals) < -0.01 THEN 'over_written_off'
          ELSE 'matched'
        END
      )
    ),
    'loss', jsonb_build_object(
      'quantity', ROUND((SELECT total_loss_qty FROM loss_data), 3),
      'amount', ROUND((SELECT total_loss_qty FROM loss_data) * v_product_avg_cost, 2),
      'direct', jsonb_build_object('quantity', ROUND((SELECT direct_loss_qty FROM loss_data), 3)),
      'fromPreparations', jsonb_build_object('quantity', ROUND((SELECT from_preps_loss_qty FROM loss_data), 3)),
      'corrections', jsonb_build_object('quantity', ROUND((SELECT corrections_loss_qty FROM loss_data), 3)),
      'byReason', COALESCE((SELECT jsonb_agg(jsonb_build_object('reason', reason, 'quantity', ROUND(quantity, 3), 'amount', ROUND(amount, 2))) FROM loss_by_reason), '[]'::jsonb),
      'details', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', loss_date, 'reason', reason, 'quantity', ROUND(quantity, 3), 'amount', ROUND(amount, 2), 'batchNumber', batch_number, 'notes', notes)) FROM (SELECT * FROM direct_loss_details LIMIT 10) t), '[]'::jsonb),
      'tracedFromPreps', jsonb_build_object(
        'quantity', ROUND(COALESCE((SELECT from_preps_loss_qty FROM loss_data), 0), 3),
        'amount', ROUND(COALESCE((SELECT from_preps_loss_qty FROM loss_data), 0) * v_product_avg_cost, 2),
        'preparations', COALESCE((SELECT jsonb_agg(jsonb_build_object('preparationName', preparation_name, 'lossQuantity', ROUND(loss_qty, 3), 'lossAmount', ROUND(loss_qty * v_product_avg_cost, 2))) FROM prep_loss_per_preparation), '[]'::jsonb)
      )
    ),
    'gain', jsonb_build_object(
      'quantity', ROUND((SELECT corrections_gain_qty FROM loss_data), 3),
      'amount', ROUND((SELECT corrections_gain_qty FROM loss_data) * v_product_avg_cost, 2)
    ),
    'closing', jsonb_build_object(
      'rawStock', jsonb_build_object('quantity', (SELECT qty FROM raw_stock_totals), 'amount', ROUND((SELECT amount FROM raw_stock_totals), 2), 'batches', COALESCE((SELECT jsonb_agg(jsonb_build_object('batchId', batch_id, 'batchNumber', batch_number, 'receiptDate', receipt_date, 'quantity', ROUND(current_quantity, 3), 'costPerUnit', ROUND(cost_per_unit, 2), 'totalValue', ROUND(total_value, 2))) FROM (SELECT * FROM raw_batches LIMIT 10) t), '[]'::jsonb)),
      'inPreparations', jsonb_build_object('quantity', ROUND((SELECT qty FROM in_preps_data), 3), 'amount', ROUND((SELECT amount FROM in_preps_data), 2), 'preparations', COALESCE((SELECT jsonb_agg(jsonb_build_object('preparationId', preparation_id, 'preparationName', preparation_name, 'batchDate', batch_date, 'productQuantity', ROUND(product_qty, 3), 'productCost', ROUND(product_cost, 2))) FROM (SELECT * FROM in_preps_details LIMIT 10) t), '[]'::jsonb)),
      'total', jsonb_build_object('quantity', ROUND((SELECT qty FROM raw_stock_totals) + (SELECT qty FROM in_preps_data), 3), 'amount', ROUND((SELECT amount FROM raw_stock_totals) + (SELECT amount FROM in_preps_data), 2))
    ),
    'variance', (
      SELECT jsonb_build_object(
        'quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2),
        'interpretation', CASE WHEN variance_qty > 0.01 THEN 'shortage' WHEN variance_qty < -0.01 THEN 'surplus' ELSE 'balanced' END,
        'possibleReasons', CASE WHEN variance_qty > 0.01 THEN ARRAY['Unrecorded sales', 'Theft', 'Unrecorded spoilage', 'Measurement errors'] WHEN variance_qty < -0.01 THEN ARRAY['Unrecorded receipt', 'Measurement errors', 'Wrong recipe quantities'] ELSE ARRAY[]::TEXT[] END
      ) FROM (
        SELECT
          COALESCE((SELECT quantity FROM opening_snapshot), 0)
            + COALESCE((SELECT in_preps_quantity FROM opening_snapshot), (SELECT qty FROM opening_inpreps_totals), 0)
            + (SELECT qty FROM received_totals) - (SELECT total_qty FROM sales_data)
            - (SELECT total_loss_qty FROM loss_data) + (SELECT corrections_gain_qty FROM loss_data)
            - (SELECT qty FROM raw_stock_totals) - (SELECT qty FROM in_preps_data) as variance_qty,
          COALESCE((SELECT amount FROM opening_snapshot), 0)
            + COALESCE((SELECT in_preps_cost FROM opening_snapshot), (SELECT amount FROM opening_inpreps_totals), 0)
            + (SELECT amount FROM received_totals) - (SELECT total_qty FROM sales_data) * v_product_avg_cost
            - (SELECT total_loss_qty FROM loss_data) * v_product_avg_cost + (SELECT corrections_gain_qty FROM loss_data) * v_product_avg_cost
            - (SELECT amount FROM raw_stock_totals) - (SELECT amount FROM in_preps_data) as variance_amount
      ) calc
    ),
    'generatedAt', NOW(),
    'version', 'v3.4'
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_product_variance_details_v3(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Product variance detail report v3.4 - Opening InPreps: prefer snapshot, fallback to estimation';
