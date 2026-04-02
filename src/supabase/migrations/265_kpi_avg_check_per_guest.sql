-- Migration: 265_kpi_avg_check_per_guest
-- Description: Add avg check per guest metric to KPI bonus system
-- Date: 2026-03-29

-- 1. Add avg check fields to kpi_bonus_schemes
ALTER TABLE kpi_bonus_schemes
  ADD COLUMN IF NOT EXISTS weight_avg_check INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS threshold_avg_check INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_check_target INTEGER DEFAULT 0;

-- 2. Add avg check fields to kpi_bonus_snapshots
ALTER TABLE kpi_bonus_snapshots
  ADD COLUMN IF NOT EXISTS score_avg_check NUMERIC DEFAULT -1,
  ADD COLUMN IF NOT EXISTS weight_avg_check INTEGER DEFAULT 0;
