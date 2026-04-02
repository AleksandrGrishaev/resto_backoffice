-- Migration: 237_link_anonymous_orders_rpc
-- Description: RPC to link anonymous orders to a customer after auth upgrade
-- Date: 2026-03-20
--
-- Called after linkIdentity() upgrades an anonymous session to a real user.
-- Links orders where created_by = auth.uid() to the newly created customer.
-- Covers both:
--   1) New orders (post-fix 235): customer_id IS NULL
--   2) Legacy orders (pre-fix 235): customer_id = garbage Guest customer

CREATE OR REPLACE FUNCTION public.link_anonymous_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
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

  -- Link orders created by this auth user that aren't already linked to this customer
  -- Two cases:
  --   1) customer_id IS NULL (new anonymous orders after fix 235)
  --   2) customer_id = garbage Guest (legacy orders before fix 235)
  UPDATE orders
  SET customer_id = v_customer_id
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
