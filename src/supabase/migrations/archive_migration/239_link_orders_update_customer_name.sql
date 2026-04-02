-- Migration: 239_link_orders_update_customer_name
-- Description: Update customer_name on orders when linking anonymous orders to a customer
-- Date: 2026-03-20
--
-- PROBLEM: When link_anonymous_orders or upgrade trigger updates customer_id,
-- customer_name on the order stays as NULL/"Guest". POS reads customer_name
-- from the order snapshot, not from the customers table.
--
-- FIX: Both link_anonymous_orders and handle_auth_user_upgrade now also
-- update customer_name from the customers table.

-- ============================================================
-- 1. Update link_anonymous_orders to also set customer_name
-- ============================================================
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

  -- Link orders and update customer_name snapshot
  UPDATE orders
  SET customer_id = v_customer_id,
      customer_name = COALESCE(v_customer_name, customer_name),
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

GRANT EXECUTE ON FUNCTION public.link_anonymous_orders() TO authenticated;

-- ============================================================
-- 2. Update handle_auth_user_upgrade to also set customer_name
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_name text;
  v_provider text;
  v_customer_id uuid;
  v_provider_uid text;
  v_telegram_id text;
  v_telegram_username text;
BEGIN
  -- Safety: only process actual anonymous -> real upgrades
  IF NOT (old.is_anonymous = true AND new.is_anonymous = false) THEN
    RETURN new;
  END IF;

  -- Check if identity already exists (idempotency)
  IF EXISTS (
    SELECT 1 FROM public.customer_identities WHERE auth_user_id = new.id
  ) THEN
    RETURN new;
  END IF;

  -- Extract info from the upgraded auth user
  v_email := new.email;
  v_provider := coalesce(
    new.raw_user_meta_data ->> 'custom_provider',
    new.raw_app_meta_data ->> 'provider',
    'email'
  );

  IF v_provider = 'telegram' THEN
    v_telegram_id := new.raw_user_meta_data ->> 'telegram_id';
    v_telegram_username := new.raw_user_meta_data ->> 'telegram_username';
    v_provider_uid := v_telegram_id;
    v_name := coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      v_telegram_username,
      'Telegram User'
    );
  ELSE
    v_provider_uid := coalesce(
      new.raw_user_meta_data ->> 'sub',
      v_email
    );
    v_name := coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(v_email, '@', 1),
      'User'
    );
  END IF;

  IF v_email IS NULL AND v_provider_uid IS NULL THEN
    RETURN new;
  END IF;

  -- Smart match: Telegram by telegram_id
  IF v_provider = 'telegram' AND v_telegram_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE telegram_id = v_telegram_id AND status = 'active'
    LIMIT 1;
  END IF;

  -- Smart match: email
  IF v_customer_id IS NULL AND v_email IS NOT NULL
     AND v_email NOT LIKE '%@telegram.local' THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE email = v_email AND status = 'active'
    LIMIT 1;
  END IF;

  -- No match: create new customer
  IF v_customer_id IS NULL THEN
    IF v_provider = 'telegram' THEN
      INSERT INTO public.customers (name, telegram_id, telegram_username, created_by)
      VALUES (v_name, v_telegram_id, v_telegram_username, 'auth')
      RETURNING id INTO v_customer_id;
    ELSE
      INSERT INTO public.customers (name, email, created_by)
      VALUES (v_name, v_email, 'auth')
      ON CONFLICT (email) WHERE status = 'active' AND email IS NOT NULL
      DO UPDATE SET updated_at = now()
      RETURNING id INTO v_customer_id;
    END IF;
  ELSE
    IF v_provider = 'telegram' AND v_telegram_id IS NOT NULL THEN
      UPDATE public.customers
      SET telegram_id = coalesce(telegram_id, v_telegram_id),
          telegram_username = coalesce(telegram_username, v_telegram_username)
      WHERE id = v_customer_id;
    END IF;
    -- Get name from existing customer
    SELECT name INTO v_name FROM public.customers WHERE id = v_customer_id;
  END IF;

  -- Create identity link
  INSERT INTO public.customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
  VALUES (v_customer_id, new.id, v_provider, v_email, v_provider_uid);

  -- Link anonymous orders to the new customer + update customer_name
  UPDATE public.orders
  SET customer_id = v_customer_id,
      customer_name = COALESCE(v_name, customer_name),
      updated_at = now()
  WHERE created_by = new.id
    AND customer_id IS DISTINCT FROM v_customer_id
    AND (
      customer_id IS NULL
      OR customer_id IN (
        SELECT c.id FROM customers c
        WHERE c.created_by = 'auth' AND c.email IS NULL AND c.name = 'Guest'
      )
    );

  RETURN new;
END;
$function$;
