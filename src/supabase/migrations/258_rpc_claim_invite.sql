-- Migration: 258_rpc_claim_invite
-- Description: Unified RPC to claim both customer and order invites
-- Date: 2026-03-26
--
-- CONTEXT: Called from web-winter after customer authenticates via /join/[token].
-- Handles two flows:
-- 1. ORDER invite: links auth user's customer to the order + sets customer_name for realtime
-- 2. CUSTOMER invite: links auth user to existing POS customer, handles trigger conflict
-- Security: FOR UPDATE SKIP LOCKED prevents double-claim race condition.
-- Generic error messages prevent DB detail leakage.

CREATE OR REPLACE FUNCTION public.claim_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invite RECORD;
  v_auth_uid UUID := auth.uid();
  v_existing_identity RECORD;
  v_provider TEXT;
  v_email TEXT;
  v_provider_uid TEXT;
  v_customer_id UUID;
  v_trigger_customer_id UUID;
  v_customer_name TEXT;
  v_claimed_id UUID;
BEGIN
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find and lock active invite (FOR UPDATE prevents double-claim)
  SELECT * INTO v_invite
  FROM customer_invites
  WHERE token = p_token AND status = 'active' AND expires_at > now()
  FOR UPDATE SKIP LOCKED;

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found, expired, or already being claimed');
  END IF;

  -- Get auth user info
  SELECT
    coalesce(raw_user_meta_data->>'custom_provider', raw_app_meta_data->>'provider', 'email'),
    email,
    coalesce(raw_user_meta_data->>'sub', email)
  INTO v_provider, v_email, v_provider_uid
  FROM auth.users WHERE id = v_auth_uid;

  -- Check if auth user already has an identity (created by handle_new_auth_user trigger)
  SELECT * INTO v_existing_identity
  FROM customer_identities
  WHERE auth_user_id = v_auth_uid
  LIMIT 1;

  -- ==========================================
  -- FLOW 1: ORDER INVITE (QR-first)
  -- ==========================================
  IF v_invite.type = 'order' THEN
    IF v_existing_identity.id IS NOT NULL THEN
      v_customer_id := v_existing_identity.customer_id;
    ELSE
      INSERT INTO customers (name, email, loyalty_program, created_by)
      VALUES (coalesce(split_part(v_email, '@', 1), 'Guest'), v_email, 'stamps', 'invite')
      RETURNING id INTO v_customer_id;

      INSERT INTO customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
      VALUES (v_customer_id, v_auth_uid, v_provider, v_email, v_provider_uid);
    END IF;

    -- Get customer name for order update
    SELECT name INTO v_customer_name FROM customers WHERE id = v_customer_id;

    -- Link order to customer (set both customer_id AND customer_name for POS realtime)
    UPDATE orders SET customer_id = v_customer_id, customer_name = v_customer_name
    WHERE id = v_invite.order_id AND customer_id IS NULL;

    -- Set loyalty program to stamps
    UPDATE customers SET loyalty_program = 'stamps'
    WHERE id = v_customer_id AND loyalty_program IS NULL;

    -- Claim invite (with status guard for extra safety)
    UPDATE customer_invites SET status = 'claimed', claimed_by = v_auth_uid, claimed_at = now()
    WHERE id = v_invite.id AND status = 'active'
    RETURNING id INTO v_claimed_id;

    IF v_claimed_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invite already claimed');
    END IF;

    RETURN jsonb_build_object(
      'success', true, 'type', 'order',
      'customerId', v_customer_id, 'customerName', v_customer_name,
      'orderId', v_invite.order_id
    );

  -- ==========================================
  -- FLOW 2: CUSTOMER INVITE
  -- ==========================================
  ELSIF v_invite.type = 'customer' THEN
    v_customer_id := v_invite.customer_id;

    IF v_existing_identity.id IS NOT NULL THEN
      IF v_existing_identity.customer_id = v_customer_id THEN
        UPDATE customer_invites SET status = 'claimed', claimed_by = v_auth_uid, claimed_at = now()
        WHERE id = v_invite.id AND status = 'active';
        RETURN jsonb_build_object('success', true, 'type', 'customer', 'alreadyLinked', true, 'customerId', v_customer_id);
      END IF;

      -- Re-link identity from trigger-created customer to invite customer
      v_trigger_customer_id := v_existing_identity.customer_id;

      UPDATE customer_identities SET customer_id = v_customer_id
      WHERE id = v_existing_identity.id;

      -- Delete trigger-created empty customer (safe guards)
      DELETE FROM customers
      WHERE id = v_trigger_customer_id
        AND created_by = 'auth'
        AND NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = v_trigger_customer_id)
        AND NOT EXISTS (SELECT 1 FROM customer_identities WHERE customer_id = v_trigger_customer_id);
    ELSE
      INSERT INTO customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
      VALUES (v_customer_id, v_auth_uid, v_provider, v_email, v_provider_uid);
    END IF;

    UPDATE customers SET
      email = coalesce(email, v_email),
      loyalty_program = coalesce(loyalty_program, 'stamps')
    WHERE id = v_customer_id;

    -- Link any anonymous orders from this auth user
    UPDATE orders SET customer_id = v_customer_id
    WHERE created_by = v_auth_uid::text AND customer_id IS NULL;

    SELECT name INTO v_customer_name FROM customers WHERE id = v_customer_id;

    UPDATE customer_invites SET status = 'claimed', claimed_by = v_auth_uid, claimed_at = now()
    WHERE id = v_invite.id AND status = 'active'
    RETURNING id INTO v_claimed_id;

    IF v_claimed_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invite already claimed');
    END IF;

    RETURN jsonb_build_object(
      'success', true, 'type', 'customer',
      'customerId', v_customer_id, 'customerName', v_customer_name
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Unknown invite type');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to claim invite');
END;
$$;
