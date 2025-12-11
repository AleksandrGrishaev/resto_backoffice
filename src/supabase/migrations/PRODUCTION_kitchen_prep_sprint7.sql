-- =============================================================================
-- PRODUCTION MIGRATION: Kitchen Preparation Feature (Sprint 7)
-- =============================================================================
-- Combines migrations 047, 048, 049 for Kitchen Preparation feature
-- Apply this script to PRODUCTION database via Supabase SQL Editor
-- Date: 2025-12-11
-- =============================================================================

-- =============================================================================
-- PART 1: Add fields to preparations table (047)
-- =============================================================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_preparations_storage_location
    ON preparations(storage_location)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_preparations_department_storage
    ON preparations(department, storage_location)
    WHERE is_active = true;

-- =============================================================================
-- PART 2: Create kitchen_bar_kpi table (048)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kitchen_bar_kpi (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL,
    staff_name text NOT NULL,
    department text NOT NULL DEFAULT 'kitchen',
    period_date date NOT NULL,
    productions_completed integer NOT NULL DEFAULT 0,
    production_quantity_total numeric NOT NULL DEFAULT 0,
    production_value_total numeric NOT NULL DEFAULT 0,
    writeoffs_kpi_affecting integer NOT NULL DEFAULT 0,
    writeoff_value_kpi_affecting numeric NOT NULL DEFAULT 0,
    writeoffs_non_kpi integer NOT NULL DEFAULT 0,
    writeoff_value_non_kpi numeric NOT NULL DEFAULT 0,
    on_time_completions integer NOT NULL DEFAULT 0,
    late_completions integer NOT NULL DEFAULT 0,
    production_details jsonb DEFAULT '[]'::jsonb,
    writeoff_details jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (staff_id, period_date, department)
);

-- Add comments
COMMENT ON TABLE kitchen_bar_kpi IS 'Daily KPI records for kitchen and bar staff. Tracks production and write-off metrics.';

-- Add check constraints
ALTER TABLE kitchen_bar_kpi
    DROP CONSTRAINT IF EXISTS kitchen_bar_kpi_department_check,
    ADD CONSTRAINT kitchen_bar_kpi_department_check
        CHECK (department IN ('kitchen', 'bar'));

ALTER TABLE kitchen_bar_kpi
    DROP CONSTRAINT IF EXISTS kitchen_bar_kpi_productions_check,
    ADD CONSTRAINT kitchen_bar_kpi_productions_check
        CHECK (productions_completed >= 0);

ALTER TABLE kitchen_bar_kpi
    DROP CONSTRAINT IF EXISTS kitchen_bar_kpi_writeoffs_kpi_check,
    ADD CONSTRAINT kitchen_bar_kpi_writeoffs_kpi_check
        CHECK (writeoffs_kpi_affecting >= 0);

ALTER TABLE kitchen_bar_kpi
    DROP CONSTRAINT IF EXISTS kitchen_bar_kpi_writeoffs_non_kpi_check,
    ADD CONSTRAINT kitchen_bar_kpi_writeoffs_non_kpi_check
        CHECK (writeoffs_non_kpi >= 0);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kitchen_bar_kpi_staff_date
    ON kitchen_bar_kpi(staff_id, period_date DESC);

CREATE INDEX IF NOT EXISTS idx_kitchen_bar_kpi_department_date
    ON kitchen_bar_kpi(department, period_date DESC);

CREATE INDEX IF NOT EXISTS idx_kitchen_bar_kpi_period_date
    ON kitchen_bar_kpi(period_date DESC);

-- Enable RLS
ALTER TABLE kitchen_bar_kpi ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read kitchen_bar_kpi" ON kitchen_bar_kpi;
CREATE POLICY "Allow authenticated users to read kitchen_bar_kpi"
    ON kitchen_bar_kpi FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert kitchen_bar_kpi" ON kitchen_bar_kpi;
CREATE POLICY "Allow authenticated users to insert kitchen_bar_kpi"
    ON kitchen_bar_kpi FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update kitchen_bar_kpi" ON kitchen_bar_kpi;
CREATE POLICY "Allow authenticated users to update kitchen_bar_kpi"
    ON kitchen_bar_kpi FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Create upsert function
