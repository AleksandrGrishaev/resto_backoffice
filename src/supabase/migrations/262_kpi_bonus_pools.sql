-- Migration: 262_kpi_bonus_pools
-- Description: KPI bonus pool schemes, snapshots, and payroll integration
-- Date: 2026-03-29

-- Department KPI bonus scheme configuration (one per department)
CREATE TABLE kpi_bonus_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL CHECK (department IN ('kitchen', 'bar')),
  name TEXT NOT NULL,
  pool_amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  weight_food_cost INTEGER NOT NULL DEFAULT 40,
  weight_time INTEGER NOT NULL DEFAULT 20,
  weight_production INTEGER NOT NULL DEFAULT 20,
  weight_ritual INTEGER NOT NULL DEFAULT 20,
  min_threshold INTEGER NOT NULL DEFAULT 0,
  pool_type TEXT NOT NULL DEFAULT 'fixed' CHECK (pool_type IN ('fixed', 'percent_revenue')),
  pool_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department)
);

ALTER TABLE kpi_bonus_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON kpi_bonus_schemes FOR ALL USING (is_staff()) WITH CHECK (is_staff());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON kpi_bonus_schemes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- KPI bonus calculation snapshots (per payroll period per department)
CREATE TABLE kpi_bonus_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  department TEXT NOT NULL CHECK (department IN ('kitchen', 'bar')),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  score_food_cost NUMERIC(5,2) DEFAULT 0,
  score_time NUMERIC(5,2) DEFAULT 0,
  score_production NUMERIC(5,2) DEFAULT 0,
  score_ritual NUMERIC(5,2) DEFAULT 0,
  weight_food_cost INTEGER NOT NULL DEFAULT 0,
  weight_time INTEGER NOT NULL DEFAULT 0,
  weight_production INTEGER NOT NULL DEFAULT 0,
  weight_ritual INTEGER NOT NULL DEFAULT 0,
  department_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  pool_type TEXT NOT NULL DEFAULT 'fixed',
  pool_amount NUMERIC NOT NULL DEFAULT 0,
  department_revenue NUMERIC NOT NULL DEFAULT 0,
  unlocked_amount NUMERIC NOT NULL DEFAULT 0,
  raw_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payroll_period_id, department)
);

ALTER TABLE kpi_bonus_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON kpi_bonus_snapshots FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Index for FK lookups
CREATE INDEX idx_kpi_bonus_snapshots_period ON kpi_bonus_snapshots(payroll_period_id);

-- Add KPI bonus columns to existing payroll tables
ALTER TABLE payroll_items ADD COLUMN kpi_bonus NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE payroll_periods ADD COLUMN total_kpi_bonuses NUMERIC NOT NULL DEFAULT 0;

-- Grants
GRANT ALL ON kpi_bonus_schemes TO authenticated;
GRANT ALL ON kpi_bonus_snapshots TO authenticated;
GRANT ALL ON kpi_bonus_schemes TO service_role;
GRANT ALL ON kpi_bonus_snapshots TO service_role;
