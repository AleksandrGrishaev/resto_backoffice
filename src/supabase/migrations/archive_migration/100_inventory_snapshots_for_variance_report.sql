-- Migration: 100_inventory_snapshots_for_variance_report
-- Description: Create inventory_snapshots table and update variance report RPC
--              to use historical Opening stock from snapshots instead of current batches
-- Date: 2026-01-27
-- Context: Fix "Opening = —" issue in Product Variance Report

-- ============================================
-- PART 1: Create inventory_snapshots table
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'product',
  department TEXT,

  -- Quantity and cost
  quantity NUMERIC NOT NULL,
  unit TEXT,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  average_cost NUMERIC NOT NULL DEFAULT 0,

  -- Data source tracking
  source TEXT NOT NULL, -- 'inventory', 'calculated', 'shift_close', 'manual'
  source_document_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one snapshot per item per day
  UNIQUE(snapshot_date, item_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_date ON inventory_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_item ON inventory_snapshots(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_date_item ON inventory_snapshots(snapshot_date, item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_department ON inventory_snapshots(department);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_source ON inventory_snapshots(source);

-- Enable RLS
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated read on inventory_snapshots"
  ON inventory_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on inventory_snapshots"
  ON inventory_snapshots FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on inventory_snapshots"
  ON inventory_snapshots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE inventory_snapshots IS 'Daily inventory snapshots for variance reporting';
COMMENT ON COLUMN inventory_snapshots.source IS 'Data source: inventory (from count), calculated (from movements), shift_close (auto), manual';

-- ============================================
-- PART 2: Backfill from inventory documents
-- ============================================

-- Insert snapshots from confirmed inventory documents
INSERT INTO inventory_snapshots (
  snapshot_date, item_id, item_type, department, quantity, unit, total_cost, average_cost, source, source_document_id
)
SELECT DISTINCT ON (snapshot_date, item_id)
  snapshot_date, item_id, 'product', department, quantity, unit, total_cost, average_cost, 'inventory', document_id
FROM (
  SELECT
    inv.created_at::date as snapshot_date,
    item->>'itemId' as item_id,
    inv.department,
    (item->>'actualQuantity')::numeric as quantity,
    item->>'unit' as unit,
    COALESCE((item->>'actualQuantity')::numeric * (item->>'averageCost')::numeric, 0) as total_cost,
    COALESCE((item->>'averageCost')::numeric, 0) as average_cost,
    inv.id::text as document_id,
    inv.created_at
  FROM inventory_documents inv,
       jsonb_array_elements(inv.items) as item
  WHERE inv.status = 'confirmed'
    AND item->>'itemId' IS NOT NULL
    AND (item->>'actualQuantity')::numeric IS NOT NULL
) sub
ORDER BY snapshot_date, item_id, created_at DESC
ON CONFLICT (snapshot_date, item_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  total_cost = EXCLUDED.total_cost,
  average_cost = EXCLUDED.average_cost,
  source = EXCLUDED.source,
  source_document_id = EXCLUDED.source_document_id,
  updated_at = NOW();

-- ============================================
-- PART 3: Calculate intermediate days
-- ============================================

-- This DO block calculates snapshots for days between inventories
DO $$
DECLARE
  calc_date DATE;
  prev_date DATE;
BEGIN
  -- Start from 2026-01-02 (first day after all initial inventories)
  calc_date := '2026-01-02';

  WHILE calc_date <= CURRENT_DATE LOOP
    prev_date := calc_date - 1;

    -- Skip dates that already have inventory snapshots
    IF NOT EXISTS (
      SELECT 1 FROM inventory_snapshots
      WHERE snapshot_date = calc_date AND source = 'inventory'
      LIMIT 1
    ) THEN

      -- Insert calculated snapshot based on prev_date + daily movements
      INSERT INTO inventory_snapshots (
        snapshot_date, item_id, item_type, department, unit, quantity, total_cost, average_cost, source
      )
      SELECT
        calc_date,
        prev.item_id,
        prev.item_type,
        prev.department,
        prev.unit,
        prev.quantity + COALESCE(receipts.qty, 0) - COALESCE(writeoffs.qty, 0) as quantity,
        (prev.quantity + COALESCE(receipts.qty, 0) - COALESCE(writeoffs.qty, 0)) * prev.average_cost as total_cost,
        prev.average_cost,
        'calculated'
      FROM inventory_snapshots prev
      LEFT JOIN (
        SELECT sri.item_id, SUM(sri.received_quantity) as qty
        FROM supplierstore_receipts sr
        JOIN supplierstore_receipt_items sri ON sri.receipt_id = sr.id
        WHERE sr.status = 'completed' AND sr.delivery_date::date = calc_date
        GROUP BY sri.item_id
      ) receipts ON receipts.item_id = prev.item_id
      LEFT JOIN (
        SELECT item->>'itemId' as item_id, SUM((item->>'quantity')::numeric) as qty
        FROM storage_operations so, jsonb_array_elements(so.items) as item
        WHERE so.status = 'confirmed' AND so.operation_type = 'write_off' AND so.operation_date::date = calc_date
        GROUP BY item->>'itemId'
      ) writeoffs ON writeoffs.item_id = prev.item_id
      WHERE prev.snapshot_date = prev_date
      ON CONFLICT (snapshot_date, item_id)
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        total_cost = EXCLUDED.total_cost,
        updated_at = NOW();

    END IF;

    calc_date := calc_date + 1;
  END LOOP;
END $$;

-- ============================================
-- PART 4: Auto-snapshot trigger on shift close
-- ============================================

CREATE OR REPLACE FUNCTION create_inventory_snapshot_on_shift_close()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'closed' AND NEW.status = 'closed' THEN
    INSERT INTO inventory_snapshots (
      snapshot_date, item_id, item_type, department, unit, quantity, total_cost, average_cost, source
    )
    SELECT
      NEW.closed_at::DATE,
      sb.item_id,
      sb.item_type,
      p.used_in_departments[1],
      p.base_unit,
      SUM(sb.current_quantity),
      SUM(sb.current_quantity * sb.cost_per_unit),
      CASE WHEN SUM(sb.current_quantity) > 0
           THEN SUM(sb.current_quantity * sb.cost_per_unit) / SUM(sb.current_quantity)
           ELSE 0 END,
      'shift_close'
    FROM storage_batches sb
    LEFT JOIN products p ON p.id::TEXT = sb.item_id
    WHERE sb.status = 'active' AND sb.item_type = 'product' AND sb.current_quantity != 0
    GROUP BY sb.item_id, sb.item_type, p.used_in_departments[1], p.base_unit
    ON CONFLICT (snapshot_date, item_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      total_cost = EXCLUDED.total_cost,
      average_cost = EXCLUDED.average_cost,
      source = EXCLUDED.source,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_snapshot_on_shift_close ON shifts;
CREATE TRIGGER trg_create_snapshot_on_shift_close
AFTER UPDATE ON shifts FOR EACH ROW
EXECUTE FUNCTION create_inventory_snapshot_on_shift_close();

-- ============================================
-- PART 5: Update Variance Report V3 RPC
-- ============================================

-- See 097_product_variance_report_v3_rpc.sql for the full updated function
-- Key changes:
-- 1. Opening stock now comes from inventory_snapshots table
-- 2. Added products_in_active_preps CTE for products frozen in preparation batches
-- 3. Variance formula: Opening + Received - Sales - Loss - (Stock + InPreps)

NOTIFY pgrst, 'reload schema';
