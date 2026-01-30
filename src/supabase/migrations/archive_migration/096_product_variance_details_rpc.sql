-- Migration: 096_product_variance_details_rpc
-- Description: RPC function to get detailed variance breakdown for a single product
-- Shows all preparations that use this product with their sales/losses
-- Date: 2025-01-25
-- Author: Claude

CREATE OR REPLACE FUNCTION get_product_variance_details(
  p_product_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH
  -- Get product info
  product_info AS (
    SELECT
      id,
      name,
      code,
      base_unit,
      used_in_departments[1] AS department
    FROM products
    WHERE id = p_product_id AND is_active = true
  ),

  -- Direct sales write-offs for this product
  direct_sales AS (
    SELECT
      (item->>'quantity')::NUMERIC AS quantity,
      (item->>'totalCost')::NUMERIC AS amount
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < p_end_date
      AND so.write_off_details->>'reason' = 'sales_consumption'
      AND (item->>'itemId')::UUID = p_product_id
  ),

  -- Direct loss write-offs for this product
  direct_losses AS (
    SELECT
      so.write_off_details->>'reason' AS reason,
      (item->>'quantity')::NUMERIC AS quantity,
      (item->>'totalCost')::NUMERIC AS amount
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < p_end_date
      AND so.write_off_details->>'reason' IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemId')::UUID = p_product_id
  ),

  -- Production consumption (product used to make preparations)
  production_used AS (
    SELECT
      pr.id AS preparation_id,
      pr.name AS preparation_name,
      ((prep_item->>'quantity')::NUMERIC / NULLIF(pr.output_quantity, 0)) * pi.quantity AS product_qty_used,
      ((prep_item->>'totalCost')::NUMERIC / NULLIF(pr.output_quantity, 0)) * pi.quantity AS product_cost_used
    FROM preparation_operations po,
    LATERAL jsonb_array_elements(po.items) AS prep_item
    JOIN preparations pr ON pr.id = (prep_item->>'preparationId')::UUID
    JOIN preparation_ingredients pi ON pi.preparation_id = pr.id
      AND pi.ingredient_id = p_product_id
      AND pi.type = 'product'
    WHERE po.status = 'completed'
      AND po.operation_date >= p_start_date
      AND po.operation_date < p_end_date
  ),

  -- Get all preparations that use this product
  prep_recipes AS (
    SELECT DISTINCT
      pr.id AS preparation_id,
      pr.name AS preparation_name,
      pr.output_quantity,
      pi.quantity AS product_qty_per_batch
    FROM preparations pr
    JOIN preparation_ingredients pi ON pi.preparation_id = pr.id
    WHERE pi.ingredient_id = p_product_id
      AND pi.type = 'product'
      AND pr.is_active = true
  ),

  -- Preparation sales (traced back to product)
  prep_sales AS (
    SELECT
      pr.preparation_id,
      ((item->>'quantity')::NUMERIC / NULLIF(pr.output_quantity, 0)) * pr.product_qty_per_batch AS product_qty,
      ((item->>'totalCost')::NUMERIC / NULLIF(pr.output_quantity, 0)) * pr.product_qty_per_batch AS product_cost
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    JOIN prep_recipes pr ON pr.preparation_id = (item->>'itemId')::UUID
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < p_end_date
      AND so.write_off_details->>'reason' = 'sales_consumption'
  ),

  -- Preparation losses (traced back to product)
  prep_losses AS (
    SELECT
      pr.preparation_id,
      ((item->>'quantity')::NUMERIC / NULLIF(pr.output_quantity, 0)) * pr.product_qty_per_batch AS product_qty,
      ((item->>'totalCost')::NUMERIC / NULLIF(pr.output_quantity, 0)) * pr.product_qty_per_batch AS product_cost
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    JOIN prep_recipes pr ON pr.preparation_id = (item->>'itemId')::UUID
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < p_end_date
      AND so.write_off_details->>'reason' IN ('expired', 'spoiled', 'other', 'expiration')
  ),

  -- Aggregate by preparation
  prep_breakdown AS (
    SELECT
      pr.preparation_id,
      pr.preparation_name,
      COALESCE((SELECT SUM(product_qty_used) FROM production_used pu WHERE pu.preparation_id = pr.preparation_id), 0) AS production_qty,
      COALESCE((SELECT SUM(product_cost_used) FROM production_used pu WHERE pu.preparation_id = pr.preparation_id), 0) AS production_amount,
      COALESCE((SELECT SUM(product_qty) FROM prep_sales ps WHERE ps.preparation_id = pr.preparation_id), 0) AS sales_qty,
      COALESCE((SELECT SUM(product_cost) FROM prep_sales ps WHERE ps.preparation_id = pr.preparation_id), 0) AS sales_amount,
      COALESCE((SELECT SUM(product_qty) FROM prep_losses pl WHERE pl.preparation_id = pr.preparation_id), 0) AS loss_qty,
      COALESCE((SELECT SUM(product_cost) FROM prep_losses pl WHERE pl.preparation_id = pr.preparation_id), 0) AS loss_amount
    FROM prep_recipes pr
  ),

  -- Loss breakdown by reason
  loss_by_reason AS (
    SELECT reason, SUM(quantity) AS quantity, SUM(amount) AS amount
    FROM direct_losses
    GROUP BY reason
  )

  SELECT jsonb_build_object(
    'product', (SELECT jsonb_build_object('id', id, 'name', name, 'code', code, 'unit', base_unit, 'department', department) FROM product_info),
    'period', jsonb_build_object('dateFrom', p_start_date::TEXT, 'dateTo', p_end_date::TEXT),
    'directSales', jsonb_build_object('quantity', COALESCE((SELECT SUM(quantity) FROM direct_sales), 0), 'amount', COALESCE((SELECT SUM(amount) FROM direct_sales), 0)),
    'directLoss', jsonb_build_object('quantity', COALESCE((SELECT SUM(quantity) FROM direct_losses), 0), 'amount', COALESCE((SELECT SUM(amount) FROM direct_losses), 0)),
    'production', jsonb_build_object('quantity', COALESCE((SELECT SUM(product_qty_used) FROM production_used), 0), 'amount', COALESCE((SELECT SUM(product_cost_used) FROM production_used), 0)),
    'lossByReason', COALESCE((SELECT jsonb_agg(jsonb_build_object('reason', reason, 'quantity', quantity, 'amount', amount)) FROM loss_by_reason), '[]'::jsonb),
    'preparations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'preparationId', preparation_id, 'preparationName', preparation_name,
        'production', jsonb_build_object('quantity', production_qty, 'amount', production_amount),
        'tracedSales', jsonb_build_object('quantity', sales_qty, 'amount', sales_amount),
        'tracedLoss', jsonb_build_object('quantity', loss_qty, 'amount', loss_amount)
      ) ORDER BY production_amount DESC)
      FROM prep_breakdown WHERE production_qty > 0 OR sales_qty > 0 OR loss_qty > 0
    ), '[]'::jsonb),
    'tracedTotals', jsonb_build_object(
      'salesQuantity', COALESCE((SELECT SUM(sales_qty) FROM prep_breakdown), 0),
      'salesAmount', COALESCE((SELECT SUM(sales_amount) FROM prep_breakdown), 0),
      'lossQuantity', COALESCE((SELECT SUM(loss_qty) FROM prep_breakdown), 0),
      'lossAmount', COALESCE((SELECT SUM(loss_amount) FROM prep_breakdown), 0)
    ),
    'generatedAt', NOW()::TEXT
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_product_variance_details(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_variance_details(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon;

COMMENT ON FUNCTION get_product_variance_details IS 'Get detailed variance breakdown for a single product, including preparation traceability';
