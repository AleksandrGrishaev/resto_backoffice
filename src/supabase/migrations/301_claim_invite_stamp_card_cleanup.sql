-- Migration: 301_claim_invite_stamp_card_cleanup
-- Description: Fix stamp_cards FK block in claim_invite + conditional card creation
-- Date: 2026-04-22
--
-- CONTEXT: See src/About/docs/loylty/TODO_CLAIM_INVITE_STAMP_CARD_CLEANUP.md
-- Root-cause fixes for two issues discovered in the 2026-04-21 telegram-invite post-mortem:
--
-- 1. FK stamp_cards_customer_id_fkey (NO ACTION) blocks DELETE of stub customer
--    inside claim_invite's 'customer' flow. claim_invite's outer EXCEPTION WHEN OTHERS
--    rolled back the whole transaction (identity re-point included), returning
--    {success:false} silently. Web-winter worked around this in claim_invite_as_user,
--    but direct client-side claim_invite calls (Google/email login, unique-new email)
--    still hit the issue. Fix: delete empty stamp_cards of the stub before DELETE customer.
--
-- 2. Self-registration flow unconditionally created a stamps-type stamp_card for every
--    new customer regardless of loyalty_program. Since DB default is 'cashback', that
--    meant cashback customers got a useless empty stamps card. Fix: force
--    loyalty_program='stamps' on self-registration (both handle_new_auth_user and
--    claim_invite's order-type flow) and gate card creation on loyalty_program='stamps'.

-- =============================================
-- 1. handle_new_auth_user: force loyalty_program='stamps' on self-registration
--    and gate stamp_card creation on loyalty_program='stamps'
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
  v_loyalty_program text;
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
    -- Self-registration → force loyalty_program='stamps'
    -- (DB default is 'cashback', reserved for staff-created POS customers)
    if v_provider = 'telegram' then
      insert into public.customers (name, telegram_id, telegram_username, loyalty_program, created_by)
      values (v_name, v_telegram_id, v_telegram_username, 'stamps', 'auth')
      returning id into v_customer_id;
    else
      insert into public.customers (name, email, loyalty_program, created_by)
      values (v_name, v_email, 'stamps', 'auth')
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

  -- Auto-create stamp card only for stamps-program customers.
  -- Gated to avoid empty useless cards on cashback/other programs.
  -- Wrapped in BEGIN..EXCEPTION so card creation failure never blocks auth sign-up.
  select loyalty_program into v_loyalty_program from public.customers where id = v_customer_id;

  if v_loyalty_program = 'stamps'
     and not exists (select 1 from public.stamp_cards where customer_id = v_customer_id and status = 'active') then
    begin
      for i in 1..3 loop
        select lpad((coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
        into v_card_number
        from public.stamp_cards;

        begin
          insert into public.stamp_cards (card_number, customer_id)
          values (v_card_number, v_customer_id);
          exit;
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

-- =============================================
-- 2. claim_invite: drop stub's empty stamp_cards before DELETE customer,
--    gate card creation on loyalty_program='stamps'
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
  v_loyalty_program TEXT;
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

  -- ==========================================
  -- FLOW 1: ORDER INVITE (QR-first)
  -- ==========================================
  IF v_invite.type = 'order' THEN
    IF v_existing_identity.id IS NOT NULL THEN
      v_customer_id := v_existing_identity.customer_id;
    ELSE
      -- Self-registration via order invite → loyalty_program='stamps'
      INSERT INTO customers (name, email, loyalty_program, created_by)
      VALUES (coalesce(split_part(v_email, '@', 1), 'Guest'), v_email, 'stamps', 'invite')
      RETURNING id INTO v_customer_id;

      INSERT INTO customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
      VALUES (v_customer_id, v_auth_uid, v_provider, v_email, v_provider_uid);

      -- Auto-create stamp card only for stamps-program (we just set it to 'stamps' above,
      -- kept as guard for future changes).
      BEGIN
        IF (SELECT loyalty_program FROM customers WHERE id = v_customer_id) = 'stamps' THEN
          FOR i IN 1..3 LOOP
            SELECT lpad((coalesce(max(nullif(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
            INTO v_card_number FROM stamp_cards;
            BEGIN
              INSERT INTO stamp_cards (card_number, customer_id) VALUES (v_card_number, v_customer_id);
              EXIT;
            EXCEPTION WHEN unique_violation THEN NULL;
            END;
          END LOOP;
        END IF;
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

      v_trigger_customer_id := v_existing_identity.customer_id;

      UPDATE customer_identities SET customer_id = v_customer_id
      WHERE id = v_existing_identity.id;

      UPDATE customers SET email = NULL, telegram_id = NULL
      WHERE id = v_trigger_customer_id AND created_by = 'auth';

      -- Drop stub's empty stamp_cards before customer DELETE — otherwise
      -- FK stamp_cards_customer_id_fkey (NO ACTION) blocks the DELETE,
      -- outer EXCEPTION WHEN OTHERS catches it and rolls back the whole claim.
      -- Only empty cards (no stamp_entries) — real loyalty data is never touched.
      DELETE FROM stamp_cards
      WHERE customer_id = v_trigger_customer_id
        AND NOT EXISTS (SELECT 1 FROM stamp_entries WHERE card_id = stamp_cards.id);

      DELETE FROM customers
      WHERE id = v_trigger_customer_id
        AND created_by = 'auth'
        AND NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = v_trigger_customer_id)
        AND NOT EXISTS (SELECT 1 FROM customer_identities WHERE customer_id = v_trigger_customer_id);
    ELSE
      INSERT INTO customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
      VALUES (v_customer_id, v_auth_uid, v_provider, v_email, v_provider_uid);
    END IF;

    -- Don't override invite customer's loyalty_program — it was set by staff on creation.
    -- Only fill in missing contact fields from auth meta.
    UPDATE customers SET
      email = coalesce(email, v_email),
      telegram_id = coalesce(telegram_id, v_telegram_id),
      telegram_username = coalesce(telegram_username, v_telegram_username)
    WHERE id = v_customer_id;

    -- Auto-create stamp card only for stamps-program customers.
    SELECT loyalty_program INTO v_loyalty_program FROM customers WHERE id = v_customer_id;
    SELECT EXISTS(SELECT 1 FROM stamp_cards WHERE customer_id = v_customer_id AND status = 'active') INTO v_has_card;
    IF v_loyalty_program = 'stamps' AND NOT v_has_card THEN
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
      EXCEPTION WHEN OTHERS THEN NULL;
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

-- =============================================
-- 3. One-off cleanup: empty stamps cards on non-stamps customers
-- =============================================
-- Safe: only removes cards with zero stamp_entries on customers whose
-- loyalty_program is not 'stamps'. Real loyalty data is never touched.
DO $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM stamp_cards sc
  USING customers c
  WHERE c.id = sc.customer_id
    AND sc.status = 'active'
    AND c.loyalty_program <> 'stamps'
    AND NOT EXISTS (SELECT 1 FROM stamp_entries se WHERE se.card_id = sc.id);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % empty stamp_cards on non-stamps customers', v_deleted;
END;
$$;
