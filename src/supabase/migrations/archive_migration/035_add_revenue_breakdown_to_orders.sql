-- Migration: 035_add_revenue_breakdown_to_orders
-- Description: Add revenue breakdown columns to orders table for discount tracking
-- Date: 2024-12-03
-- Phase: Sprint 7.1, Task 2
-- Context: Enable three-view revenue tracking (planned, actual, total collected)

-- ============================================================================
-- ALTER TABLE: orders
-- ============================================================================

-- Add revenue tracking columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS planned_revenue NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS actual_revenue NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS total_collected NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS revenue_breakdown JSONB;

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure all revenue amounts are non-negative
ALTER TABLE orders
  ADD CONSTRAINT check_planned_revenue_positive
  CHECK (planned_revenue IS NULL OR planned_revenue >= 0);

ALTER TABLE orders
  ADD CONSTRAINT check_actual_revenue_positive
  CHECK (actual_revenue IS NULL OR actual_revenue >= 0);

ALTER TABLE orders
  ADD CONSTRAINT check_total_collected_positive
  CHECK (total_collected IS NULL OR total_collected >= 0);

-- Ensure actual_revenue <= planned_revenue (discounts can only reduce, not increase)
ALTER TABLE orders
  ADD CONSTRAINT check_actual_not_exceed_planned
  CHECK (
    planned_revenue IS NULL
    OR actual_revenue IS NULL
    OR actual_revenue <= planned_revenue
  );

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying by planned_revenue (analytics)
CREATE INDEX IF NOT EXISTS idx_orders_planned_revenue
  ON orders(planned_revenue)
  WHERE planned_revenue IS NOT NULL;

-- Index for querying by actual_revenue (analytics)
CREATE INDEX IF NOT EXISTS idx_orders_actual_revenue
  ON orders(actual_revenue)
  WHERE actual_revenue IS NOT NULL;

-- Index for querying by total_collected (analytics)
CREATE INDEX IF NOT EXISTS idx_orders_total_collected
  ON orders(total_collected)
  WHERE total_collected IS NOT NULL;

-- Composite index for revenue analytics queries (date + revenue)
CREATE INDEX IF NOT EXISTS idx_orders_date_revenue
  ON orders(created_at, actual_revenue, total_collected)
  WHERE actual_revenue IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN orders.planned_revenue IS 'Planned revenue: Original prices before discounts (IDR)';
COMMENT ON COLUMN orders.actual_revenue IS 'Actual revenue: After discounts, before tax (IDR)';
COMMENT ON COLUMN orders.total_collected IS 'Total collected: With taxes included, final amount (IDR)';
COMMENT ON COLUMN orders.revenue_breakdown IS 'Revenue breakdown JSONB: { plannedRevenue, itemDiscounts, billDiscounts, totalDiscounts, actualRevenue, taxes: [{ taxId, name, percentage, amount }], totalTaxes, totalCollected }';

-- ============================================================================
-- DATA MIGRATION (OPTIONAL - for existing orders)
-- ============================================================================

-- Populate planned_revenue and actual_revenue for existing orders
-- This is optional and can be run separately if needed
-- Assumes existing orders have no discounts, so planned = actual

COMMENT ON TABLE orders IS 'Updated with revenue breakdown columns for discount tracking. Run data migration separately if needed for existing orders.';

-- Example data migration (commented out - run manually if needed):
/*
UPDATE orders
SET
  planned_revenue = final_amount,
  actual_revenue = final_amount,
  total_collected = final_amount,
  revenue_breakdown = jsonb_build_object(
    'plannedRevenue', final_amount,
    'itemDiscounts', 0,
    'billDiscounts', 0,
    'totalDiscounts', 0,
    'actualRevenue', final_amount,
    'taxes', '[]'::jsonb,
    'totalTaxes', 0,
    'totalCollected', final_amount
  )
WHERE
  planned_revenue IS NULL
  AND status IN ('completed', 'paid');
*/

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Check that columns were added
DO $$
BEGIN
  -- Check planned_revenue column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'planned_revenue'
  ) THEN
    RAISE EXCEPTION 'Column planned_revenue was not added to orders table';
  END IF;

  -- Check actual_revenue column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'actual_revenue'
  ) THEN
    RAISE EXCEPTION 'Column actual_revenue was not added to orders table';
  END IF;

  -- Check total_collected column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_collected'
  ) THEN
    RAISE EXCEPTION 'Column total_collected was not added to orders table';
  END IF;

  -- Check revenue_breakdown column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'revenue_breakdown'
  ) THEN
    RAISE EXCEPTION 'Column revenue_breakdown was not added to orders table';
  END IF;

  RAISE NOTICE '✅ Migration 035: Revenue breakdown columns added to orders table successfully';
END $$;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration, run:
/*
ALTER TABLE orders
  DROP COLUMN IF EXISTS planned_revenue,
  DROP COLUMN IF EXISTS actual_revenue,
  DROP COLUMN IF EXISTS total_collected,
  DROP COLUMN IF EXISTS revenue_breakdown;

DROP INDEX IF EXISTS idx_orders_planned_revenue;
DROP INDEX IF EXISTS idx_orders_actual_revenue;
DROP INDEX IF EXISTS idx_orders_total_collected;
DROP INDEX IF EXISTS idx_orders_date_revenue;
*/
