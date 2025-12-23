-- Migration: 064_create_kpi_settings_table
-- Description: Create table for KPI settings including excluded write-off reasons and targets
-- Date: 2025-12-12
-- Context: Store configurable settings for Food Cost KPI calculations

-- Create KPI settings table
CREATE TABLE IF NOT EXISTS kpi_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  excluded_reasons JSONB NOT NULL DEFAULT '{
    "storage": ["education", "test"],
    "preparation": ["education", "test"]
  }'::jsonb,
  targets JSONB NOT NULL DEFAULT '{"kitchen": 30, "bar": 25}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO kpi_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE kpi_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read for authenticated"
ON kpi_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow update for authenticated"
ON kpi_settings FOR UPDATE
TO authenticated
USING (true);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_kpi_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS kpi_settings_updated_at ON kpi_settings;
CREATE TRIGGER kpi_settings_updated_at
  BEFORE UPDATE ON kpi_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_settings_timestamp();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
