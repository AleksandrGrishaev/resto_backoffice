-- Migration: 130_helper_inpreps
-- Description: Helper function for products in active preparation batches
-- Date: 2026-02-02
-- Author: Claude
--
-- Calculates how much of a product is currently "locked" in active preparation batches.
-- This is critical for the Actual calculation: Actual = Closing Stock + InPreps
--
-- Uses recursive decomposition for nested preparations.

DROP FUNCTION IF EXISTS calc_product_inpreps(UUID);

CREATE OR REPLACE FUNCTION calc_product_inpreps(p_product_id UUID)
RETURNS TABLE (
  qty NUMERIC,
  amount NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_product_avg_cost NUMERIC;
BEGIN
  -- Get average cost for the product
  SELECT COALESCE(
    (SELECT AVG(sb.cost_per_unit)
     FROM storage_batches sb
     WHERE sb.item_id = p_product_id::TEXT
       AND sb.item_type = 'product'
       AND sb.status = 'active'),
    (SELECT last_known_cost FROM products WHERE id = p_product_id)
  ) INTO v_product_avg_cost;

  RETURN QUERY
  WITH RECURSIVE
  -- Start with active preparation batches
  prep_batch_tree AS (
    SELECT
      pb.preparation_id as root_prep_id,
      pb.preparation_id as current_prep_id,
      pb.current_quantity::NUMERIC as batch_qty,
      1 as depth
    FROM preparation_batches pb
    WHERE pb.status = 'active'
      AND pb.current_quantity > 0

    UNION ALL

    -- Recursive: decompose nested preparations
    SELECT
      pbt.root_prep_id,
      pi.ingredient_id as current_prep_id,
      (pbt.batch_qty * pi.quantity / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as batch_qty,
      pbt.depth + 1
    FROM prep_batch_tree pbt
    JOIN preparations p ON p.id = pbt.current_prep_id
    JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'preparation'
      AND p.is_active = true
      AND pbt.depth < 5
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

  -- Calculate product qty in preps
  product_in_preps AS (
    SELECT SUM(
      pbt.batch_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)
    )::NUMERIC as total_qty
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
'Calculates product quantity and value currently in active preparation batches. Uses recursive decomposition.';

GRANT EXECUTE ON FUNCTION calc_product_inpreps(UUID) TO authenticated;
