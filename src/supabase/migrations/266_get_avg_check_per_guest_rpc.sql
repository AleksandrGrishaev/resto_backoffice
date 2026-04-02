-- Migration: 266_get_avg_check_per_guest_rpc
-- Description: RPC to calculate avg check per guest from bill-level guest counts
-- Date: 2026-03-29

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
