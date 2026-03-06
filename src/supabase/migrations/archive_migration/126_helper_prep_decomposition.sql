-- Migration: 126_helper_prep_decomposition
-- Description: Helper function for preparation decomposition factors
-- Date: 2026-02-02
-- Author: Claude
--
-- This is the foundational helper function for the modular variance report architecture.
-- It calculates how much of each product is needed per unit of preparation output,
-- handling both direct ingredients and nested preparations (recursive).
--
-- Key concepts:
-- - total_output_qty: For portion-type preps = output_quantity * portion_size (in base units)
--                     For weight-type preps = output_quantity (already in base units)
-- - product_qty_per_batch: How much product is needed to produce the full batch
-- - factor: product_qty_per_batch / total_output_qty (product per unit of prep output)

-- Drop existing function if exists
DROP FUNCTION IF EXISTS calc_prep_decomposition_factors(UUID);

-- Main function: Returns all preparations that use a given product (directly or nested)
-- with their decomposition factors
CREATE OR REPLACE FUNCTION calc_prep_decomposition_factors(p_product_id UUID)
RETURNS TABLE (
  preparation_id UUID,
  preparation_name TEXT,
  total_output_qty NUMERIC,
  product_qty_per_batch NUMERIC,
  factor NUMERIC  -- product_qty per unit of prep output
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
  -- Base: Direct product usage in preparations
  direct_product_preps AS (
    SELECT
      p.id as prep_id,
      p.name as prep_name,
      -- Total output in base units
      (p.output_quantity * COALESCE(p.portion_size, 1))::NUMERIC as prep_output,
      pi.quantity::NUMERIC as product_qty,  -- Explicit cast for recursive type consistency
      -- Factor: how much product per unit of prep output
      (pi.quantity / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as decomp_factor,
      1 as depth
    FROM preparations p
    JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.ingredient_id = p_product_id
      AND pi.type = 'product'
      AND p.is_active = true
  ),

  -- Recursive: Find parent preparations that use these preparations
  prep_tree AS (
    -- Base case: preparations that directly use the product
    SELECT
      dpp.prep_id,
      dpp.prep_name,
      dpp.prep_output,
      dpp.product_qty,
      dpp.decomp_factor,
      dpp.depth
    FROM direct_product_preps dpp

    UNION ALL

    -- Recursive case: parent preparations that use child preparations
    SELECT
      parent_p.id as prep_id,
      parent_p.name as prep_name,
      (parent_p.output_quantity * COALESCE(parent_p.portion_size, 1))::NUMERIC as prep_output,
      -- Product qty in parent = child's product_qty * (parent's usage of child / child's output)
      (pt.product_qty * pi.quantity / NULLIF(pt.prep_output, 0))::NUMERIC as product_qty,
      -- Factor for parent
      (pt.decomp_factor * pi.quantity / NULLIF(parent_p.output_quantity * COALESCE(parent_p.portion_size, 1), 0))::NUMERIC as decomp_factor,
      pt.depth + 1
    FROM prep_tree pt
    JOIN preparation_ingredients pi ON pi.ingredient_id = pt.prep_id AND pi.type = 'preparation'
    JOIN preparations parent_p ON parent_p.id = pi.preparation_id
    WHERE parent_p.is_active = true
      AND pt.depth < 5  -- Prevent infinite recursion
  )

  SELECT
    pt.prep_id as preparation_id,
    pt.prep_name as preparation_name,
    pt.prep_output as total_output_qty,
    pt.product_qty as product_qty_per_batch,
    pt.decomp_factor as factor
  FROM prep_tree pt;
END;
$$;

COMMENT ON FUNCTION calc_prep_decomposition_factors(UUID) IS
'Returns decomposition factors for all preparations that use a product (directly or via nested preps).
Used by variance report helpers to decompose prep consumption to product consumption.';

GRANT EXECUTE ON FUNCTION calc_prep_decomposition_factors(UUID) TO authenticated;
