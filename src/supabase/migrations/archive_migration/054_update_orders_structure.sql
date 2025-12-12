-- Migration: 054_update_orders_structure
-- Description: Update orders table - add bills JSONB, remove items JSONB
-- Date: 2025-12-12
-- Context: Items are now stored in separate order_items table (migration 053)
--          Bills metadata (without items) is stored in orders.bills JSONB

-- =====================================================
-- Structure change:
--
-- BEFORE:
--   orders.items = FlattenedItem[] (items with embedded bill metadata)
--
-- AFTER:
--   orders.bills = PosBill[] (bills without items, metadata only)
--   order_items table = items with order_id, bill_id references
-- =====================================================

-- Add bills JSONB column (PosBill[] without items)
-- Contains: id, billNumber, name, status, subtotal, discountAmount, taxAmount, total, etc.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bills JSONB DEFAULT '[]';

-- Remove items JSONB column (now in order_items table)
ALTER TABLE orders DROP COLUMN IF EXISTS items;

-- =====================================================
-- NOTE: This migration requires code changes in:
--
-- 1. supabaseMappers.ts
--    - Remove flattenBillsToItems(), reconstructBillsFromItems()
--    - Add toOrderItemInsert(), fromOrderItemRow()
--    - Modify toSupabaseInsert/Update to use bills JSONB
--
-- 2. services.ts
--    - getAllOrders(): 2 queries (orders + order_items)
--    - createOrder(): INSERT order + INSERT order_items[]
--    - addItemToBill(): INSERT order_items
--    - updateItemQuantity(): UPDATE order_items
--    - removeItemFromBill(): DELETE order_items
--    - sendOrderToKitchen(): UPDATE order_items SET status='waiting'
--
-- 3. Realtime subscriptions
--    - useOrdersRealtime.ts: add order_items subscription
--    - useKitchenRealtime.ts: subscribe to order_items
--    - OrderAlertService.ts: subscribe to order_items
--
-- 4. Kitchen operations
--    - kitchenService.ts: direct UPDATE order_items
-- =====================================================
