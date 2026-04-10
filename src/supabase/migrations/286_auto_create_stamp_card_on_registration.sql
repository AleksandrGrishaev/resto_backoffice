-- Migration: 286_auto_create_stamp_card_on_registration
-- Description: Auto-create stamp card when customer registers (all flows)
-- Date: 2026-04-09
--
-- CONTEXT: Customers on stamps loyalty program were created without a stamp_cards record,
-- so stamps were never accrued after payment. This migration updates handle_new_auth_user
-- and claim_invite RPCs to auto-create a stamp card linked to the customer.

-- =============================================
-- 1. Update handle_new_auth_user trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_email text;
  v_name text;
  v_provider text;
  v_customer_id uuid;
  v_provider_uid text;
  v_telegram_id text;
  v_telegram_username text;
  v_is_new_customer boolean := false;
  v_card_number text;
begin
  -- Skip anonymous sign-ups (no customer needed until they register)
  IF new.is_anonymous = true THEN
    RETURN new;
  END IF;

  -- Extract info from the new auth user
  v_email := new.email;
  v_provider := coalesce(
    new.raw_user_meta_data ->> 'custom_provider',
    new.raw_app_meta_data ->> 'provider',
    'email'
  );

  -- Extract provider-specific UID
  if v_provider = 'telegram' then
    v_telegram_id := new.raw_user_meta_data ->> 'telegram_id';
    v_telegram_username := new.raw_user_meta_data ->> 'telegram_username';
    v_provider_uid := v_telegram_id;
    v_name := coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      v_telegram_username,
      'Telegram User'
    );
  else
    v_provider_uid := coalesce(
      new.raw_user_meta_data ->> 'sub',  -- Google sub ID
      v_email
    );
    v_name := coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(v_email, '@', 1),
      'Guest'
    );
  end if;

  -- Transliterate Cyrillic to Latin (customers must have Latin names)
  v_name := transliterate_to_latin(v_name);

  -- Smart match: for Telegram, try to find customer by telegram_id first
  if v_provider = 'telegram' and v_telegram_id is not null then
    select id into v_customer_id
    from public.customers
    where telegram_id = v_telegram_id
      and status = 'active'
    limit 1;
  end if;

  -- Then try email match (for non-telegram or if telegram_id didn't match)
  if v_customer_id is null and v_email is not null
     and v_email not like '%@telegram.local' then
    select id into v_customer_id
    from public.customers
    where email = v_email
      and status = 'active'
    limit 1;
  end if;

  -- No match: create new customer
  if v_customer_id is null then
    v_is_new_customer := true;
    if v_provider = 'telegram' then
      insert into public.customers (name, telegram_id, telegram_username, created_by)
      values (v_name, v_telegram_id, v_telegram_username, 'auth')
      returning id into v_customer_id;
    else
      insert into public.customers (name, email, created_by)
      values (v_name, v_email, 'auth')
      on conflict (email) where status = 'active' and email is not null
      do update set updated_at = now()
      returning id into v_customer_id;
    end if;
  else
    -- Update existing customer with telegram info if not set
    if v_provider = 'telegram' and v_telegram_id is not null then
      update public.customers
      set telegram_id = coalesce(telegram_id, v_telegram_id),
          telegram_username = coalesce(telegram_username, v_telegram_username)
      where id = v_customer_id;
    end if;
  end if;

  -- Create identity link
  insert into public.customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
  values (v_customer_id, new.id, v_provider, v_email, v_provider_uid);

  -- Auto-create stamp card for new customers (default loyalty_program is 'stamps')
  if v_is_new_customer then
    select lpad((coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
    into v_card_number
    from public.stamp_cards;

    insert into public.stamp_cards (card_number, customer_id)
    values (v_card_number, v_customer_id);
  end if;

  return new;
end;
$function$;

-- =============================================
-- 2. Update claim_invite RPC
-- =============================================
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
  v_telegram_id TEXT;
  v_telegram_username TEXT;
  v_customer_id UUID;
  v_trigger_customer_id UUID;
  v_customer_name TEXT;
  v_claimed_id UUID;
  v_card_number TEXT;
  v_has_card BOOLEAN;
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

  -- Get auth user info (including telegram data)
  SELECT
    coalesce(raw_user_meta_data->>'custom_provider', raw_app_meta_data->>'provider', 'email'),
    email,
    coalesce(raw_user_meta_data->>'sub', email),
    raw_user_meta_data->>'telegram_id',
    raw_user_meta_data->>'telegram_username'
  INTO v_provider, v_email, v_provider_uid, v_telegram_id, v_telegram_username
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

      -- Auto-create stamp card for new customer
      SELECT lpad((coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
      INTO v_card_number FROM stamp_cards;
      INSERT INTO stamp_cards (card_number, customer_id) VALUES (v_card_number, v_customer_id);
    END IF;

    -- Get customer name for order update
    SELECT name INTO v_customer_name FROM customers WHERE id = v_customer_id;

    -- Link order to customer (set both customer_id AND customer_name for POS realtime)
    UPDATE orders SET
      customer_id = v_customer_id,
      customer_name = v_customer_name,
      -- Propagate customer into bills JSONB (bill-level is source of truth for POS)
      bills = (
        SELECT COALESCE(jsonb_agg(
          bill || jsonb_build_object('customerId', v_customer_id, 'customerName', v_customer_name)
        ), bills)
        FROM jsonb_array_elements(bills) AS bill
      )
    WHERE id = v_invite.order_id AND customer_id IS NULL;

    -- Set loyalty program and telegram data
    UPDATE customers SET
      loyalty_program = coalesce(loyalty_program, 'stamps'),
      telegram_id = coalesce(telegram_id, v_telegram_id),
      telegram_username = coalesce(telegram_username, v_telegram_username)
    WHERE id = v_customer_id;

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

      -- Clear email/telegram on trigger customer first to avoid unique constraint violations
      UPDATE customers SET email = NULL, telegram_id = NULL
      WHERE id = v_trigger_customer_id AND created_by = 'auth';

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
      telegram_id = coalesce(telegram_id, v_telegram_id),
      telegram_username = coalesce(telegram_username, v_telegram_username),
      loyalty_program = coalesce(loyalty_program, 'stamps')
    WHERE id = v_customer_id;

    -- Auto-create stamp card if customer doesn't have one
    SELECT EXISTS(SELECT 1 FROM stamp_cards WHERE customer_id = v_customer_id AND status = 'active') INTO v_has_card;
    IF NOT v_has_card THEN
      SELECT lpad((coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
      INTO v_card_number FROM stamp_cards;
      INSERT INTO stamp_cards (card_number, customer_id) VALUES (v_card_number, v_customer_id);
    END IF;

    SELECT name INTO v_customer_name FROM customers WHERE id = v_customer_id;

    -- Link any anonymous orders from this auth user (with bills JSONB propagation)
    UPDATE orders SET
      customer_id = v_customer_id,
      customer_name = v_customer_name,
      bills = (
        SELECT COALESCE(jsonb_agg(
          bill || jsonb_build_object('customerId', v_customer_id, 'customerName', v_customer_name)
        ), bills)
        FROM jsonb_array_elements(bills) AS bill
      )
    WHERE created_by = v_auth_uid AND customer_id IS NULL;

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
  RETURN jsonb_build_object('success', false, 'error', 'Failed to claim invite: ' || SQLERRM);
END;
$$;

-- =============================================
-- 3. Backfill: create stamp cards for existing stamps-program customers without one
-- =============================================
DO $$
DECLARE
  v_customer RECORD;
  v_card_number TEXT;
  v_max_num INT;
BEGIN
  -- Get current max card number
  SELECT coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0)
  INTO v_max_num FROM stamp_cards;

  FOR v_customer IN
    SELECT c.id, c.name
    FROM customers c
    WHERE c.loyalty_program = 'stamps'
      AND c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM stamp_cards sc
        WHERE sc.customer_id = c.id AND sc.status = 'active'
      )
    ORDER BY c.created_at
  LOOP
    v_max_num := v_max_num + 1;
    v_card_number := lpad(v_max_num::text, 3, '0');

    INSERT INTO stamp_cards (card_number, customer_id)
    VALUES (v_card_number, v_customer.id);

    RAISE NOTICE 'Created stamp card % for customer % (%)', v_card_number, v_customer.name, v_customer.id;
  END LOOP;
END;
$$;
