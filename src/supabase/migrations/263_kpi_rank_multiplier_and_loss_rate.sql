-- Migration: 263_kpi_rank_multiplier_and_loss_rate
-- Description: Add rank-based KPI multiplier and loss rate target
-- Date: 2026-03-29

-- Add KPI multiplier to staff ranks (Senior=1.5, Junior=1.0, etc.)
ALTER TABLE staff_ranks ADD COLUMN kpi_multiplier NUMERIC NOT NULL DEFAULT 1.0;

-- Update existing ranks
UPDATE staff_ranks SET kpi_multiplier = 1.5 WHERE name = 'Senior';
UPDATE staff_ranks SET kpi_multiplier = 1.0 WHERE name = 'Junior';

-- Add loss rate target to bonus schemes (default 3%)
ALTER TABLE kpi_bonus_schemes ADD COLUMN loss_rate_target NUMERIC NOT NULL DEFAULT 3;
