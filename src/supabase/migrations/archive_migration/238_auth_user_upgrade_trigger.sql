-- Migration: 238_auth_user_upgrade_trigger
-- Description: CREATE customer when anonymous user upgrades via linkIdentity/updateUser
-- Date: 2026-03-20
--
-- CONTEXT: When an anonymous user calls linkIdentity() or updateUser({ email }),
-- Supabase updates the existing auth.users row (is_anonymous → false).
-- The INSERT trigger (on_auth_user_created) does NOT fire again.
-- This UPDATE trigger detects the is_anonymous change and creates customer + identity.
--
-- The trigger reuses the same smart-match logic from handle_new_auth_user:
--   1. Telegram: match by telegram_id
--   2. Email: match by email
--   3. No match: create new customer
-- Then calls link_anonymous_orders logic inline to bind prior orders.

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
  -- Safety: only process actual anonymous → real upgrades
  IF NOT (old.is_anonymous = true AND new.is_anonymous = false) THEN
    RETURN new;
  END IF;

  -- Check if identity already exists (idempotency — frontend may also call RPCs)
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

  -- Extract provider-specific UID
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
      new.raw_user_meta_data ->> 'sub',  -- Google sub ID
      v_email
    );
    v_name := coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(v_email, '@', 1),
      'User'
    );
  END IF;

  -- If we still have no email and no provider_uid, skip
  -- (GoTrue may update in multiple steps; frontend linkAnonymousOrders is the fallback)
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
    -- Update existing customer with telegram info if not set
    IF v_provider = 'telegram' AND v_telegram_id IS NOT NULL THEN
      UPDATE public.customers
      SET telegram_id = coalesce(telegram_id, v_telegram_id),
          telegram_username = coalesce(telegram_username, v_telegram_username)
      WHERE id = v_customer_id;
    END IF;
  END IF;

  -- Create identity link
  INSERT INTO public.customer_identities (customer_id, auth_user_id, provider, provider_email, provider_uid)
  VALUES (v_customer_id, new.id, v_provider, v_email, v_provider_uid);

  -- Link anonymous orders to the new customer
  UPDATE public.orders
  SET customer_id = v_customer_id
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

-- Trigger: fires only when is_anonymous changes from true to not-true
CREATE TRIGGER on_auth_user_upgraded
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (old.is_anonymous = true AND new.is_anonymous IS DISTINCT FROM true)
  EXECUTE FUNCTION handle_auth_user_upgrade();
