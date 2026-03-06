-- Migration: 127_helper_theoretical_sales
-- Description: Helper function for theoretical sales calculation
-- Date: 2026-02-02
-- Author: Claude
--
-- Calculates theoretical product consumption from completed orders:
-- - Direct sales: Menu → Product
-- - Via recipes: Menu → Recipe → Product
-- - Via preparations: Menu → Preparation → Product (recursive decomposition)

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
  -- Completed orders in period
  completed_orders AS (
    SELECT DISTINCT o.id as order_id
    FROM orders o
    JOIN payments pay ON pay.order_id = o.id
    WHERE pay.status = 'completed'
      AND pay.created_at >= p_start_date
      AND pay.created_at < (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ
  ),

  -- Order items from completed orders
  order_items_data AS (
    SELECT
      oi.menu_item_id,
      oi.variant_id,
      oi.quantity as order_qty
    FROM order_items oi
    JOIN completed_orders co ON co.order_id = oi.order_id
    WHERE oi.status != 'cancelled'
  ),

  -- Menu item variant compositions
  variant_compositions AS (
    SELECT
      mi.id as menu_item_id,
      (v->>'id') as variant_id,
      (c->>'id') as composition_id,
      (c->>'type') as composition_type,
      (c->>'quantity')::NUMERIC as composition_qty
    FROM menu_items mi,
    LATERAL jsonb_array_elements(mi.variants) as v,
    LATERAL jsonb_array_elements(v->'composition') as c
    WHERE mi.is_active = true
  ),

  -- 1. Direct product sales: Menu → Product
  direct_product_sales AS (
    SELECT SUM(oid.order_qty * vc.composition_qty)::NUMERIC as qty
    FROM order_items_data oid
    JOIN variant_compositions vc
      ON vc.menu_item_id = oid.menu_item_id
      AND vc.variant_id = oid.variant_id
    WHERE vc.composition_id = p_product_id::TEXT
      AND vc.composition_type = 'product'
  ),

  -- 2. Recipe product sales: Menu → Recipe → Product
  recipe_product_sales AS (
    SELECT SUM(
      oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0)
    )::NUMERIC as qty
    FROM order_items_data oid
    JOIN variant_compositions vc
      ON vc.menu_item_id = oid.menu_item_id
      AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe'
      AND rc.component_id = p_product_id::TEXT
      AND rc.component_type = 'product'
  ),

  -- 3. Preparations consumed (direct from orders)
  direct_prep_orders AS (
    SELECT
      vc.composition_id::UUID as preparation_id,
      SUM(oid.order_qty * vc.composition_qty)::NUMERIC as qty
    FROM order_items_data oid
    JOIN variant_compositions vc
      ON vc.menu_item_id = oid.menu_item_id
      AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'preparation'
    GROUP BY vc.composition_id
  ),

  -- Preparations consumed via recipes
  recipe_prep_orders AS (
    SELECT
      rc.component_id::UUID as preparation_id,
      SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0))::NUMERIC as qty
    FROM order_items_data oid
    JOIN variant_compositions vc
      ON vc.menu_item_id = oid.menu_item_id
      AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe'
      AND rc.component_type = 'preparation'
    GROUP BY rc.component_id
  ),

  -- All preparations consumed
  all_preps_consumed AS (
    SELECT preparation_id, SUM(qty)::NUMERIC as qty
    FROM (
      SELECT * FROM direct_prep_orders
      UNION ALL
      SELECT * FROM recipe_prep_orders
    ) combined
    GROUP BY preparation_id
  ),

  -- Recursive decomposition: prep consumption → product consumption
  recursive_prep_decomposition AS (
    WITH RECURSIVE prep_tree AS (
      -- Base: start with consumed preparations
      SELECT
        apc.preparation_id as root_prep_id,
        apc.preparation_id as current_prep_id,
        apc.qty::NUMERIC as consumed_qty,
        1 as depth
      FROM all_preps_consumed apc

      UNION ALL

      -- Recursive: decompose nested preparations
      SELECT
        pt.root_prep_id,
        pi.ingredient_id as current_prep_id,
        (pt.consumed_qty * pi.quantity / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        pt.depth + 1
      FROM prep_tree pt
      JOIN preparations p ON p.id = pt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'preparation'
        AND p.is_active = true
        AND pt.depth < 5
    )
    SELECT root_prep_id, current_prep_id, consumed_qty, depth FROM prep_tree
  ),

  -- Preparation recipes (product ingredients)
  prep_recipes AS (
    SELECT
      p.id as preparation_id,
      (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output_quantity,
      pi.ingredient_id::TEXT as product_id,
      pi.quantity::NUMERIC as recipe_product_qty
    FROM preparations p
    JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product'
      AND p.is_active = true
  ),

  -- Products from preparations (via preps)
  products_from_preparations AS (
    SELECT SUM(
      rpd.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)
    )::NUMERIC as qty
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
'Calculates theoretical product consumption from completed orders. Returns breakdown: direct, via recipes, via preparations.';

GRANT EXECUTE ON FUNCTION calc_product_theoretical_sales(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
