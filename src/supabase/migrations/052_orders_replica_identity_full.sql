-- Migration: 052_orders_replica_identity_full
-- Description: Enable full replica identity for orders table to support Supabase Realtime old values
-- Date: 2025-12-12
-- Context: OrderAlertService needs payload.old to contain full row data (not just PK)
--          to properly detect status changes and prevent duplicate sound alerts

-- Enable full replica identity for orders table
-- This allows Supabase Realtime to return old values (payload.old) on UPDATE events
-- Required for proper status change detection in OrderAlertService
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Verify the change
-- SELECT relname, relreplident FROM pg_class WHERE relname = 'orders';
-- Expected: relreplident = 'f' (full)
