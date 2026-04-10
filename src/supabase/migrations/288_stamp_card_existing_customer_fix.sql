-- Migration: 288_stamp_card_existing_customer_fix
-- Description: Auth trigger now creates stamp card for existing customers without one
-- Date: 2026-04-09
--
-- CONTEXT: handle_new_auth_user previously only created cards for v_is_new_customer=true.
-- Existing customers matched by email/telegram who lacked a card were skipped.
-- Now checks for active card existence instead.

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

  -- Auto-create stamp card if customer doesn't have one (new or existing)
  -- Wrapped in BEGIN..EXCEPTION so card creation failure never blocks auth sign-up
  if not exists (select 1 from public.stamp_cards where customer_id = v_customer_id and status = 'active') then
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
