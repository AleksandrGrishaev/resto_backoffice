-- Migration: 049_create_production_schedule_table
-- Description: Create production_schedule table for tracking TODO-style production tasks
-- Date: 2025-12-11
-- Sprint: Kitchen Preparation Sprint 1

-- CONTEXT:
-- Kitchen Preparation feature uses a TODO-list style production schedule where:
-- 1. Tasks are generated based on stock levels and consumption patterns
-- 2. Staff can mark tasks as "Done" which opens a confirmation dialog
-- 3. Completed tasks link to the created preparation batch
-- 4. Historical tracking for KPI and audit purposes

-- Create production_schedule table
CREATE TABLE IF NOT EXISTS production_schedule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Preparation reference
    preparation_id uuid NOT NULL REFERENCES preparations(id),
    preparation_name text NOT NULL,

    -- Department and scheduling
    department text NOT NULL DEFAULT 'kitchen',
    schedule_date date NOT NULL,
    production_slot text NOT NULL DEFAULT 'any',

    -- Task details
    priority integer NOT NULL DEFAULT 0,
    target_quantity numeric NOT NULL,
    target_unit text NOT NULL,

    -- Current stock at time of generation (for context)
    current_stock_at_generation numeric DEFAULT 0,

    -- AI/Rule-based recommendation reason
    recommendation_reason text,

    -- Status tracking
    status text NOT NULL DEFAULT 'pending',

    -- Completion details
    completed_at timestamptz,
    completed_by uuid,
    completed_by_name text,
    completed_quantity numeric,
    preparation_batch_id uuid,

    -- Sync status for offline support
    sync_status text NOT NULL DEFAULT 'pending',
    synced_at timestamptz,
    sync_error text,

    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Unique constraint: one schedule item per preparation per date per slot
    UNIQUE (preparation_id, schedule_date, production_slot)
);

-- Add comments
COMMENT ON TABLE production_schedule IS 'TODO-style production schedule for kitchen/bar staff. Tasks can be marked as done, linking to created batches.';
COMMENT ON COLUMN production_schedule.preparation_id IS 'Reference to preparations table';
COMMENT ON COLUMN production_schedule.department IS 'kitchen or bar';
COMMENT ON COLUMN production_schedule.schedule_date IS 'Date when production should happen';
COMMENT ON COLUMN production_schedule.production_slot IS 'Time slot: urgent, morning, afternoon, evening';
COMMENT ON COLUMN production_schedule.priority IS 'Priority for sorting (higher = more urgent). Urgent items have priority 100+';
COMMENT ON COLUMN production_schedule.target_quantity IS 'Recommended quantity to produce';
COMMENT ON COLUMN production_schedule.target_unit IS 'Unit for target_quantity (grams, portions)';
COMMENT ON COLUMN production_schedule.current_stock_at_generation IS 'Stock level when this schedule item was generated';
COMMENT ON COLUMN production_schedule.recommendation_reason IS 'AI/rule-based explanation: "Based on 3-day avg consumption: 500g/day"';
COMMENT ON COLUMN production_schedule.status IS 'Task status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN production_schedule.completed_at IS 'When task was marked as done';
COMMENT ON COLUMN production_schedule.completed_by IS 'User who completed the task (references users.id)';
COMMENT ON COLUMN production_schedule.completed_quantity IS 'Actual quantity produced (may differ from target)';
COMMENT ON COLUMN production_schedule.preparation_batch_id IS 'Link to created preparation_batches.id';
COMMENT ON COLUMN production_schedule.sync_status IS 'Sync status: pending, synced, failed';

-- Add check constraints
ALTER TABLE production_schedule
    ADD CONSTRAINT production_schedule_department_check
        CHECK (department IN ('kitchen', 'bar'));

ALTER TABLE production_schedule
    ADD CONSTRAINT production_schedule_slot_check
        CHECK (production_slot IN ('urgent', 'morning', 'afternoon', 'evening', 'any'));

ALTER TABLE production_schedule
    ADD CONSTRAINT production_schedule_status_check
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE production_schedule
    ADD CONSTRAINT production_schedule_sync_status_check
        CHECK (sync_status IN ('pending', 'synced', 'failed'));

ALTER TABLE production_schedule
    ADD CONSTRAINT production_schedule_target_quantity_check
        CHECK (target_quantity > 0);

-- Create indexes for common queries
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
CREATE POLICY "Allow authenticated users to read production_schedule"
    ON production_schedule
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert production_schedule"
    ON production_schedule
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update production_schedule"
    ON production_schedule
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete production_schedule"
    ON production_schedule
    FOR DELETE
    TO authenticated
    USING (true);

-- Create function to complete a schedule task
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

COMMENT ON FUNCTION complete_production_schedule_task IS 'Mark a schedule task as completed with the actual produced quantity';

-- Create function to get schedule for a date and department
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

COMMENT ON FUNCTION get_production_schedule IS 'Get production schedule for a specific date and department, sorted by urgency and slot';

-- POST-MIGRATION VALIDATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_schedule') THEN
        RAISE EXCEPTION 'Migration failed: production_schedule table was not created';
    END IF;

    RAISE NOTICE 'Migration 049 completed successfully. Created production_schedule table.';
END$$;
