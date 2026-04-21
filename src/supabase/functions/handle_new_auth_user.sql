-- Function: handle_new_auth_user
-- Trigger: on_auth_user_created (AFTER INSERT ON auth.users)
-- Purpose: Auto-create customer + customer_identity when a real user signs up
--
-- Smart match logic:
--   1. Telegram: match by telegram_id first
--   2. Email: match by email (skip @telegram.local)
--   3. No match: create new customer (loyalty_program='stamps' — self-registration default)
--
-- Anonymous users are skipped (no customer created until upgrade via linkIdentity)
--
-- Stamp card is created only for customers on 'stamps' loyalty program.
-- Cashback and other programs don't get auto-cards (would be empty/unused).
--
-- History:
--   - Original: created via MCP (no migration file)
--   - Migration 235: added anonymous skip, version-controlled
--   - Migration 286: auto-create stamp card on registration
--   - Migration 287: stamp card creation race fix (retry + EXCEPTION)
--   - Migration 288: stamp card for existing customers without one
--   - Migration 301: self-registration sets loyalty_program='stamps'; stamp card gated by loyalty_program

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

  -- No match: create new customer.
  -- Self-registration → force loyalty_program='stamps'
  -- (DB default 'cashback' is reserved for staff-created POS customers).
  if v_customer_id is null then
    v_is_new_customer := true;
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

  -- Auto-create stamp card only for stamps-program customers.
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
