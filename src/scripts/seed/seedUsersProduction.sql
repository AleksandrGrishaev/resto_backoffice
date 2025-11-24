-- Seed users for PRODUCTION database
-- Run via: psql or Supabase SQL Editor
-- Or use: pnpm seed:users:prod (uses this SQL via Supabase client)

-- Insert seed users with hashed PINs
INSERT INTO public.users (id, name, email, phone, pin_hash, roles, is_active, avatar_url, preferences)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Admin User',
    'admin@kitchen-app.com',
    '+62812345678',
    crypt('1111', gen_salt('bf')),
    ARRAY['admin']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'Manager User',
    'manager@kitchen-app.com',
    '+62812345679',
    crypt('2222', gen_salt('bf')),
    ARRAY['manager']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'Cashier User',
    'cashier@kitchen-app.com',
    '+62812345680',
    crypt('3333', gen_salt('bf')),
    ARRAY['cashier']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Cashier',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000004'::uuid,
    'Kitchen User',
    'kitchen@kitchen-app.com',
    '+62812345681',
    crypt('4444', gen_salt('bf')),
    ARRAY['kitchen']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Kitchen',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000005'::uuid,
    'Bar User',
    'bar@kitchen-app.com',
    '+62812345682',
    crypt('5555', gen_salt('bf')),
    ARRAY['bar']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bar',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000006'::uuid,
    'Multi-Role User',
    'multi@kitchen-app.com',
    '+62812345683',
    crypt('9999', gen_salt('bf')),
    ARRAY['manager', 'cashier']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Multi',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  roles = EXCLUDED.roles,
  avatar_url = EXCLUDED.avatar_url,
  preferences = EXCLUDED.preferences,
  updated_at = NOW();

-- Verify
SELECT id, name, email, roles, is_active
FROM public.users
WHERE email LIKE '%kitchen-app.com%'
ORDER BY name;