CREATE OR REPLACE FUNCTION upsert_kitchen_kpi(
    p_staff_id uuid,
    p_staff_name text,
    p_department text,
    p_period_date date,
    p_add_productions integer DEFAULT 0,
    p_add_production_quantity numeric DEFAULT 0,
    p_add_production_value numeric DEFAULT 0,
    p_add_writeoffs_kpi integer DEFAULT 0,
    p_add_writeoff_value_kpi numeric DEFAULT 0,
    p_add_writeoffs_non_kpi integer DEFAULT 0,
    p_add_writeoff_value_non_kpi numeric DEFAULT 0,
    p_add_on_time integer DEFAULT 0,
    p_add_late integer DEFAULT 0,
    p_production_detail jsonb DEFAULT NULL,
    p_writeoff_detail jsonb DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO kitchen_bar_kpi (
        staff_id, staff_name, department, period_date,
        productions_completed, production_quantity_total, production_value_total,
        writeoffs_kpi_affecting, writeoff_value_kpi_affecting,
        writeoffs_non_kpi, writeoff_value_non_kpi,
        on_time_completions, late_completions,
        production_details, writeoff_details
    ) VALUES (
        p_staff_id, p_staff_name, p_department, p_period_date,
        p_add_productions, p_add_production_quantity, p_add_production_value,
        p_add_writeoffs_kpi, p_add_writeoff_value_kpi,
        p_add_writeoffs_non_kpi, p_add_writeoff_value_non_kpi,
        p_add_on_time, p_add_late,
        CASE WHEN p_production_detail IS NOT NULL THEN jsonb_build_array(p_production_detail) ELSE '[]'::jsonb END,
        CASE WHEN p_writeoff_detail IS NOT NULL THEN jsonb_build_array(p_writeoff_detail) ELSE '[]'::jsonb END
    )
    ON CONFLICT (staff_id, period_date, department)
    DO UPDATE SET
        staff_name = EXCLUDED.staff_name,
        productions_completed = kitchen_bar_kpi.productions_completed + p_add_productions,
        production_quantity_total = kitchen_bar_kpi.production_quantity_total + p_add_production_quantity,
        production_value_total = kitchen_bar_kpi.production_value_total + p_add_production_value,
        writeoffs_kpi_affecting = kitchen_bar_kpi.writeoffs_kpi_affecting + p_add_writeoffs_kpi,
        writeoff_value_kpi_affecting = kitchen_bar_kpi.writeoff_value_kpi_affecting + p_add_writeoff_value_kpi,
        writeoffs_non_kpi = kitchen_bar_kpi.writeoffs_non_kpi + p_add_writeoffs_non_kpi,
        writeoff_value_non_kpi = kitchen_bar_kpi.writeoff_value_non_kpi + p_add_writeoff_value_non_kpi,
        on_time_completions = kitchen_bar_kpi.on_time_completions + p_add_on_time,
        late_completions = kitchen_bar_kpi.late_completions + p_add_late,
        production_details = CASE
            WHEN p_production_detail IS NOT NULL
            THEN kitchen_bar_kpi.production_details || p_production_detail
            ELSE kitchen_bar_kpi.production_details
        END,
        writeoff_details = CASE
            WHEN p_writeoff_detail IS NOT NULL
            THEN kitchen_bar_kpi.writeoff_details || p_writeoff_detail
            ELSE kitchen_bar_kpi.writeoff_details
        END,
        updated_at = now()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 3: Create production_schedule table (049)
-- =============================================================================

CREATE TABLE IF NOT EXISTS production_schedule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    preparation_id uuid NOT NULL REFERENCES preparations(id),
    preparation_name text NOT NULL,
    department text NOT NULL DEFAULT 'kitchen',
    schedule_date date NOT NULL,
    production_slot text NOT NULL DEFAULT 'any',
    priority integer NOT NULL DEFAULT 0,
    target_quantity numeric NOT NULL,
    target_unit text NOT NULL,
    current_stock_at_generation numeric DEFAULT 0,
    recommendation_reason text,
    status text NOT NULL DEFAULT 'pending',
    completed_at timestamptz,
    completed_by uuid,
    completed_by_name text,
    completed_quantity numeric,
    preparation_batch_id uuid,
    sync_status text NOT NULL DEFAULT 'pending',
    synced_at timestamptz,
    sync_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (preparation_id, schedule_date, production_slot)
);

-- Add comments
COMMENT ON TABLE production_schedule IS 'TODO-style production schedule for kitchen/bar staff. Tasks can be marked as done, linking to created batches.';

-- Add check constraints
ALTER TABLE production_schedule
    DROP CONSTRAINT IF EXISTS production_schedule_department_check,
    ADD CONSTRAINT production_schedule_department_check
        CHECK (department IN ('kitchen', 'bar'));

ALTER TABLE production_schedule
    DROP CONSTRAINT IF EXISTS production_schedule_slot_check,
    ADD CONSTRAINT production_schedule_slot_check
        CHECK (production_slot IN ('urgent', 'morning', 'afternoon', 'evening', 'any'));

