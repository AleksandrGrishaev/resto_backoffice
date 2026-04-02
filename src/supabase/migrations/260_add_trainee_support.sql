-- Migration: 260_add_trainee_support
-- Description: Add trainee flag and custom salary to staff_members
-- Date: 2026-03-26

-- Trainees have individual monthly salary (not from rank) and no service tax share
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS is_trainee BOOLEAN DEFAULT false;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS custom_salary NUMERIC DEFAULT NULL;
-- custom_salary: monthly salary for trainees, hourly = custom_salary / 208
