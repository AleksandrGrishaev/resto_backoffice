-- Migration: 210_create_website_settings
-- Description: Create website_settings table for web-winter configuration
-- Date: 2026-03-14

-- Key-value table for website settings (one row per setting group)
CREATE TABLE IF NOT EXISTS public.website_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER website_settings_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Anon can read (web-winter reads as anon)
CREATE POLICY "website_settings_anon_read"
  ON public.website_settings FOR SELECT
  TO anon
  USING (true);

-- Authenticated users can read
CREATE POLICY "website_settings_auth_read"
  ON public.website_settings FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert/update
CREATE POLICY "website_settings_auth_write"
  ON public.website_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "website_settings_auth_update"
  ON public.website_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON public.website_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.website_settings TO authenticated;
GRANT ALL ON public.website_settings TO service_role;

-- Seed default values
INSERT INTO public.website_settings (key, value) VALUES
  ('general', '{
    "site_url": "https://menu.solarkitchen.com",
    "restaurant_name": "Solar Kitchen",
    "tagline": "Elevated Cuisine",
    "whatsapp_number": "+6281234567890",
    "address": "Jl. Raya Sanggingan No. 88, Ubud, Bali",
    "google_maps_url": ""
  }'::jsonb),
  ('hours', '{
    "mon_fri": { "open": "08:00", "close": "22:00" },
    "sat_sun": { "open": "09:00", "close": "23:00" },
    "closed_days": [],
    "special_note": ""
  }'::jsonb),
  ('social', '{
    "instagram": "https://instagram.com/solarkitchen",
    "facebook": "",
    "tiktok": "",
    "tripadvisor": ""
  }'::jsonb),
  ('auth', '{
    "google_enabled": true,
    "email_magic_link_enabled": true,
    "telegram_enabled": false,
    "telegram_bot_token": "",
    "telegram_bot_username": ""
  }'::jsonb),
  ('seo', '{
    "meta_description": "",
    "og_image_url": "",
    "favicon_url": ""
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
