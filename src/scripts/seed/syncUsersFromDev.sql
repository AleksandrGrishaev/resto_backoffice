-- Sync users from DEV to PRODUCTION
-- This adds the same users that exist in DEV database
-- Run in Supabase SQL Editor (Production)

-- Insert users from DEV (with already hashed PINs)
INSERT INTO "public"."users"
  ("id", "name", "email", "phone", "pin_hash", "roles", "is_active", "last_login_at", "avatar_url", "preferences", "created_at", "updated_at")
VALUES
  (
    '157f66de-6e6b-4ae3-a774-7ab11c19942d',
    'Kitchen Staff',
    'pin-kitchen-kitchen-staff@internal.local',
    null,
    '$2a$06$q2kOZNcUCIGr1fzYaM13K.1FtvRaRccNx9/0A1RsQHAnUIkgMGqSC',
    '{"kitchen"}',
    true,
    null,
    null,
    '{}',
    '2025-11-23 05:47:08.448106+00',
    NOW()
  ),
  (
    '345bd6f1-dd96-4ee1-af0f-10705c69bcf2',
    'Cashier 1',
    'pin-cashier-cashier-1@internal.local',
    null,
    '$2a$06$IZH7x4eQxpWgpx5oK8eq5OT.5HEpsZzi.dPtgTLfur6PEtWmsCZ.i',
    '{"cashier"}',
    true,
    null,
    null,
    '{}',
    '2025-11-23 05:47:08.448106+00',
    NOW()
  ),
  (
    '68689509-901a-49a7-b8d1-c9a7445e5953',
    'Cashier 2',
    'pin-cashier-cashier-2@internal.local',
    null,
    '$2a$06$0VtYZwdgVCBQg5k38xEFz.ah5y7HKcOZlrgJeDUEIKoXf1DZZlABa',
    '{"cashier"}',
    true,
    null,
    null,
    '{}',
    '2025-11-23 05:47:08.448106+00',
    NOW()
  ),
  (
    '9e862091-f9a8-4f77-a75e-a9adfea245aa',
    'Admin User',
    'admin@resto.local',
    null,
    null,
    '{"admin","manager"}',
    true,
    null,
    null,
    '{}',
    '2025-11-23 05:27:46.482381+00',
    NOW()
  ),
  (
    'b02cac4c-4732-4d3e-8542-7aaf362d421e',
    'Bartender',
    'pin-bar-bartender@internal.local',
    null,
    '$2a$06$QDEnsFL5jHhS3Po4KQvM/e2tjiF6ZI72NyZrXH61uShkl/8qUhg8K',
    '{"bar"}',
    true,
    null,
    null,
    '{}',
    '2025-11-23 05:47:08.448106+00',
    NOW()
  ),
  (
    'f83e10cc-6786-40ca-9dfe-d95908b1d5b0',
    'Manager User',
    'manager@resto.local',
    null,
    null,
    '{"manager"}',
    true,
    null,
    null,
    '{}',
    '2025-11-23 05:27:46.883024+00',
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  pin_hash = EXCLUDED.pin_hash,
  roles = EXCLUDED.roles,
  is_active = EXCLUDED.is_active,
  avatar_url = EXCLUDED.avatar_url,
  preferences = EXCLUDED.preferences,
  updated_at = NOW();

-- Verify all users
SELECT id, name, email, roles, is_active,
  CASE WHEN pin_hash IS NOT NULL THEN '✅ PIN set' ELSE '❌ No PIN' END as pin_status
FROM public.users
ORDER BY created_at;

-- Show total count
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE pin_hash IS NOT NULL) as users_with_pin,
  COUNT(*) FILTER (WHERE pin_hash IS NULL) as users_without_pin
FROM public.users;
