-- Migration: 245_work_logs_edit_tracking
-- Description: Add edit tracking columns to staff_work_logs
-- Date: 2026-03-25

ALTER TABLE staff_work_logs
  ADD COLUMN IF NOT EXISTS edit_reason TEXT,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
