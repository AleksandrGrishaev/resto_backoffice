-- Migration: 142_grant_permissions_taxes_and_channels
-- Description: Grant table-level permissions for taxes and channel tables
-- Date: 2026-02-05
-- Context: RLS policies require GRANT permissions to work. All channel-related
--          tables were missing GRANTs for authenticated/anon roles.

-- taxes table
GRANT SELECT, INSERT, UPDATE, DELETE ON taxes TO authenticated;
GRANT SELECT ON taxes TO anon;

-- channel_taxes table
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_taxes TO authenticated;
GRANT SELECT ON channel_taxes TO anon;

-- sales_channels table (was missing GRANTs)
GRANT SELECT, INSERT, UPDATE, DELETE ON sales_channels TO authenticated;
GRANT SELECT ON sales_channels TO anon;

-- channel_prices table (was missing GRANTs)
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_prices TO authenticated;
GRANT SELECT ON channel_prices TO anon;

-- channel_menu_items table (was missing GRANTs)
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_menu_items TO authenticated;
GRANT SELECT ON channel_menu_items TO anon;
