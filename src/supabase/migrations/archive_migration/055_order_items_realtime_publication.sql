-- Migration: 055_order_items_realtime_publication
-- Description: Add order_items table to Supabase Realtime publication
-- Date: 2025-12-12
-- Context: Enable Realtime subscriptions on order_items for Kitchen Monitor alerts
--          This allows direct filtering by item status and department

-- =====================================================
-- ADD order_items TO REALTIME PUBLICATION
-- =====================================================
-- Supabase uses the 'supabase_realtime' publication for Realtime
-- We need to add order_items to this publication

-- Drop and recreate publication with both tables
-- (Supabase creates this publication automatically, we just need to add our table)

-- Check if table is already in publication (idempotent)
DO $$
BEGIN
  -- Try to add to existing publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    RAISE NOTICE 'Added order_items to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'order_items already in supabase_realtime publication';
  END IF;
END $$;

-- =====================================================
-- VERIFY REPLICA IDENTITY (should be set in 053)
-- =====================================================
-- Ensure REPLICA IDENTITY FULL is set for old values in UPDATE events
DO $$
DECLARE
  current_identity TEXT;
BEGIN
  SELECT CASE relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END INTO current_identity
  FROM pg_class
  WHERE relname = 'order_items';

  IF current_identity != 'full' THEN
    ALTER TABLE order_items REPLICA IDENTITY FULL;
    RAISE NOTICE 'Set REPLICA IDENTITY FULL for order_items';
  ELSE
    RAISE NOTICE 'order_items already has REPLICA IDENTITY FULL';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES (run manually to check)
-- =====================================================
-- Check publication tables:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check replica identity:
-- SELECT relname, relreplident FROM pg_class WHERE relname = 'order_items';
-- Expected: relreplident = 'f' (full)

-- Test Realtime subscription (in JS):
-- supabase.channel('test')
--   .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, console.log)
--   .subscribe()
