-- Migration: 257_rpc_create_order_invite
-- Description: RPC to generate invite QR for orders without customer (Flow 1: QR-first)
-- Date: 2026-03-26
--
-- CONTEXT: Auto-generated when printing pre-bill for orders without customer.
-- Customer scans QR at the table → registers → order gets customer_id via realtime.
-- Token expires in 2 hours (current visit). Reuses existing active invite if present.

CREATE OR REPLACE FUNCTION public.create_order_invite(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_invite_id UUID;
  v_order_number TEXT;
  v_existing_customer UUID;
BEGIN
  -- Only staff can create invites
  IF NOT public.is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Verify order exists and has no customer
  SELECT order_number, customer_id INTO v_order_number, v_existing_customer
  FROM orders WHERE id = p_order_id;

  IF v_order_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- If order already has a customer, no invite needed
  IF v_existing_customer IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already has a customer');
  END IF;

  -- Check for existing active invite for this order (reuse)
  SELECT token INTO v_token
  FROM customer_invites
  WHERE order_id = p_order_id AND status = 'active' AND type = 'order' AND expires_at > now()
  LIMIT 1;

  IF v_token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'token', v_token,
      'url', 'https://winterbali.com/join/' || v_token,
      'orderNumber', v_order_number,
      'reused', true
    );
  END IF;

  -- Generate unique URL-safe token (12 chars, 72 bits entropy)
  v_token := encode(gen_random_bytes(9), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO customer_invites (type, order_id, token, expires_at)
  VALUES ('order', p_order_id, v_token, now() + interval '2 hours')
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'inviteId', v_invite_id,
    'token', v_token,
    'url', 'https://winterbali.com/join/' || v_token,
    'orderNumber', v_order_number
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to create invite');
END;
$$;
