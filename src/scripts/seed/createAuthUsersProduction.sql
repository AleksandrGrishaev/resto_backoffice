-- Create auth.users records for PRODUCTION
-- Run in Supabase SQL Editor (Production)
-- These records are required for Supabase Auth integration with PIN login

-- IMPORTANT: Passwords follow the pattern: first4chars + role + 123
-- Example: "Admin User" + "admin" role -> "admiadmin123"

-- Enable pgcrypto extension for password hashing (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users from kitchen-app.com domain (6 users with known PINs)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES

  -- Users synced from DEV (6 users from resto.local + internal.local)
  -- Email users with strong passwords
  (
    '9e862091-f9a8-4f77-a75e-a9adfea245aa'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin@resto.local',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Admin User", "roles": ["admin", "manager"], "email_verified": true}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    'f83e10cc-6786-40ca-9dfe-d95908b1d5b0'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manager@resto.local',
    crypt('Manager123!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Manager User", "roles": ["manager"], "email_verified": true}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '157f66de-6e6b-4ae3-a774-7ab11c19942d'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'pin-kitchen-kitchen-staff@internal.local',
    crypt('kitckitchen123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Kitchen Staff", "roles": ["kitchen"], "is_pin_user": true, "email_verified": true}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '345bd6f1-dd96-4ee1-af0f-10705c69bcf2'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'pin-cashier-cashier-1@internal.local',
    crypt('cashcashier123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Cashier 1", "roles": ["cashier"], "is_pin_user": true, "email_verified": true}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '68689509-901a-49a7-b8d1-c9a7445e5953'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'pin-cashier-cashier-2@internal.local',
    crypt('cashcashier123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Cashier 2", "roles": ["cashier"], "is_pin_user": true, "email_verified": true}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    'b02cac4c-4732-4d3e-8542-7aaf362d421e'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'pin-bar-bartender@internal.local',
    crypt('bartbar123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Bartender", "roles": ["bar"], "is_pin_user": true, "email_verified": true}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- Verify all auth.users created
SELECT
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'is_pin_user' as is_pin_user,
  created_at
FROM auth.users
ORDER BY created_at;

-- Show total count
SELECT
  COUNT(*) as total_auth_users,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'is_pin_user' = 'true') as pin_users,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'is_pin_user' IS NULL) as email_only_users
FROM auth.users;
