-- Migration: 287_stamp_card_creation_race_fix
-- Description: Fix race condition in stamp card auto-creation (retry on unique_violation)
-- Date: 2026-04-09
--
-- CONTEXT: Card number generation (SELECT max+1 → INSERT) is not atomic.
-- Concurrent requests can get the same number → unique_violation.
-- In handle_new_auth_user trigger, this blocked user registration entirely.
-- Fix: retry loop (3 attempts) + EXCEPTION block so failures never block auth/invite flows.

-- 1. Update handle_new_auth_user trigger with safe card creation
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
  IF new.is_anonymous = true THEN
    RETURN new;
  END IF;

  v_email := new.email;
  v_provider := coalesce(
    new.raw_user_meta_data ->> 'custom_provider',
    new.raw_app_meta_data ->> 'provider',
    'email'
  );

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
      new.raw_user_meta_data ->> 'sub',
      v_email
    );
    v_name := coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(v_email, '@', 1),
      'Guest'
    );
  end if;

  v_name := transliterate_to_latin(v_name);

  if v_provider = 'telegram' and v_telegram_id is not null then
    select id into v_customer_id
    from public.customers
    where telegram_id = v_telegram_id
      and status = 'active'
    limit 1;
  end if;

  if v_customer_id is null and v_email is not null
     and v_email not like '%@telegram.local' then
    select id into v_customer_id
    from public.customers
    where email = v_email
      and status = 'active'
    limit 1;
  end if;

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
    if v_provider = 'telegram' and v_telegram_id is not null then
      update public.customers
      set telegram_id = coalesce(telegram_id, v_telegram_id),
          telegram_username = coalesce(telegram_username, v_telegram_username)
      where id = v_customer_id;
    end if;
  end if;

  insert into public.customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
  values (v_customer_id, new.id, v_provider, v_email, v_provider_uid);

  -- Auto-create stamp card for new customers (default loyalty_program is 'stamps')
  -- Wrapped in BEGIN..EXCEPTION so card creation failure never blocks auth sign-up
  if v_is_new_customer then
    begin
      for i in 1..3 loop
        select lpad((coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
        into v_card_number
        from public.stamp_cards;

        begin
          insert into public.stamp_cards (card_number, customer_id)
          values (v_card_number, v_customer_id);
          exit; -- success, break loop
        exception when unique_violation then
          if i = 3 then raise notice 'stamp card creation failed after 3 retries for customer %', v_customer_id; end if;
        end;
      end loop;
    exception when others then
      raise notice 'stamp card auto-creation failed for customer %: %', v_customer_id, sqlerrm;
    end;
  end if;

  return new;
end;
$function$;

-- 2. Update claim_invite RPC with safe card creation
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

  SELECT * INTO v_invite
  FROM customer_invites
  WHERE token = p_token AND status = 'active' AND expires_at > now()
  FOR UPDATE SKIP LOCKED;

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found, expired, or already being claimed');
  END IF;

  SELECT
    coalesce(raw_user_meta_data->>'custom_provider', raw_app_meta_data->>'provider', 'email'),
    email,
    coalesce(raw_user_meta_data->>'sub', email),
    raw_user_meta_data->>'telegram_id',
    raw_user_meta_data->>'telegram_username'
  INTO v_provider, v_email, v_provider_uid, v_telegram_id, v_telegram_username
  FROM auth.users WHERE id = v_auth_uid;

  SELECT * INTO v_existing_identity
  FROM customer_identities
  WHERE auth_user_id = v_auth_uid
  LIMIT 1;

  IF v_invite.type = 'order' THEN
    IF v_existing_identity.id IS NOT NULL THEN
      v_customer_id := v_existing_identity.customer_id;
    ELSE
      INSERT INTO customers (name, email, loyalty_program, created_by)
      VALUES (coalesce(split_part(v_email, '@', 1), 'Guest'), v_email, 'stamps', 'invite')
      RETURNING id INTO v_customer_id;

      INSERT INTO customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
      VALUES (v_customer_id, v_auth_uid, v_provider, v_email, v_provider_uid);

      -- Auto-create stamp card for new customer (with retry on collision)
      BEGIN
        FOR i IN 1..3 LOOP
          SELECT lpad((coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
          INTO v_card_number FROM stamp_cards;
          BEGIN
            INSERT INTO stamp_cards (card_number, customer_id) VALUES (v_card_number, v_customer_id);
            EXIT;
          EXCEPTION WHEN unique_violation THEN NULL;
          END;
        END LOOP;
      EXCEPTION WHEN OTHERS THEN NULL; -- don't block invite claim
      END;
    END IF;

    SELECT name INTO v_customer_name FROM customers WHERE id = v_customer_id;

    UPDATE orders SET
      customer_id = v_customer_id,
      customer_name = v_customer_name,
      bills = (
        SELECT COALESCE(jsonb_agg(
          bill || jsonb_build_object('customerId', v_customer_id, 'customerName', v_customer_name)
        ), bills)
        FROM jsonb_array_elements(bills) AS bill
      )
    WHERE id = v_invite.order_id AND customer_id IS NULL;

    UPDATE customers SET
      loyalty_program = coalesce(loyalty_program, 'stamps'),
      telegram_id = coalesce(telegram_id, v_telegram_id),
      telegram_username = coalesce(telegram_username, v_telegram_username)
    WHERE id = v_customer_id;

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

  ELSIF v_invite.type = 'customer' THEN
    v_customer_id := v_invite.customer_id;

    IF v_existing_identity.id IS NOT NULL THEN
      IF v_existing_identity.customer_id = v_customer_id THEN
        UPDATE customer_invites SET status = 'claimed', claimed_by = v_auth_uid, claimed_at = now()
        WHERE id = v_invite.id AND status = 'active';
        RETURN jsonb_build_object('success', true, 'type', 'customer', 'alreadyLinked', true, 'customerId', v_customer_id);
      END IF;

      v_trigger_customer_id := v_existing_identity.customer_id;

      UPDATE customer_identities SET customer_id = v_customer_id
      WHERE id = v_existing_identity.id;

      UPDATE customers SET email = NULL, telegram_id = NULL
      WHERE id = v_trigger_customer_id AND created_by = 'auth';

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

    -- Auto-create stamp card if customer doesn't have one (with retry on collision)
    SELECT EXISTS(SELECT 1 FROM stamp_cards WHERE customer_id = v_customer_id AND status = 'active') INTO v_has_card;
    IF NOT v_has_card THEN
      BEGIN
        FOR i IN 1..3 LOOP
          SELECT lpad((coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
          INTO v_card_number FROM stamp_cards;
          BEGIN
            INSERT INTO stamp_cards (card_number, customer_id) VALUES (v_card_number, v_customer_id);
            EXIT;
          EXCEPTION WHEN unique_violation THEN NULL;
          END;
        END LOOP;
      EXCEPTION WHEN OTHERS THEN NULL; -- don't block invite claim
      END;
    END IF;

    SELECT name INTO v_customer_name FROM customers WHERE id = v_customer_id;

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
