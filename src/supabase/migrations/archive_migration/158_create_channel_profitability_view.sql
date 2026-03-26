-- Migration: 158_create_channel_profitability_view
-- Description: Analytical view for P&L by sales channel (cafe/gobiz/grab) per month
-- Date: 2026-02-25
-- Updated: 2026-02-25
--   v2: use finalRevenue as unified base, add tax_collected
--   v3: use originalPrice as Gross Revenue (customer-facing price),
--       Net Revenue = Gross - Discounts - Tax - Commission - Marketing
-- Context: Channel profitability sprint — combines sales, commissions, and marketing data

DROP VIEW IF EXISTS v_channel_profitability;

CREATE VIEW v_channel_profitability AS
WITH
-- 1. Sales data aggregated by channel and month
sales AS (
  SELECT
    CASE
      WHEN o.channel_code IN ('dine_in', 'takeaway') OR o.channel_code IS NULL THEN 'cafe'
      WHEN o.channel_code = 'gobiz' THEN 'gobiz'
      WHEN o.channel_code = 'grab' THEN 'grab'
      ELSE o.channel_code
    END AS channel,
    date_trunc('month', st.created_at) AS period,
    COUNT(DISTINCT o.id) AS orders_count,
    COUNT(st.id) AS items_sold,
    -- Gross Revenue = originalPrice (customer-facing menu price)
    -- Cafe: base price excl tax | GoFood/Grab: customer price incl tax
    COALESCE(SUM(
      COALESCE(
        (st.profit_calculation->>'originalPrice')::numeric,
        (st.profit_calculation->>'finalRevenue')::numeric,
        (st.profit_calculation->>'revenue')::numeric,
        0
      )
    ), 0) AS revenue_gross,
    -- Discounts (already reflected in finalRevenue, tracked separately for P&L)
    COALESCE(SUM(
      COALESCE((st.profit_calculation->>'itemOwnDiscount')::numeric, 0) +
      COALESCE((st.profit_calculation->>'allocatedBillDiscount')::numeric, 0)
    ), 0) AS total_discounts,
    -- Food cost
    COALESCE(SUM(
      COALESCE(
        (st.profit_calculation->>'ingredientsCost')::numeric,
        (st.profit_calculation->>'cost')::numeric,
        0
      )
    ), 0) AS food_cost,
    -- Commission from profit_calculation (fallback if no transactions entry)
    COALESCE(SUM(
      COALESCE((st.profit_calculation->>'channelCommissionAmount')::numeric, 0)
    ), 0) AS commission_from_sales
  FROM sales_transactions st
  JOIN orders o ON o.id = st.order_id
  WHERE st.profit_calculation IS NOT NULL
  GROUP BY 1, 2
),

-- 1b. Tax collected from orders (order-level)
-- Cafe: exclusive tax (added on top) | GoFood/Grab: inclusive tax (extracted)
order_tax AS (
  SELECT
    CASE
      WHEN o.channel_code IN ('dine_in', 'takeaway') OR o.channel_code IS NULL THEN 'cafe'
      WHEN o.channel_code = 'gobiz' THEN 'gobiz'
      WHEN o.channel_code = 'grab' THEN 'grab'
      ELSE o.channel_code
    END AS channel,
    date_trunc('month', o.created_at) AS period,
    COALESCE(SUM(o.tax_amount), 0) AS tax_collected
  FROM orders o
  WHERE o.status NOT IN ('draft', 'cancelled')
  GROUP BY 1, 2
),

-- 2. Commission expenses from transactions table
commissions AS (
  SELECT
    CASE
      WHEN t.expense_category->>'category' = 'gojek_commission' THEN 'gobiz'
      WHEN t.expense_category->>'category' = 'grab_commission' THEN 'grab'
    END AS channel,
    date_trunc('month', t.created_at) AS period,
    COALESCE(SUM(t.amount), 0) AS commission_expense
  FROM transactions t
  WHERE t.type = 'expense'
    AND t.expense_category->>'category' IN ('gojek_commission', 'grab_commission')
  GROUP BY 1, 2
),

-- 3. Marketing expenses linked to channels
marketing AS (
  SELECT
    COALESCE(tc.channel_code, 'unattributed') AS channel,
    date_trunc('month', t.created_at) AS period,
    COALESCE(SUM(t.amount), 0) AS marketing_cost
  FROM transactions t
  JOIN transaction_categories tc ON tc.code = t.expense_category->>'category'
  WHERE t.type = 'expense'
    AND (
      tc.parent_id = (SELECT id FROM transaction_categories WHERE code = 'marketing')
      OR tc.code = 'marketing'
    )
  GROUP BY 1, 2
)

SELECT
  s.channel,
  s.period,
  s.orders_count,
  s.items_sold,
  ROUND(s.revenue_gross, 2) AS revenue_gross,
  ROUND(s.total_discounts, 2) AS total_discounts,
  ROUND(COALESCE(ot.tax_collected, 0), 2) AS tax_collected,
  ROUND(COALESCE(c.commission_expense, s.commission_from_sales), 2) AS commission,
  ROUND(COALESCE(m.marketing_cost, 0), 2) AS marketing_cost,
  -- Net Revenue = Gross - all deductions (what we actually keep before COGS)
  ROUND(
    s.revenue_gross
    - s.total_discounts
    - COALESCE(ot.tax_collected, 0)
    - COALESCE(c.commission_expense, s.commission_from_sales)
    - COALESCE(m.marketing_cost, 0)
  , 2) AS revenue_net,
  ROUND(s.food_cost, 2) AS food_cost,
  -- Net Profit = Net Revenue - Food Cost
  ROUND(
    s.revenue_gross
    - s.total_discounts
    - COALESCE(ot.tax_collected, 0)
    - COALESCE(c.commission_expense, s.commission_from_sales)
    - COALESCE(m.marketing_cost, 0)
    - s.food_cost
  , 2) AS net_profit,
  -- Food Cost % of Net Revenue
  CASE WHEN (s.revenue_gross - s.total_discounts - COALESCE(ot.tax_collected, 0)
    - COALESCE(c.commission_expense, s.commission_from_sales) - COALESCE(m.marketing_cost, 0)) > 0
    THEN ROUND(s.food_cost / (s.revenue_gross - s.total_discounts - COALESCE(ot.tax_collected, 0)
      - COALESCE(c.commission_expense, s.commission_from_sales) - COALESCE(m.marketing_cost, 0)) * 100, 1)
    ELSE 0
  END AS food_cost_pct,
  -- Net Margin = Net Profit / Net Revenue
  CASE WHEN (s.revenue_gross - s.total_discounts - COALESCE(ot.tax_collected, 0)
    - COALESCE(c.commission_expense, s.commission_from_sales) - COALESCE(m.marketing_cost, 0)) > 0
    THEN ROUND(
      (s.revenue_gross - s.total_discounts - COALESCE(ot.tax_collected, 0)
       - COALESCE(c.commission_expense, s.commission_from_sales) - COALESCE(m.marketing_cost, 0) - s.food_cost)
      / (s.revenue_gross - s.total_discounts - COALESCE(ot.tax_collected, 0)
       - COALESCE(c.commission_expense, s.commission_from_sales) - COALESCE(m.marketing_cost, 0)) * 100, 1)
    ELSE 0
  END AS net_margin_pct
FROM sales s
LEFT JOIN order_tax ot ON ot.channel = s.channel AND ot.period = s.period
LEFT JOIN commissions c ON c.channel = s.channel AND c.period = s.period
LEFT JOIN marketing m ON m.channel = s.channel AND m.period = s.period
ORDER BY s.period DESC, s.channel;
