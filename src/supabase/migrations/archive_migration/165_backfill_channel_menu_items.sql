-- Migration: 165_backfill_channel_menu_items
-- Description: Backfill channel_menu_items for all active menu_items x active sales_channels
-- Date: 2026-03-06
-- CRITICAL: Must apply BEFORE deploying ?? false default change, otherwise items disappear from POS

-- Insert all active menu_items x active sales_channels with is_available = true
INSERT INTO channel_menu_items (channel_id, menu_item_id, is_available)
SELECT sc.id, mi.id, true
FROM sales_channels sc
CROSS JOIN menu_items mi
WHERE sc.is_active = true
  AND mi.is_active = true
ON CONFLICT (channel_id, menu_item_id) DO NOTHING;

-- Verify
SELECT count(*) AS backfilled_count FROM channel_menu_items;
