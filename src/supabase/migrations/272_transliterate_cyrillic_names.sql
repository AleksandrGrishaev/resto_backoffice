-- Migration: 272_transliterate_cyrillic_names
-- Description: Add transliterate_to_latin helper + update handle_new_auth_user to use it
-- Date: 2026-03-30

-- Helper function: transliterate Cyrillic to Latin
CREATE OR REPLACE FUNCTION public.transliterate_to_latin(p_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result TEXT := p_text;
BEGIN
  IF p_text IS NULL THEN RETURN NULL; END IF;

  -- Cyrillic uppercase (multi-char first)
  v_result := replace(v_result, 'Щ', 'Shch');
  v_result := replace(v_result, 'Ш', 'Sh');
  v_result := replace(v_result, 'Ч', 'Ch');
  v_result := replace(v_result, 'Ц', 'Ts');
  v_result := replace(v_result, 'Ж', 'Zh');
  v_result := replace(v_result, 'Ю', 'Yu');
  v_result := replace(v_result, 'Я', 'Ya');
  v_result := replace(v_result, 'Ё', 'Yo');
  v_result := replace(v_result, 'А', 'A');
  v_result := replace(v_result, 'Б', 'B');
  v_result := replace(v_result, 'В', 'V');
  v_result := replace(v_result, 'Г', 'G');
  v_result := replace(v_result, 'Д', 'D');
  v_result := replace(v_result, 'Е', 'E');
  v_result := replace(v_result, 'З', 'Z');
  v_result := replace(v_result, 'И', 'I');
  v_result := replace(v_result, 'Й', 'Y');
  v_result := replace(v_result, 'К', 'K');
  v_result := replace(v_result, 'Л', 'L');
  v_result := replace(v_result, 'М', 'M');
  v_result := replace(v_result, 'Н', 'N');
  v_result := replace(v_result, 'О', 'O');
  v_result := replace(v_result, 'П', 'P');
  v_result := replace(v_result, 'Р', 'R');
  v_result := replace(v_result, 'С', 'S');
  v_result := replace(v_result, 'Т', 'T');
  v_result := replace(v_result, 'У', 'U');
  v_result := replace(v_result, 'Ф', 'F');
  v_result := replace(v_result, 'Х', 'Kh');
  v_result := replace(v_result, 'Э', 'E');
  v_result := replace(v_result, 'Ъ', '');
  v_result := replace(v_result, 'Ы', 'Y');
  v_result := replace(v_result, 'Ь', '');

  -- Cyrillic lowercase (multi-char first)
  v_result := replace(v_result, 'щ', 'shch');
  v_result := replace(v_result, 'ш', 'sh');
  v_result := replace(v_result, 'ч', 'ch');
  v_result := replace(v_result, 'ц', 'ts');
  v_result := replace(v_result, 'ж', 'zh');
  v_result := replace(v_result, 'ю', 'yu');
  v_result := replace(v_result, 'я', 'ya');
  v_result := replace(v_result, 'ё', 'yo');
  v_result := replace(v_result, 'а', 'a');
  v_result := replace(v_result, 'б', 'b');
  v_result := replace(v_result, 'в', 'v');
  v_result := replace(v_result, 'г', 'g');
  v_result := replace(v_result, 'д', 'd');
  v_result := replace(v_result, 'е', 'e');
  v_result := replace(v_result, 'з', 'z');
  v_result := replace(v_result, 'и', 'i');
  v_result := replace(v_result, 'й', 'y');
  v_result := replace(v_result, 'к', 'k');
  v_result := replace(v_result, 'л', 'l');
  v_result := replace(v_result, 'м', 'm');
  v_result := replace(v_result, 'н', 'n');
  v_result := replace(v_result, 'о', 'o');
  v_result := replace(v_result, 'п', 'p');
  v_result := replace(v_result, 'р', 'r');
  v_result := replace(v_result, 'с', 's');
  v_result := replace(v_result, 'т', 't');
  v_result := replace(v_result, 'у', 'u');
  v_result := replace(v_result, 'ф', 'f');
  v_result := replace(v_result, 'х', 'kh');
  v_result := replace(v_result, 'э', 'e');
  v_result := replace(v_result, 'ъ', '');
  v_result := replace(v_result, 'ы', 'y');
  v_result := replace(v_result, 'ь', '');

  RETURN v_result;
END;
$$;

-- Update handle_new_auth_user to transliterate names
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

  -- Transliterate Cyrillic to Latin (customers must have Latin names)
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

  return new;
end;
$function$;
