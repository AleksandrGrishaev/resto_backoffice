-- Migration: 154_ai_readonly_role_and_views
-- Description: Read-only access for AI sherpa analytics
-- Date: 2026-02-25
-- Applied: DEV + PROD

-- ============================================================
-- 1. CREATE ai_readonly ROLE
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_readonly') THEN
    CREATE ROLE ai_readonly NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO ai_readonly;

-- Menu / pricing
GRANT SELECT ON menu_items TO ai_readonly;
GRANT SELECT ON menu_categories TO ai_readonly;
GRANT SELECT ON sales_channels TO ai_readonly;
GRANT SELECT ON channel_prices TO ai_readonly;
GRANT SELECT ON channel_taxes TO ai_readonly;
GRANT SELECT ON channel_menu_items TO ai_readonly;
GRANT SELECT ON taxes TO ai_readonly;

-- Recipes / cost
GRANT SELECT ON recipes TO ai_readonly;
GRANT SELECT ON recipe_components TO ai_readonly;
GRANT SELECT ON recipe_categories TO ai_readonly;
GRANT SELECT ON preparations TO ai_readonly;
GRANT SELECT ON preparation_ingredients TO ai_readonly;
GRANT SELECT ON preparation_categories TO ai_readonly;
GRANT SELECT ON products TO ai_readonly;
GRANT SELECT ON product_categories TO ai_readonly;

-- Sales
GRANT SELECT ON orders TO ai_readonly;
GRANT SELECT ON order_items TO ai_readonly;
GRANT SELECT ON sales_transactions TO ai_readonly;
GRANT SELECT ON shifts TO ai_readonly;
GRANT SELECT ON payments TO ai_readonly;
GRANT SELECT ON payment_methods TO ai_readonly;
GRANT SELECT ON discount_events TO ai_readonly;

-- Inventory / batches
GRANT SELECT ON storage_batches TO ai_readonly;
GRANT SELECT ON preparation_batches TO ai_readonly;

-- Categories
GRANT SELECT ON transaction_categories TO ai_readonly;

-- ============================================================
-- 2. ANALYTICAL VIEWS
-- ============================================================

-- Menu with food cost and channel prices
CREATE OR REPLACE VIEW v_menu_with_cost AS
SELECT
  mi.id,
  mi.name,
  mi.department,
  mi.is_active,
  mc.name AS category,
  mi.price,
  mi.cost AS estimated_cost,
  r.id AS recipe_id,
  r.cost AS recipe_cost,
  r.portion_size,
  r.portion_unit,
  (SELECT jsonb_agg(jsonb_build_object(
    'channel', sc.code,
    'price', cp.price
  ))
  FROM channel_prices cp
  JOIN sales_channels sc ON sc.id = cp.channel_id
  WHERE cp.menu_item_id = mi.id AND cp.is_active = true
  ) AS channel_prices,
  mi.variants
FROM menu_items mi
LEFT JOIN menu_categories mc ON mc.id = mi.category_id
LEFT JOIN recipes r ON r.name = mi.name AND r.is_active = true;

-- Daily sales summary
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT
  DATE(o.created_at AT TIME ZONE 'Asia/Makassar') AS sale_date,
  COUNT(DISTINCT o.id) AS total_orders,
  COUNT(oi.id) AS total_items_sold,
  SUM(o.total_amount)::numeric AS gross_revenue,
  SUM(o.discount_amount)::numeric AS total_discounts,
  SUM(o.tax_amount)::numeric AS total_tax,
  SUM(o.final_amount)::numeric AS net_revenue,
  o.type AS order_type,
  COALESCE(sc.code, 'direct') AS channel,
  SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END)::numeric AS cash_total,
  SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END)::numeric AS card_total,
  SUM(CASE WHEN p.payment_method = 'qr' THEN p.amount ELSE 0 END)::numeric AS qr_total
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
LEFT JOIN sales_channels sc ON sc.id = o.channel_id
WHERE o.status = 'completed'
GROUP BY sale_date, o.type, sc.code;

