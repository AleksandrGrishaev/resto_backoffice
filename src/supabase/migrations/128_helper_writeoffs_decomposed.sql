-- Migration: 128_helper_writeoffs_decomposed
-- Description: Helper function for actual write-offs (sales_consumption) with prep decomposition
-- Date: 2026-02-02
-- Author: Claude
--
-- Calculates actual write-offs (sales_consumption type) for a product:
-- - Direct write-offs: Product written off directly
-- - From preps: Preparation written off → decomposed to products
--
-- This enables comparison between theoretical sales and actual write-offs.

DROP FUNCTION IF EXISTS calc_product_writeoffs_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION calc_product_writeoffs_decomposed(
  p_product_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  direct_qty NUMERIC,
  from_preps_qty NUMERIC,
  total_qty NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_filter_end_date TIMESTAMPTZ;
BEGIN
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ;

  RETURN QUERY
  WITH
  -- Direct product write-offs (sales_consumption)
  direct_writeoffs AS (
    SELECT SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemType') = 'product'
      AND (item->>'itemId')::UUID = p_product_id
  ),

  -- Preparation write-offs (sales_consumption) - need to decompose
  prep_writeoffs_raw AS (
    SELECT
      (item->>'itemId')::UUID as preparation_id,
      SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemType') = 'preparation'
    GROUP BY (item->>'itemId')
  ),

  -- Decompose preparation write-offs to products (recursive)
  prep_writeoffs_decomposed AS (
    WITH RECURSIVE wo_prep_tree AS (
      -- Base: start with prep write-offs
      SELECT
        pwr.preparation_id as root_prep_id,
        pwr.preparation_id as current_prep_id,
        pwr.qty::NUMERIC as consumed_qty,
        1 as depth
      FROM prep_writeoffs_raw pwr

      UNION ALL

      -- Recursive: decompose nested preparations
      SELECT
        wpt.root_prep_id,
        pi.ingredient_id as current_prep_id,
        (wpt.consumed_qty * pi.quantity / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        wpt.depth + 1
      FROM wo_prep_tree wpt
      JOIN preparations p ON p.id = wpt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'preparation'
        AND p.is_active = true
        AND wpt.depth < 5
    ),
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
    )
    SELECT SUM(
      wpt.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)
    )::NUMERIC as qty
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
'Calculates actual write-offs (sales_consumption) for a product, including decomposed from preparations.';

GRANT EXECUTE ON FUNCTION calc_product_writeoffs_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
