-- Migration: 156_update_food_cost_view_with_net_revenue
-- Description: Add net revenue (after discounts), discounts, and food_cost_pct columns
-- Date: 2026-02-25
-- Applied: DEV + PROD

DROP VIEW IF EXISTS v_food_cost_report;

CREATE VIEW v_food_cost_report AS
SELECT
  st.menu_item_id,
  st.menu_item_name,
  st.department,
  DATE(st.sold_at AT TIME ZONE 'Asia/Makassar') AS sale_date,
  COUNT(*) AS times_sold,
  SUM(st.quantity) AS total_quantity,
  AVG(st.unit_price)::numeric(12,2) AS avg_selling_price,
  AVG((st.profit_calculation->>'ingredientsCost')::numeric)::numeric(12,2) AS avg_food_cost,
  SUM((st.profit_calculation->>'ingredientsCost')::numeric)::numeric(12,2) AS total_food_cost,
  -- Revenue BEFORE discounts (gross price)
  SUM(st.total_price)::numeric(12,2) AS total_revenue_gross,
  -- Revenue AFTER discounts (net = actual collected)
  SUM((st.profit_calculation->>'finalRevenue')::numeric)::numeric(12,2) AS total_revenue_net,
  -- Total discounts
  SUM(COALESCE((st.profit_calculation->>'itemOwnDiscount')::numeric, 0)
    + COALESCE((st.profit_calculation->>'allocatedBillDiscount')::numeric, 0))::numeric(12,2) AS total_discounts,
  -- Profit (based on net revenue)
  SUM((st.profit_calculation->>'profit')::numeric)::numeric(12,2) AS total_profit,
  -- Avg margin %
  ROUND(AVG((st.profit_calculation->>'profitMargin')::numeric), 2) AS avg_margin_pct,
  -- Food cost % on NET revenue (matches internal reports)
  CASE WHEN SUM((st.profit_calculation->>'finalRevenue')::numeric) > 0
    THEN ROUND(SUM((st.profit_calculation->>'ingredientsCost')::numeric)
         / SUM((st.profit_calculation->>'finalRevenue')::numeric) * 100, 2)
    ELSE NULL
  END AS food_cost_pct_net,
  -- Food cost % on GROSS revenue (before discounts)
  CASE WHEN SUM(st.total_price) > 0
    THEN ROUND(SUM((st.profit_calculation->>'ingredientsCost')::numeric)
         / SUM(st.total_price)::numeric * 100, 2)
    ELSE NULL
  END AS food_cost_pct_gross
FROM sales_transactions st
WHERE st.profit_calculation IS NOT NULL
  AND st.profit_calculation->>'ingredientsCost' IS NOT NULL
GROUP BY st.menu_item_id, st.menu_item_name, st.department, sale_date;

GRANT SELECT ON v_food_cost_report TO ai_readonly;
