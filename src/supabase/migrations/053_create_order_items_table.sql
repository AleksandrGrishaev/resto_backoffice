-- Migration: 053_create_order_items_table
-- Description: Create separate order_items table for Realtime subscriptions
-- Date: 2025-12-12
-- Context: Kitchen Monitor sound notifications need direct subscription on items
--          to properly filter by department and detect item status changes
--          (instead of subscribing to orders table with JSONB items)

-- =====================================================
-- Purpose:
-- 1. Realtime subscription directly on items (not JSONB)
-- 2. Proper department filtering for kitchen/bar alerts
-- 3. KPI timestamps for analytics (wait time, cooking time)
-- 4. Better performance with indexes
-- =====================================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Bill reference (for grouping and kitchen display)
  bill_id UUID NOT NULL,
  bill_number TEXT,  -- Denormalized for kitchen display

  -- Menu item
  menu_item_id UUID NOT NULL,
  menu_item_name TEXT NOT NULL,
  variant_id TEXT,
  variant_name TEXT,

  -- Pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  modifiers_total NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL,

  -- Modifiers & discounts (JSONB - rarely changes)
  selected_modifiers JSONB DEFAULT '[]',
  discounts JSONB DEFAULT '[]',

  -- STATUS & DEPARTMENT (key fields for Realtime!)
  status TEXT NOT NULL DEFAULT 'draft',
  -- Statuses: 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled'
  department TEXT DEFAULT 'kitchen',
  -- Departments: 'kitchen' | 'bar'

  -- Payment
  payment_status TEXT DEFAULT 'unpaid',
  paid_by_payment_ids TEXT[] DEFAULT '{}',

  -- Kitchen
  kitchen_notes TEXT,

  -- KPI TIMESTAMPS (for analytics)
  draft_at TIMESTAMPTZ DEFAULT now(),
  sent_to_kitchen_at TIMESTAMPTZ,
  cooking_started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_bill_id ON order_items(bill_id);
CREATE INDEX idx_order_items_status ON order_items(status);
CREATE INDEX idx_order_items_department ON order_items(department);
CREATE INDEX idx_order_items_status_dept ON order_items(status, department);

-- RLS (Row Level Security)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON order_items FOR ALL USING (true);

-- Replica Identity for Realtime (CRITICAL!)
-- This allows Supabase Realtime to return old values (payload.old) on UPDATE events
-- Required for proper status change detection in OrderAlertService
ALTER TABLE order_items REPLICA IDENTITY FULL;

-- =====================================================
-- KPI Metrics (calculated from timestamps):
--
-- wait_time = cooking_started_at - sent_to_kitchen_at
-- cooking_time = ready_at - cooking_started_at
-- kitchen_total = ready_at - sent_to_kitchen_at
-- order_total = served_at - draft_at
-- =====================================================
