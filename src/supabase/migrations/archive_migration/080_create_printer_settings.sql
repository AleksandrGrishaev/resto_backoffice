-- Migration: 080_create_printer_settings
-- Description: Create table for storing printer/receipt settings
-- Date: 2024-12-27

-- Create printer_settings table
CREATE TABLE IF NOT EXISTS printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name TEXT NOT NULL DEFAULT 'Restaurant Name',
  restaurant_address TEXT,
  restaurant_phone TEXT,
  footer_message TEXT DEFAULT 'Thank you! Come again!',
  auto_print_cash_receipt BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings (only if table is empty)
INSERT INTO printer_settings (restaurant_name, footer_message)
SELECT 'My Restaurant', 'Thank you! Come again!'
WHERE NOT EXISTS (SELECT 1 FROM printer_settings);

-- Enable RLS
ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Allow all authenticated users to read settings
CREATE POLICY "Allow authenticated read" ON printer_settings
  FOR SELECT TO authenticated
  USING (true);

-- Allow admin/manager to update settings
CREATE POLICY "Allow admin update" ON printer_settings
  FOR UPDATE TO authenticated
  USING (true);

-- Allow admin/manager to insert (in case of fresh install)
CREATE POLICY "Allow admin insert" ON printer_settings
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE printer_settings IS 'Stores printer and receipt settings for POS system';
