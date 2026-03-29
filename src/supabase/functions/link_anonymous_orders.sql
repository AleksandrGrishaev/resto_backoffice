-- Function: link_anonymous_orders
-- Purpose: Link anonymous orders to a customer after auth upgrade (linkIdentity)
--
-- When an anonymous user upgrades to a real account via linkIdentity(),
-- their auth.uid() is preserved. This RPC finds all orders created by
-- that auth.uid() and links them to the newly created customer.
--
-- Covers:
--   1) New orders (post-fix 235): customer_id IS NULL
--   2) Legacy orders (pre-fix 235): customer_id = garbage Guest customer
--
-- Usage (from frontend after linkIdentity):
--   await supabase.rpc('link_anonymous_orders')
--
-- Returns: { success: true, linked: N } or { success: false, error: "..." }
--
-- History:
--   - Migration 237: initial version
--   - Migration 239: also update customer_name snapshot on orders

CREATE OR REPLACE FUNCTION public.link_anonymous_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_customer_name text;
  v_auth_uid uuid := auth.uid();
  v_linked_count integer;
BEGIN
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find customer by current auth user
  SELECT ci.customer_id INTO v_customer_id
  FROM customer_identities ci
  WHERE ci.auth_user_id = v_auth_uid
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'linked', 0, 'reason', 'no customer found');
  END IF;

  -- Get customer name for updating order snapshot
  SELECT name INTO v_customer_name
  FROM customers WHERE id = v_customer_id;

  -- Link orders and update customer_name snapshot + propagate to bills JSONB
  UPDATE orders
  SET customer_id = v_customer_id,
      customer_name = COALESCE(v_customer_name, customer_name),
      bills = (
        SELECT COALESCE(jsonb_agg(
          bill || jsonb_build_object('customerId', v_customer_id, 'customerName', COALESCE(v_customer_name, customer_name))
        ), bills)
        FROM jsonb_array_elements(bills) AS bill
      ),
      updated_at = now()
  WHERE created_by = v_auth_uid
    AND customer_id IS DISTINCT FROM v_customer_id
    AND (
      customer_id IS NULL
      OR customer_id IN (
        SELECT c.id FROM customers c
        WHERE c.created_by = 'auth' AND c.email IS NULL AND c.name = 'Guest'
      )
    );

  GET DIAGNOSTICS v_linked_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'linked', v_linked_count);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant to authenticated users (called after linkIdentity upgrade)
GRANT EXECUTE ON FUNCTION public.link_anonymous_orders() TO authenticated;
