-- Migration: 027_add_sent_date_to_orders
-- Description: Add sent_date column to supplierstore_orders table
-- Date: 2026-01-02
-- Author: Claude Code
-- Related: 026_send_purchase_order_rpc.sql

-- CONTEXT:
-- The send_purchase_order_to_supplier RPC function (migration 026) expects
-- a sent_date column to track when an order was sent to the supplier.
-- This column was missing from the original table schema.

-- Add sent_date column
ALTER TABLE supplierstore_orders
ADD COLUMN IF NOT EXISTS sent_date TIMESTAMPTZ;

-- Add comment explaining the column
COMMENT ON COLUMN supplierstore_orders.sent_date IS 'Timestamp when order was sent to supplier (status changed to sent)';
