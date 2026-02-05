-- Migration: 138_gobiz_config
-- Description: Create GoBiz integration config table for storing credentials and tokens
-- Date: 2026-02-05

-- 1. GoBiz Integration Config
CREATE TABLE IF NOT EXISTS gobiz_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id TEXT NOT NULL,
  outlet_name TEXT,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  webhook_secret TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_gobiz_config_active ON gobiz_config(is_active) WHERE is_active = true;

-- 3. RLS - only admin can see/modify credentials
ALTER TABLE gobiz_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin read gobiz_config" ON gobiz_config
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin'));

CREATE POLICY "Allow admin manage gobiz_config" ON gobiz_config
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin'));

-- 4. Service role full access (for Edge Functions)
CREATE POLICY "Allow service_role full access gobiz_config" ON gobiz_config
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Updated_at trigger
CREATE TRIGGER update_gobiz_config_updated_at
  BEFORE UPDATE ON gobiz_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
