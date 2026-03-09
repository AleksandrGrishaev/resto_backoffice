-- Migration: 169_fix_get_products_consumption_stats
-- Description: Fix get_products_consumption_stats RPC to read from decomposed_items
--              instead of write_off_items, and remove operation_type filter
-- Date: 2026-03-07
--
-- CONTEXT:
-- The original RPC read from write_off_items which uses key 'itemId',
-- but it was looking for 'productId'. The correct source is decomposed_items
-- which has 'productId' and 'type' fields.
-- Also removed operation_type='recipe_writeoff' filter since actual data
-- uses 'auto_sales_writeoff'.

CREATE OR REPLACE FUNCTION public.get_products_consumption_stats(days_back integer DEFAULT 7)
RETURNS TABLE(product_id text, avg_daily_consumption numeric, total_consumption numeric, consumption_days bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (item->>'productId')::TEXT as product_id,
    ROUND(SUM((item->>'quantity')::NUMERIC) / GREATEST(days_back, 1), 4) as avg_daily_consumption,
    SUM((item->>'quantity')::NUMERIC) as total_consumption,
    COUNT(DISTINCT DATE(rwo.performed_at)) as consumption_days
  FROM recipe_write_offs rwo,
       jsonb_array_elements(rwo.decomposed_items) as item
  WHERE rwo.performed_at >= NOW() - (days_back || ' days')::INTERVAL
    AND item->>'productId' IS NOT NULL
    AND item->>'type' = 'product'
    AND (item->>'quantity')::NUMERIC > 0
  GROUP BY (item->>'productId')::TEXT
  HAVING SUM((item->>'quantity')::NUMERIC) > 0
  ORDER BY avg_daily_consumption DESC;
END;
$function$;
