-- Migration: 218_protect_telegram_token
-- Description: Move telegram_bot_token from public 'auth' settings to staff-only 'auth_secrets'
-- Date: 2026-03-16
--
-- CONTEXT: website_settings.auth is readable by anon (web-winter needs google_enabled etc).
-- But telegram_bot_token grants full bot control — must not be publicly readable.
-- Solution: Split into auth (public) + auth_secrets (staff-only read).

-- 1. Create auth_secrets row with token (move from auth)
INSERT INTO website_settings (key, value)
SELECT 'auth_secrets', jsonb_build_object(
  'telegram_bot_token', value->'telegram_bot_token',
  'telegram_bot_username', value->'telegram_bot_username'
)
FROM website_settings
WHERE key = 'auth'
ON CONFLICT (key) DO NOTHING;

-- 2. Remove token from the public auth key
UPDATE website_settings
SET value = value - 'telegram_bot_token' - 'telegram_bot_username'
WHERE key = 'auth'
  AND value ? 'telegram_bot_token';

-- 3. RLS: auth_secrets readable only by staff
-- anon_read and auth_read policies use USING (true) — we need to exclude auth_secrets
-- Drop and recreate with exclusion

DROP POLICY IF EXISTS "website_settings_anon_read" ON website_settings;
CREATE POLICY "website_settings_anon_read" ON website_settings
  FOR SELECT TO anon
  USING (key != 'auth_secrets');

DROP POLICY IF EXISTS "website_settings_auth_read" ON website_settings;
CREATE POLICY "website_settings_auth_read" ON website_settings
  FOR SELECT TO authenticated
  USING (key != 'auth_secrets' OR is_staff());
