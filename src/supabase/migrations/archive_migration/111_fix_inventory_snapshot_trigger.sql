-- Migration: 111_fix_inventory_snapshot_trigger
-- Description: Fix trigger to use 'completed' status and include preparations
-- Date: 2026-01-31
-- Issue: Trigger was waiting for 'closed' but code sets 'completed'
--        Also preparations (semi-finished goods) were not being snapshotted

-- ============================================
-- PROBLEM:
-- 1. Trigger checked for status = 'closed', but app sets 'completed'
-- 2. Only products were snapshotted, not preparations
-- ============================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trg_create_snapshot_on_shift_close ON shifts;

-- Recreate function with correct status and preparations support
CREATE OR REPLACE FUNCTION create_inventory_snapshot_on_shift_close()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger when shift status changes to 'completed' (not 'closed')
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN

    -- 1. Snapshot PRODUCTS
    INSERT INTO inventory_snapshots (
      snapshot_date, item_id, item_type, department, unit, quantity, total_cost, average_cost, source
    )
    SELECT
      COALESCE(NEW.end_time, NOW())::DATE as snapshot_date,
      sb.item_id,
      'product' as item_type,
      p.used_in_departments[1] as department,
      p.base_unit as unit,
      SUM(sb.current_quantity) as quantity,
      SUM(sb.current_quantity * sb.cost_per_unit) as total_cost,
      CASE WHEN SUM(sb.current_quantity) > 0
           THEN SUM(sb.current_quantity * sb.cost_per_unit) / SUM(sb.current_quantity)
           ELSE 0 END as average_cost,
      'shift_close' as source
    FROM storage_batches sb
    LEFT JOIN products p ON p.id::TEXT = sb.item_id
    WHERE sb.status = 'active'
      AND sb.item_type = 'product'
      AND sb.current_quantity != 0
    GROUP BY sb.item_id, p.used_in_departments[1], p.base_unit
    ON CONFLICT (snapshot_date, item_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      total_cost = EXCLUDED.total_cost,
      average_cost = EXCLUDED.average_cost,
      source = EXCLUDED.source,
      updated_at = NOW();

    -- 2. Snapshot PREPARATIONS (semi-finished goods)
    INSERT INTO inventory_snapshots (
      snapshot_date, item_id, item_type, department, unit, quantity, total_cost, average_cost, source
    )
    SELECT
      COALESCE(NEW.end_time, NOW())::DATE as snapshot_date,
      pb.preparation_id as item_id,
      'preparation' as item_type,
      pr.department as department,
      pr.output_unit as unit,
      SUM(pb.current_quantity) as quantity,
      SUM(pb.current_quantity * pb.cost_per_unit) as total_cost,
      CASE WHEN SUM(pb.current_quantity) > 0
           THEN SUM(pb.current_quantity * pb.cost_per_unit) / SUM(pb.current_quantity)
           ELSE 0 END as average_cost,
      'shift_close' as source
    FROM preparation_batches pb
    LEFT JOIN preparations pr ON pr.id = pb.preparation_id
    WHERE pb.status = 'active'
      AND pb.current_quantity > 0
    GROUP BY pb.preparation_id, pr.department, pr.output_unit
    ON CONFLICT (snapshot_date, item_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      total_cost = EXCLUDED.total_cost,
      average_cost = EXCLUDED.average_cost,
      source = EXCLUDED.source,
      updated_at = NOW();

    RAISE NOTICE 'Inventory snapshot created for date % (shift %)',
      COALESCE(NEW.end_time, NOW())::DATE, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER trg_create_snapshot_on_shift_close
AFTER UPDATE ON shifts FOR EACH ROW
EXECUTE FUNCTION create_inventory_snapshot_on_shift_close();

-- Add comment
COMMENT ON FUNCTION create_inventory_snapshot_on_shift_close() IS
  'Creates inventory snapshots for products and preparations when shift status changes to completed';

NOTIFY pgrst, 'reload schema';
