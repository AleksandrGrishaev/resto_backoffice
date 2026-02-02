-- Migration: 129_helper_loss_decomposed
-- Description: Helper function for loss calculation with prep decomposition
-- Date: 2026-02-02
-- Author: Claude
--
-- Calculates losses for a product:
-- - Direct loss: expired/spoiled/other write-offs of product
-- - From preps: Preparation expired/spoiled → decomposed to products
-- - Corrections: Negative inventory corrections (shortage found)
--
-- Also returns positive corrections (gain) separately for balance calculation.

DROP FUNCTION IF EXISTS calc_product_loss_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION calc_product_loss_decomposed(
  p_product_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  direct_loss_qty NUMERIC,
  from_preps_loss_qty NUMERIC,
  corrections_loss_qty NUMERIC,
  total_loss_qty NUMERIC,
  corrections_gain_qty NUMERIC
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
  -- Direct product losses (expired, spoiled, other, expiration)
  direct_loss AS (
    SELECT SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'product'
      AND (item->>'itemId')::UUID = p_product_id
  ),

  -- Preparation losses - need to decompose
  prep_loss_raw AS (
    SELECT
      (item->>'itemId')::UUID as preparation_id,
      SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'preparation'
    GROUP BY (item->>'itemId')
  ),

  -- Decompose preparation losses to products (recursive)
  prep_loss_decomposed AS (
    WITH RECURSIVE loss_prep_tree AS (
      -- Base: start with prep losses
      SELECT
        plr.preparation_id as root_prep_id,
        plr.preparation_id as current_prep_id,
        plr.qty::NUMERIC as consumed_qty,
        1 as depth
      FROM prep_loss_raw plr

      UNION ALL

      -- Recursive: decompose nested preparations
      SELECT
        lpt.root_prep_id,
        pi.ingredient_id as current_prep_id,
        (lpt.consumed_qty * pi.quantity / NULLIF(p.output_quantity * COALESCE(p.portion_size, 1), 0))::NUMERIC as consumed_qty,
        lpt.depth + 1
      FROM loss_prep_tree lpt
      JOIN preparations p ON p.id = lpt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'preparation'
        AND p.is_active = true
        AND lpt.depth < 5
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
      lpt.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)
    )::NUMERIC as qty
    FROM loss_prep_tree lpt
    JOIN prep_recipes pr ON lpt.current_prep_id = pr.preparation_id
    WHERE pr.product_id = p_product_id::TEXT
  ),

  -- Negative corrections (loss - shortage found)
  corrections_loss AS (
    SELECT SUM(ABS((item->>'quantity')::NUMERIC))::NUMERIC as qty
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction'
      AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (item->>'itemType') = 'product'
      AND (item->>'itemId')::UUID = p_product_id
      AND (item->>'quantity')::NUMERIC < 0
  ),

  -- Positive corrections (gain - surplus found)
  corrections_gain AS (
    SELECT SUM((item->>'quantity')::NUMERIC)::NUMERIC as qty
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction'
      AND so.operation_date >= p_start_date
      AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (item->>'itemType') = 'product'
      AND (item->>'itemId')::UUID = p_product_id
      AND (item->>'quantity')::NUMERIC > 0
  )

  SELECT
    COALESCE((SELECT qty FROM direct_loss), 0) as direct_loss_qty,
    COALESCE((SELECT qty FROM prep_loss_decomposed), 0) as from_preps_loss_qty,
    COALESCE((SELECT qty FROM corrections_loss), 0) as corrections_loss_qty,
    COALESCE((SELECT qty FROM direct_loss), 0) +
    COALESCE((SELECT qty FROM prep_loss_decomposed), 0) +
    COALESCE((SELECT qty FROM corrections_loss), 0) as total_loss_qty,
    COALESCE((SELECT qty FROM corrections_gain), 0) as corrections_gain_qty;
END;
$$;

COMMENT ON FUNCTION calc_product_loss_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculates losses for a product: direct + from preps + negative corrections. Also returns positive corrections (gain).';

GRANT EXECUTE ON FUNCTION calc_product_loss_decomposed(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
