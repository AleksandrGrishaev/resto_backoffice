-- Create PIN authentication functions for PRODUCTION
-- Run in Supabase SQL Editor (Production)
-- These functions are required for PIN-based authentication

-- Function 1: Simple PIN authentication (returns user data)
CREATE OR REPLACE FUNCTION public.authenticate_with_pin(pin_input text)
 RETURNS TABLE(user_id uuid, user_name text, user_email text, user_roles text[], user_avatar text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.email,
    u.roles,
    u.avatar_url
  FROM users u
  WHERE u.pin_hash = crypt(pin_input, u.pin_hash)
    AND u.pin_hash IS NOT NULL
    AND u.is_active = true;
END;
$function$;

-- Function 2: Create user with PIN
CREATE OR REPLACE FUNCTION public.create_user_with_pin(p_name text, p_pin text, p_roles text[], p_email text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO users (name, pin_hash, roles, email, created_at, updated_at)
  VALUES (
    p_name,
    crypt(p_pin, gen_salt('bf')),
    p_roles,
    p_email,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$function$;

-- Function 3: Get PIN user credentials (for Supabase Auth integration)
-- This function validates PIN and returns credentials for signInWithPassword()
CREATE OR REPLACE FUNCTION public.get_pin_user_credentials(pin_input text)
 RETURNS TABLE(user_id uuid, user_email text, user_password text, user_name text, user_roles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  found_user users%ROWTYPE;
  temp_password TEXT;
BEGIN
  -- Validate PIN hash
  SELECT * INTO found_user
  FROM users
  WHERE pin_hash = crypt(pin_input, pin_hash)
    AND is_active = true
    AND pin_hash IS NOT NULL
  LIMIT 1;

  -- If no user found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Update last_login_at
  UPDATE users
  SET last_login_at = NOW()
  WHERE id = found_user.id;

  -- Generate temp password (same logic as seed script)
  -- Format: first4chars + role + 123
  temp_password := lower(substring(found_user.name from 1 for 4)) || found_user.roles[1] || '123';

  -- Return credentials for signInWithPassword()
  RETURN QUERY
  SELECT
    found_user.id,
    found_user.email,
    temp_password,
    found_user.name,
    found_user.roles;
END;
$function$;

-- Function 4: Update user PIN
CREATE OR REPLACE FUNCTION public.update_user_pin(p_user_id uuid, p_new_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE users
  SET
    pin_hash = crypt(p_new_pin, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$function$;

-- Verify all functions created
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'authenticate_with_pin',
    'create_user_with_pin',
    'get_pin_user_credentials',
    'update_user_pin'
  )
ORDER BY p.proname;
