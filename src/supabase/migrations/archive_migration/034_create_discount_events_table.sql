-- Migration: 034_create_discount_events_table
-- Description: Create discount_events table for tracking all discount applications
-- Date: 2024-12-03
-- Phase: Sprint 7.1, Task 2
-- Context: Centralized discount tracking system with full audit trail and proportional allocation
--
-- IMPORTANT: This is the CORRECTED version of the migration
-- Original migration had issues with applied_by NOT NULL and RLS policy
-- Historical fixes applied in migrations 098-102 (now in deprecated/ folder)
-- This version includes all corrections for future deployments
--
-- FIX (2024-12-04): Changed users.role to users.roles (ARRAY column) in RLS policies

-- ============================================================================
-- TABLE: discount_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS discount_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Discount Type and Value
  type TEXT NOT NULL CHECK (type IN ('item', 'bill')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  value NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
  reason TEXT NOT NULL CHECK (reason IN (
    'customer_complaint',
    'service_issue',
    'food_quality',
    'promotion',
    'loyalty',
    'staff_error',
    'compensation',
    'manager_decision',
    'other'
  )),

  -- Links to Other Entities
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  bill_id UUID, -- No FK constraint - bills table may not exist yet
  item_id UUID, -- No FK constraint - order_items table may not exist yet
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,

  -- Calculated Amounts (in IDR)
  original_amount NUMERIC(12, 2) NOT NULL CHECK (original_amount >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL CHECK (discount_amount >= 0),
  final_amount NUMERIC(12, 2) NOT NULL CHECK (final_amount >= 0),

  -- Bill Discount Allocation Details (JSONB for flexibility)
  -- Structure: { totalBillAmount, itemAllocations: [{ itemId, itemName, itemAmount, proportion, allocatedDiscount }] }
  allocation_details JSONB,

  -- Metadata and Audit Trail
  applied_by UUID REFERENCES users(id) ON DELETE RESTRICT, -- Nullable for system-generated discounts
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,

  -- Standard Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure final_amount is correct (original_amount - discount_amount)
ALTER TABLE discount_events
  ADD CONSTRAINT check_final_amount_calculation
  CHECK (final_amount = (original_amount - discount_amount));

-- Item discounts must have item_id
ALTER TABLE discount_events
  ADD CONSTRAINT check_item_discount_has_item_id
  CHECK (type != 'item' OR item_id IS NOT NULL);

-- Bill discounts must have allocation_details
ALTER TABLE discount_events
  ADD CONSTRAINT check_bill_discount_has_allocation
  CHECK (type != 'bill' OR allocation_details IS NOT NULL);

-- Discount amount cannot exceed original amount
ALTER TABLE discount_events
  ADD CONSTRAINT check_discount_not_exceed_original
  CHECK (discount_amount <= original_amount);

-- Percentage discounts must be between 0 and 100
ALTER TABLE discount_events
  ADD CONSTRAINT check_percentage_range
  CHECK (discount_type != 'percentage' OR (value >= 0 AND value <= 100));

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying by order
CREATE INDEX idx_discount_events_order_id ON discount_events(order_id) WHERE deleted_at IS NULL;

-- Index for querying by shift (for shift reports)
CREATE INDEX idx_discount_events_shift_id ON discount_events(shift_id) WHERE deleted_at IS NULL;

-- Index for querying by applied_at (for date range queries)
CREATE INDEX idx_discount_events_applied_at ON discount_events(applied_at DESC) WHERE deleted_at IS NULL;

-- Index for querying by reason (for analytics)
CREATE INDEX idx_discount_events_reason ON discount_events(reason) WHERE deleted_at IS NULL;

-- Index for querying by type (item vs bill discounts)
CREATE INDEX idx_discount_events_type ON discount_events(type) WHERE deleted_at IS NULL;

-- Index for querying by applied_by (for user activity tracking)
CREATE INDEX idx_discount_events_applied_by ON discount_events(applied_by) WHERE deleted_at IS NULL;

-- Composite index for common queries (shift + date range)
CREATE INDEX idx_discount_events_shift_date ON discount_events(shift_id, applied_at DESC) WHERE deleted_at IS NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE discount_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own discount events
CREATE POLICY discount_events_view_own ON discount_events
  FOR SELECT
  USING (
    applied_by = auth.uid()
  );

-- Policy: Managers and admins can view all discount events
-- FIX: Changed users.role IN to 'admin' = ANY(users.roles) OR 'manager' = ANY(users.roles)
CREATE POLICY discount_events_view_all ON discount_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Policy: Authenticated users can create discount events
-- Uses auth.uid() IS NOT NULL for reliability in async/background contexts
-- Note: More robust than auth.role() = 'authenticated' which fails in background operations
CREATE POLICY discount_events_create ON discount_events
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Only managers and admins can update discount events (e.g., approve)
-- FIX: Changed users.role IN to 'admin' = ANY(users.roles) OR 'manager' = ANY(users.roles)
CREATE POLICY discount_events_update ON discount_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Policy: Only admins can delete (soft delete) discount events
-- FIX: Changed users.role = 'admin' to 'admin' = ANY(users.roles)
CREATE POLICY discount_events_delete ON discount_events
  FOR UPDATE
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at timestamp on row update
CREATE OR REPLACE FUNCTION update_discount_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discount_events_updated_at
  BEFORE UPDATE ON discount_events
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_events_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE discount_events IS 'Tracks all discount applications with full audit trail and proportional allocation for bill discounts';
COMMENT ON COLUMN discount_events.type IS 'Discount scope: item (single item) or bill (entire bill with proportional allocation)';
COMMENT ON COLUMN discount_events.discount_type IS 'Discount value type: percentage (0-100) or fixed (IDR amount)';
COMMENT ON COLUMN discount_events.value IS 'Discount value: percentage (0-100) or fixed amount in IDR';
COMMENT ON COLUMN discount_events.reason IS 'Reason for discount application (required for transparency)';
COMMENT ON COLUMN discount_events.allocation_details IS 'For bill discounts: JSONB with totalBillAmount and itemAllocations array showing proportional distribution';
COMMENT ON COLUMN discount_events.applied_by IS 'User who applied the discount (for accountability). NULL indicates system-generated discount during background processing.';
COMMENT ON COLUMN discount_events.approved_by IS 'User who approved the discount (for future approval workflow)';
COMMENT ON COLUMN discount_events.original_amount IS 'Original amount before discount in IDR';
COMMENT ON COLUMN discount_events.discount_amount IS 'Actual discount amount in IDR (calculated)';
COMMENT ON COLUMN discount_events.final_amount IS 'Final amount after discount in IDR (original - discount)';
COMMENT ON COLUMN discount_events.deleted_at IS 'Soft delete timestamp (discount cancelled)';

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Check that table was created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_events') THEN
    RAISE EXCEPTION 'Table discount_events was not created';
  END IF;

  RAISE NOTICE '✅ Migration 034: discount_events table created successfully';
END $$;
