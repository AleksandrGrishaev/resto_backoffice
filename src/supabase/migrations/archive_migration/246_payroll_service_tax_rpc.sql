-- Migration: 246_payroll_service_tax_rpc
-- Description: RPC to calculate payroll service tax with commission adjustment
-- Date: 2026-03-25
--
-- For inclusive channels (GoFood, Grab) the service tax distributed to staff
-- should be based on the base dish price, excluding platform commission.
-- Formula: service_tax × (1 - commission_percent / 100)
-- For exclusive channels (Dine In, Takeaway) commission is 0, no adjustment.

CREATE OR REPLACE FUNCTION get_payroll_service_tax(
  date_from TIMESTAMPTZ,
  date_to TIMESTAMPTZ
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN sc.tax_mode = 'inclusive' AND sc.commission_percent > 0
      THEN st.service_tax_amount * (1 - sc.commission_percent / 100)
      ELSE st.service_tax_amount
    END
  ), 0)
  INTO v_total
  FROM sales_transactions st
  LEFT JOIN orders o ON o.id = st.order_id
  LEFT JOIN sales_channels sc ON sc.id = o.channel_id
  WHERE st.created_at >= date_from
    AND st.created_at <= date_to;

  RETURN ROUND(v_total);
END;
$$;
