-- Migration: 256_rpc_create_customer_invite
-- Description: RPC to generate invite QR for existing POS customer (Flow 2: Customer Invite)
-- Date: 2026-03-26
--
-- CONTEXT: Staff creates invite for a customer they registered in POS.
-- Customer scans QR → registers on website → identity linked to existing customer (no duplicate).
-- Token expires in 30 days. Previous active invites are expired.

CREATE OR REPLACE FUNCTION public.create_customer_invite(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_invite_id UUID;
  v_customer_name TEXT;
BEGIN
  -- Only staff can create invites
  IF NOT public.is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Verify customer exists and is active
  SELECT name INTO v_customer_name
  FROM customers WHERE id = p_customer_id AND status = 'active';

  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found or inactive');
  END IF;

  -- Generate unique URL-safe token (12 chars, 72 bits entropy)
  v_token := encode(gen_random_bytes(9), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  -- Expire previous active invites for this customer
  UPDATE customer_invites SET status = 'expired'
  WHERE customer_id = p_customer_id AND status = 'active' AND type = 'customer';

  INSERT INTO customer_invites (type, customer_id, token, expires_at)
  VALUES ('customer', p_customer_id, v_token, now() + interval '30 days')
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'inviteId', v_invite_id,
    'token', v_token,
    'customerName', v_customer_name,
    'url', 'https://winterbali.com/join/' || v_token
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to create invite: ' || SQLERRM);
END;
$$;
