-- Migration: 047_add_preparation_schedule_fields
-- Description: Add fields for Kitchen Preparation feature - storage location, production slot, stock thresholds
-- Date: 2025-12-11
-- Sprint: Kitchen Preparation Sprint 1

-- CONTEXT:
-- Kitchen Preparation feature needs additional fields on preparations table to:
-- 1. Track where each preparation is stored (fridge, shelf, freezer)
-- 2. Define when production should happen (morning, afternoon, evening)
-- 3. Set minimum stock thresholds for alerts
-- 4. Set daily production targets for schedule generation

-- Create enum types for storage location and production slot
DO $$
BEGIN
    -- Storage location enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_location_type') THEN
        CREATE TYPE storage_location_type AS ENUM ('shelf', 'fridge', 'freezer');
    END IF;

    -- Production slot enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_slot_type') THEN
        CREATE TYPE production_slot_type AS ENUM ('morning', 'afternoon', 'evening', 'any');
    END IF;
END$$;

-- Add new fields to preparations table
ALTER TABLE preparations
    ADD COLUMN IF NOT EXISTS storage_location text DEFAULT 'fridge',
    ADD COLUMN IF NOT EXISTS production_slot text DEFAULT 'any',
    ADD COLUMN IF NOT EXISTS min_stock_threshold numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS daily_target_quantity numeric DEFAULT 0;

-- Add comments
COMMENT ON COLUMN preparations.storage_location IS 'Storage location for this preparation: shelf, fridge, or freezer';
COMMENT ON COLUMN preparations.production_slot IS 'Preferred production time slot: morning (6-12), afternoon (12-18), evening (18-22), or any';
COMMENT ON COLUMN preparations.min_stock_threshold IS 'Minimum stock level (in output_unit) before schedule alert is triggered';
COMMENT ON COLUMN preparations.daily_target_quantity IS 'Target daily production quantity (in output_unit) for schedule recommendations';

-- Add check constraints
ALTER TABLE preparations
    DROP CONSTRAINT IF EXISTS preparations_storage_location_check,
    ADD CONSTRAINT preparations_storage_location_check
        CHECK (storage_location IN ('shelf', 'fridge', 'freezer'));

ALTER TABLE preparations
    DROP CONSTRAINT IF EXISTS preparations_production_slot_check,
    ADD CONSTRAINT preparations_production_slot_check
        CHECK (production_slot IN ('morning', 'afternoon', 'evening', 'any'));

ALTER TABLE preparations
    DROP CONSTRAINT IF EXISTS preparations_min_stock_threshold_check,
    ADD CONSTRAINT preparations_min_stock_threshold_check
        CHECK (min_stock_threshold >= 0);

ALTER TABLE preparations
    DROP CONSTRAINT IF EXISTS preparations_daily_target_quantity_check,
    ADD CONSTRAINT preparations_daily_target_quantity_check
        CHECK (daily_target_quantity >= 0);

-- Create index for filtering by storage location
CREATE INDEX IF NOT EXISTS idx_preparations_storage_location
    ON preparations(storage_location)
    WHERE is_active = true;

-- Create index for filtering by department + storage location (for Kitchen Preparation screen)
CREATE INDEX IF NOT EXISTS idx_preparations_department_storage
    ON preparations(department, storage_location)
    WHERE is_active = true;

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
    column_count integer;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'preparations'
    AND column_name IN ('storage_location', 'production_slot', 'min_stock_threshold', 'daily_target_quantity');

    IF column_count < 4 THEN
        RAISE EXCEPTION 'Migration failed: Not all columns were created. Found % of 4 expected columns', column_count;
    END IF;

    RAISE NOTICE 'Migration 047 completed successfully. Added % columns to preparations table.', column_count;
END$$;
