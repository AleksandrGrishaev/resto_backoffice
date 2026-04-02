-- Migration: 269_fix_v_daily_sales_status_filter
-- Description: Fix v_daily_sales view to use actual POS final statuses instead of 'completed'
-- Date: 2026-03-30
--
-- CONTEXT: The view filtered WHERE o.status = 'completed', but POS never sets that status.
-- Actual final statuses are: 'served' (dine_in), 'collected' (takeaway), 'delivered' (delivery).
-- This caused Gross Revenue, Net Revenue, Orders, and Discounts to always show 0 in dashboard.

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
WHERE o.status IN ('served', 'collected', 'delivered')
GROUP BY sale_date, o.type, sc.code;
