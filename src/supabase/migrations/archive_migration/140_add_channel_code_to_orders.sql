-- Migration: 140_add_channel_code_to_orders
-- Description: Add channel_code column to orders table for persisting the channel code
-- Date: 2026-02-05

-- Previously only channel_id was persisted; channel_code was lost on reload.
-- This column stores the human-readable code (dine_in, takeaway, gobiz, grab)
-- alongside the UUID channel_id for quick lookups without joins.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel_code TEXT;
