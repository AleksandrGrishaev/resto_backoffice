-- Migration: 048_create_kitchen_kpi_table
-- Description: Create kitchen_bar_kpi table for staff performance tracking
-- Date: 2025-12-11
-- Sprint: Kitchen Preparation Sprint 1

-- CONTEXT:
-- Kitchen Preparation feature needs KPI tracking for:
-- 1. Staff performance metrics (production count, write-off count)
-- 2. Dashboard displays showing daily/weekly results
-- 3. Monitor displays for real-time staff metrics
-- 4. Historical reporting and analytics

-- Create kitchen_bar_kpi table
CREATE TABLE IF NOT EXISTS kitchen_bar_kpi (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Staff identification
    staff_id uuid NOT NULL,
    staff_name text NOT NULL,
    department text NOT NULL DEFAULT 'kitchen',

    -- Period
    period_date date NOT NULL,

    -- Production metrics
    productions_completed integer NOT NULL DEFAULT 0,
    production_quantity_total numeric NOT NULL DEFAULT 0,
    production_value_total numeric NOT NULL DEFAULT 0,

    -- Write-off metrics (KPI-affecting)
    writeoffs_kpi_affecting integer NOT NULL DEFAULT 0,
    writeoff_value_kpi_affecting numeric NOT NULL DEFAULT 0,

    -- Write-off metrics (non-KPI, e.g., expired items)
    writeoffs_non_kpi integer NOT NULL DEFAULT 0,
    writeoff_value_non_kpi numeric NOT NULL DEFAULT 0,

    -- Schedule completion metrics
    on_time_completions integer NOT NULL DEFAULT 0,
    late_completions integer NOT NULL DEFAULT 0,

    -- Detailed breakdowns (JSONB for flexibility)
    production_details jsonb DEFAULT '[]'::jsonb,
    writeoff_details jsonb DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Unique constraint: one record per staff per day per department
    UNIQUE (staff_id, period_date, department)
);

-- Add comments
COMMENT ON TABLE kitchen_bar_kpi IS 'Daily KPI records for kitchen and bar staff. Tracks production and write-off metrics.';
COMMENT ON COLUMN kitchen_bar_kpi.staff_id IS 'Reference to users.id';
COMMENT ON COLUMN kitchen_bar_kpi.department IS 'kitchen or bar';
COMMENT ON COLUMN kitchen_bar_kpi.period_date IS 'Date for this KPI record (one per staff per day)';
COMMENT ON COLUMN kitchen_bar_kpi.productions_completed IS 'Number of production batches completed';
COMMENT ON COLUMN kitchen_bar_kpi.production_quantity_total IS 'Total quantity produced (in grams or portions)';
COMMENT ON COLUMN kitchen_bar_kpi.production_value_total IS 'Total value of production (IDR)';
COMMENT ON COLUMN kitchen_bar_kpi.writeoffs_kpi_affecting IS 'Number of write-offs that affect KPI (staff errors)';
COMMENT ON COLUMN kitchen_bar_kpi.writeoff_value_kpi_affecting IS 'Value of KPI-affecting write-offs (IDR)';
COMMENT ON COLUMN kitchen_bar_kpi.writeoffs_non_kpi IS 'Number of write-offs not affecting KPI (expired, quality issues)';
COMMENT ON COLUMN kitchen_bar_kpi.writeoff_value_non_kpi IS 'Value of non-KPI write-offs (IDR)';
COMMENT ON COLUMN kitchen_bar_kpi.on_time_completions IS 'Schedule tasks completed on time';
COMMENT ON COLUMN kitchen_bar_kpi.late_completions IS 'Schedule tasks completed late';
COMMENT ON COLUMN kitchen_bar_kpi.production_details IS 'JSONB array of production details: [{batchId, preparationName, quantity, value, timestamp}]';
COMMENT ON COLUMN kitchen_bar_kpi.writeoff_details IS 'JSONB array of write-off details: [{operationId, type, reason, quantity, value, timestamp}]';

-- Add check constraints
ALTER TABLE kitchen_bar_kpi
    ADD CONSTRAINT kitchen_bar_kpi_department_check
        CHECK (department IN ('kitchen', 'bar'));

ALTER TABLE kitchen_bar_kpi
    ADD CONSTRAINT kitchen_bar_kpi_productions_check
        CHECK (productions_completed >= 0);

ALTER TABLE kitchen_bar_kpi
    ADD CONSTRAINT kitchen_bar_kpi_writeoffs_kpi_check
        CHECK (writeoffs_kpi_affecting >= 0);

ALTER TABLE kitchen_bar_kpi
    ADD CONSTRAINT kitchen_bar_kpi_writeoffs_non_kpi_check
        CHECK (writeoffs_non_kpi >= 0);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kitchen_bar_kpi_staff_date
    ON kitchen_bar_kpi(staff_id, period_date DESC);

CREATE INDEX IF NOT EXISTS idx_kitchen_bar_kpi_department_date
    ON kitchen_bar_kpi(department, period_date DESC);

CREATE INDEX IF NOT EXISTS idx_kitchen_bar_kpi_period_date
    ON kitchen_bar_kpi(period_date DESC);

-- Enable RLS
ALTER TABLE kitchen_bar_kpi ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read all KPI records (for dashboards)
CREATE POLICY "Allow authenticated users to read kitchen_bar_kpi"
    ON kitchen_bar_kpi
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert KPI records
CREATE POLICY "Allow authenticated users to insert kitchen_bar_kpi"
    ON kitchen_bar_kpi
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update KPI records
CREATE POLICY "Allow authenticated users to update kitchen_bar_kpi"
    ON kitchen_bar_kpi
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create function to upsert KPI record
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

COMMENT ON FUNCTION upsert_kitchen_kpi IS 'Upsert KPI record for a staff member. Increments counters and appends details.';

-- POST-MIGRATION VALIDATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kitchen_bar_kpi') THEN
        RAISE EXCEPTION 'Migration failed: kitchen_bar_kpi table was not created';
    END IF;

    RAISE NOTICE 'Migration 048 completed successfully. Created kitchen_bar_kpi table.';
END$$;
