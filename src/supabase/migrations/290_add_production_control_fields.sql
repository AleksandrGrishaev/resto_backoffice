-- Migration: 290_add_production_control_fields
-- Description: Add staff accountability, photo verification, and time tracking to production_schedule
-- Date: 2026-04-09

-- Staff accountability (links to staff_members table)
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES staff_members(id);
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS staff_member_name TEXT;

-- Photo verification
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ;

-- Time tracking
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS is_quick_completion BOOLEAN DEFAULT FALSE;

-- Index for staff queries
CREATE INDEX IF NOT EXISTS idx_production_schedule_staff ON production_schedule(staff_member_id) WHERE staff_member_id IS NOT NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
