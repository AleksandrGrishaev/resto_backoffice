-- Migration: 264_kpi_per_metric_thresholds
-- Description: Per-metric thresholds for KPI bonus scoring
-- Date: 2026-03-29

-- Per-metric thresholds: 0 = graduated (no threshold), >0 = minimum score to pass
-- Below threshold → metric contributes 0 to weighted average
ALTER TABLE kpi_bonus_schemes
  ADD COLUMN threshold_food_cost INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN threshold_time INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN threshold_production INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN threshold_ritual INTEGER NOT NULL DEFAULT 0;
