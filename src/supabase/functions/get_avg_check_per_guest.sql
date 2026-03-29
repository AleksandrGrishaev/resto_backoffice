-- RPC: get_avg_check_per_guest
-- Returns total revenue and total guests from bill-level guest counts
-- for dine-in orders within a date range
--
-- Bills store guestCount in the orders.bills JSONB array.
-- Only bills with guestCount > 0 are counted.

CREATE OR REPLACE FUNCTION get_avg_check_per_guest(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (total_revenue NUMERIC, total_guests BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM((b->>'total')::NUMERIC), 0) AS total_revenue,
    COALESCE(SUM((b->>'guestCount')::INTEGER), 0) AS total_guests
  FROM orders,
    jsonb_array_elements(bills) AS b
  WHERE type = 'dine_in'
    AND status NOT IN ('cancelled')
    AND (b->>'status') NOT IN ('cancelled')
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND (b->>'guestCount') IS NOT NULL
    AND (b->>'guestCount')::INTEGER > 0;
END;
$$;
