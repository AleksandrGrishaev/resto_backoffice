-- Migration: 270_fix_v_daily_sales_cartesian
-- Description: Fix v_daily_sales cartesian product — JOINs with order_items and payments inflated revenue
-- Date: 2026-03-30
--
-- CONTEXT: LEFT JOIN order_items × payments multiplied each order row, inflating SUM(total_amount).
-- Fix: pre-aggregate items and payments per order, then join 1:1.

CREATE OR REPLACE VIEW v_daily_sales AS
WITH order_base AS (
  SELECT
    o.id,
    DATE(o.created_at AT TIME ZONE 'Asia/Makassar') AS sale_date,
    o.type AS order_type,
    COALESCE(sc.code, 'direct') AS channel,
    o.total_amount,
    o.discount_amount,
    o.tax_amount,
    o.final_amount
  FROM orders o
  LEFT JOIN sales_channels sc ON sc.id = o.channel_id
  WHERE o.status IN ('served', 'collected', 'delivered')
),
items_agg AS (
  SELECT order_id, COUNT(*) AS item_count
  FROM order_items
  GROUP BY order_id
),
payments_agg AS (
  SELECT
    order_id,
    SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) AS cash_total,
    SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) AS card_total,
    SUM(CASE WHEN payment_method = 'qr' THEN amount ELSE 0 END) AS qr_total
  FROM payments
  WHERE status = 'completed'
  GROUP BY order_id
)
SELECT
  ob.sale_date,
  COUNT(ob.id) AS total_orders,
  COALESCE(SUM(ia.item_count), 0)::bigint AS total_items_sold,
  SUM(ob.total_amount)::numeric AS gross_revenue,
  SUM(ob.discount_amount)::numeric AS total_discounts,
  SUM(ob.tax_amount)::numeric AS total_tax,
  SUM(ob.final_amount)::numeric AS net_revenue,
  ob.order_type,
  ob.channel,
  COALESCE(SUM(pa.cash_total), 0)::numeric AS cash_total,
  COALESCE(SUM(pa.card_total), 0)::numeric AS card_total,
  COALESCE(SUM(pa.qr_total), 0)::numeric AS qr_total
FROM order_base ob
LEFT JOIN items_agg ia ON ia.order_id = ob.id
LEFT JOIN payments_agg pa ON pa.order_id = ob.id
GROUP BY ob.sale_date, ob.order_type, ob.channel;