-- Food cost report per menu item per day (from actual FIFO calculations)
CREATE OR REPLACE VIEW v_food_cost_report AS
SELECT
  st.menu_item_id,
  st.menu_item_name,
  st.department,
  DATE(st.sold_at AT TIME ZONE 'Asia/Makassar') AS sale_date,
  COUNT(*) AS times_sold,
  SUM(st.quantity) AS total_quantity,
  AVG(st.unit_price)::numeric(12,2) AS avg_selling_price,
  AVG((st.profit_calculation->>'ingredientsCost')::numeric)::numeric(12,2) AS avg_food_cost,
  AVG((st.profit_calculation->>'profitMargin')::numeric)::numeric(5,2) AS avg_margin_pct,
  SUM(st.total_price)::numeric(12,2) AS total_revenue,
  SUM((st.profit_calculation->>'ingredientsCost')::numeric)::numeric(12,2) AS total_food_cost,
  SUM((st.profit_calculation->>'profit')::numeric)::numeric(12,2) AS total_profit
FROM sales_transactions st
WHERE st.profit_calculation IS NOT NULL
  AND st.profit_calculation->>'ingredientsCost' IS NOT NULL
GROUP BY st.menu_item_id, st.menu_item_name, st.department, sale_date;

-- Recipe decomposition (ingredients tree)
CREATE OR REPLACE VIEW v_recipe_details AS
SELECT
  r.id AS recipe_id,
  r.name AS recipe_name,
  r.department,
  r.cost AS estimated_cost,
  r.portion_size,
  r.portion_unit,
  rc.component_type,
  CASE
    WHEN rc.component_type = 'product' THEN p.name
    WHEN rc.component_type = 'preparation' THEN pr.name
  END AS ingredient_name,
  rc.quantity,
  rc.unit,
  CASE
    WHEN rc.component_type = 'product' THEN p.last_known_cost
    WHEN rc.component_type = 'preparation' THEN pr.last_known_cost
  END AS ingredient_cost_per_unit,
  CASE
    WHEN rc.component_type = 'product' THEN p.base_unit
    WHEN rc.component_type = 'preparation' THEN pr.output_unit
  END AS ingredient_base_unit
FROM recipes r
JOIN recipe_components rc ON rc.recipe_id::uuid = r.id
LEFT JOIN products p ON rc.component_type = 'product' AND rc.component_id = p.id::text
LEFT JOIN preparations pr ON rc.component_type = 'preparation' AND rc.component_id = pr.id::text
WHERE r.is_active = true;

GRANT SELECT ON v_menu_with_cost TO ai_readonly;
GRANT SELECT ON v_daily_sales TO ai_readonly;
GRANT SELECT ON v_food_cost_report TO ai_readonly;
GRANT SELECT ON v_recipe_details TO ai_readonly;

-- ============================================================
-- 3. RPC FUNCTION: ai_readonly_query
-- ============================================================

CREATE OR REPLACE FUNCTION ai_readonly_query(sql_query text, max_rows int DEFAULT 1000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  normalized text;
  limited_query text;
BEGIN
  normalized := lower(regexp_replace(trim(both from sql_query), '^\s+', '', 'g'));

  IF normalized !~ '^(select|with)\s' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only SELECT queries are allowed');
  END IF;

  IF normalized ~ ';\s*(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\s' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Multiple statements or DML/DDL operations are not allowed');
  END IF;

  IF normalized ~ ';\s*\S' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Multiple statements are not allowed');
  END IF;

  limited_query := sql_query;
  IF normalized NOT LIKE '%limit%' THEN
    limited_query := sql_query || ' LIMIT ' || max_rows;
  END IF;

  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || limited_query || ') t'
    INTO result;

  RETURN jsonb_build_object('success', true, 'data', result, 'rows', jsonb_array_length(result));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

REVOKE ALL ON FUNCTION ai_readonly_query(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION ai_readonly_query(text, int) FROM anon;
REVOKE ALL ON FUNCTION ai_readonly_query(text, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION ai_readonly_query(text, int) TO service_role;
