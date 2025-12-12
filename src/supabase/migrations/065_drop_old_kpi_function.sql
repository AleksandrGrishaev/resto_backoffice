-- Migration: 065_drop_old_kpi_function
-- Description: Drop deprecated get_food_cost_kpi_month function
-- Date: 2024-12-13
-- Reason: Superseded by unified get_cogs_by_date_range function (migration 063)

-- Drop the old function that was replaced by get_cogs_by_date_range
-- The new function supports:
-- - Arbitrary date ranges (not just monthly)
-- - Configurable exclusions for KPI vs P&L
-- - Detailed spoilage breakdown by reason

DROP FUNCTION IF EXISTS get_food_cost_kpi_month(DATE, TEXT);

-- Note: If function doesn't exist, this will succeed silently (IF EXISTS)