ALTER TABLE production_schedule
    DROP CONSTRAINT IF EXISTS production_schedule_status_check,
    ADD CONSTRAINT production_schedule_status_check
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE production_schedule
    DROP CONSTRAINT IF EXISTS production_schedule_sync_status_check,
    ADD CONSTRAINT production_schedule_sync_status_check
        CHECK (sync_status IN ('pending', 'synced', 'failed'));

ALTER TABLE production_schedule
    DROP CONSTRAINT IF EXISTS production_schedule_target_quantity_check,
    ADD CONSTRAINT production_schedule_target_quantity_check
        CHECK (target_quantity > 0);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_production_schedule_date_dept
    ON production_schedule(schedule_date, department);

CREATE INDEX IF NOT EXISTS idx_production_schedule_status
    ON production_schedule(status)
    WHERE status IN ('pending', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_production_schedule_preparation
    ON production_schedule(preparation_id, schedule_date DESC);

CREATE INDEX IF NOT EXISTS idx_production_schedule_sync_status
    ON production_schedule(sync_status)
    WHERE sync_status = 'pending';

-- Enable RLS
ALTER TABLE production_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read production_schedule" ON production_schedule;
CREATE POLICY "Allow authenticated users to read production_schedule"
    ON production_schedule FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert production_schedule" ON production_schedule;
CREATE POLICY "Allow authenticated users to insert production_schedule"
    ON production_schedule FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update production_schedule" ON production_schedule;
CREATE POLICY "Allow authenticated users to update production_schedule"
    ON production_schedule FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete production_schedule" ON production_schedule;
CREATE POLICY "Allow authenticated users to delete production_schedule"
    ON production_schedule FOR DELETE TO authenticated USING (true);

-- Create complete task function
CREATE OR REPLACE FUNCTION complete_production_schedule_task(
    p_task_id uuid,
    p_completed_by uuid,
    p_completed_by_name text,
    p_completed_quantity numeric,
    p_batch_id uuid DEFAULT NULL
) RETURNS production_schedule AS $$
DECLARE
    v_task production_schedule;
BEGIN
    UPDATE production_schedule
    SET
        status = 'completed',
        completed_at = now(),
        completed_by = p_completed_by,
        completed_by_name = p_completed_by_name,
        completed_quantity = p_completed_quantity,
        preparation_batch_id = p_batch_id,
        updated_at = now()
    WHERE id = p_task_id
    AND status IN ('pending', 'in_progress')
    RETURNING * INTO v_task;

    IF v_task IS NULL THEN
        RAISE EXCEPTION 'Task not found or already completed: %', p_task_id;
    END IF;

    RETURN v_task;
END;
$$ LANGUAGE plpgsql;

-- Create get schedule function
CREATE OR REPLACE FUNCTION get_production_schedule(
    p_date date,
    p_department text
) RETURNS SETOF production_schedule AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM production_schedule
    WHERE schedule_date = p_date
    AND department = p_department
    ORDER BY
        CASE status
            WHEN 'completed' THEN 2
            WHEN 'cancelled' THEN 3
            ELSE 1
        END,
        CASE production_slot
            WHEN 'urgent' THEN 0
            WHEN 'morning' THEN 1
            WHEN 'afternoon' THEN 2
            WHEN 'evening' THEN 3
            ELSE 4
        END,
        priority DESC,
        preparation_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
DECLARE
    prep_cols integer;
    kpi_exists boolean;
    schedule_exists boolean;
BEGIN
    -- Check preparations columns
    SELECT COUNT(*) INTO prep_cols
    FROM information_schema.columns
    WHERE table_name = 'preparations'
    AND column_name IN ('storage_location', 'production_slot', 'min_stock_threshold', 'daily_target_quantity');

    IF prep_cols < 4 THEN
        RAISE WARNING 'Missing columns in preparations table. Found % of 4', prep_cols;
    END IF;

    -- Check kitchen_bar_kpi table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'kitchen_bar_kpi'
    ) INTO kpi_exists;

    IF NOT kpi_exists THEN
        RAISE WARNING 'kitchen_bar_kpi table was not created';
    END IF;

    -- Check production_schedule table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'production_schedule'
    ) INTO schedule_exists;

    IF NOT schedule_exists THEN
        RAISE WARNING 'production_schedule table was not created';
    END IF;

    -- Success message
    IF prep_cols = 4 AND kpi_exists AND schedule_exists THEN
        RAISE NOTICE 'Kitchen Preparation migration completed successfully!';
        RAISE NOTICE '  - preparations table: 4 new columns added';
        RAISE NOTICE '  - kitchen_bar_kpi table: created';
        RAISE NOTICE '  - production_schedule table: created';
        RAISE NOTICE '  - RPC functions: upsert_kitchen_kpi, complete_production_schedule_task, get_production_schedule';
    END IF;
END$$;
