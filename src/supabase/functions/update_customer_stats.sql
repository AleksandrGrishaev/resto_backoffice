-- Function: update_customer_stats
-- Description: Update customer visit/spend statistics after payment
-- Independent of loyalty accrual - always called when customer is attached to order
-- Usage: SELECT update_customer_stats('customer-uuid', 'order-uuid', 46575);

CREATE OR REPLACE FUNCTION update_customer_stats(
  p_customer_id UUID,
  p_order_id UUID DEFAULT NULL,
  p_order_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer RECORD;
  v_new_total_spent NUMERIC;
  v_new_visits INTEGER;
  v_new_avg_check NUMERIC;
BEGIN
  -- 1. Find customer
  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer not found or blocked'
    );
  END IF;

  -- 2. Calculate new stats
  v_new_total_spent := v_customer.total_spent + p_order_amount;
  v_new_visits := v_customer.total_visits + 1;
  v_new_avg_check := round(v_new_total_spent / v_new_visits);

  -- 3. Update customer
  UPDATE customers SET
    total_spent = v_new_total_spent,
    total_visits = v_new_visits,
    average_check = v_new_avg_check,
    first_visit_at = COALESCE(first_visit_at, now()),
    last_visit_at = now()
  WHERE id = p_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_spent', v_new_total_spent,
    'total_visits', v_new_visits,
    'average_check', v_new_avg_check
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
