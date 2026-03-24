-- Migration: 244_work_logs_bonuses_payroll
-- Description: Create work_logs, bonuses, payroll_periods, payroll_items tables
-- Date: 2026-03-24

-- Daily work hours log
CREATE TABLE staff_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id),
  work_date DATE NOT NULL,
  hours_worked NUMERIC(4,1) NOT NULL DEFAULT 0,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, work_date)
);

ALTER TABLE staff_work_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON staff_work_logs FOR ALL USING (is_staff()) WITH CHECK (is_staff());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff_work_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Bonuses (one-time and monthly recurring)
CREATE TABLE staff_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id),
  type TEXT NOT NULL CHECK (type IN ('one_time', 'monthly')),
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  effective_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON staff_bonuses FOR ALL USING (is_staff()) WITH CHECK (is_staff());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff_bonuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Payroll periods (calculated snapshots)
CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'calculated', 'approved', 'paid')) DEFAULT 'draft',
  total_service_tax NUMERIC NOT NULL DEFAULT 0,
  total_base_salary NUMERIC NOT NULL DEFAULT 0,
  total_bonuses NUMERIC NOT NULL DEFAULT 0,
  total_payroll NUMERIC NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_start, period_end)
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON payroll_periods FOR ALL USING (is_staff()) WITH CHECK (is_staff());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Per-staff breakdown within a payroll period
CREATE TABLE payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_members(id),
  hours_worked NUMERIC(6,1) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  base_salary_earned NUMERIC NOT NULL DEFAULT 0,
  service_tax_share NUMERIC NOT NULL DEFAULT 0,
  bonuses_total NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payroll_period_id, staff_id)
);

ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON payroll_items FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Grant to authenticated (required for RLS to work via anon key)
GRANT ALL ON staff_work_logs TO authenticated;
GRANT ALL ON staff_bonuses TO authenticated;
GRANT ALL ON payroll_periods TO authenticated;
GRANT ALL ON payroll_items TO authenticated;

-- Grant to service_role for edge functions
GRANT ALL ON staff_ranks TO service_role;
GRANT ALL ON staff_members TO service_role;
GRANT ALL ON staff_work_logs TO service_role;
GRANT ALL ON staff_bonuses TO service_role;
GRANT ALL ON payroll_periods TO service_role;
GRANT ALL ON payroll_items TO service_role;
