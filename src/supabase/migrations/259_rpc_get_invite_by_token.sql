-- Migration: 259_rpc_get_invite_by_token
-- Description: Safe RPC for /join page to look up invite by token (replaces anon SELECT policy)
-- Date: 2026-03-26
--
-- CONTEXT: The /join/[token] page on web-winter needs to check if an invite is valid.
-- Instead of an anon SELECT RLS policy (which would expose all active invites),
-- this SECURITY DEFINER RPC returns only non-sensitive fields for a specific token.

CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_name TEXT;
BEGIN
  SELECT id, type, status, expires_at, customer_id, order_id
  INTO v_invite
  FROM customer_invites
  WHERE token = p_token AND status = 'active' AND expires_at > now();

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found or expired');
  END IF;

  -- Get display name based on type (only return name, not IDs)
  IF v_invite.type = 'customer' THEN
    SELECT name INTO v_name FROM customers WHERE id = v_invite.customer_id;
  ELSE
    SELECT order_number INTO v_name FROM orders WHERE id = v_invite.order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'type', v_invite.type,
    'name', coalesce(v_name, '')
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to lookup invite');
END;
$$;
