-- Seed one warehouse for PRODUCTION database
-- Run via Supabase SQL Editor

-- Insert main warehouse
INSERT INTO public.warehouses (id, name, code, is_active)
VALUES
  (
    'warehouse-main',
    'Main Warehouse',
    'MAIN',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify
SELECT id, name, code, is_active, created_at
FROM public.warehouses
ORDER BY created_at;
