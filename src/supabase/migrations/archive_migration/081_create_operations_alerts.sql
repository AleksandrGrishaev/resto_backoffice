-- Migration: 081_create_operations_alerts
-- Description: Operations Alert System for fraud protection and manager notifications
-- Date: 2025-12-27

-- Create operations_alerts table
CREATE TABLE IF NOT EXISTS operations_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  category TEXT NOT NULL CHECK (category IN ('shift', 'account', 'product', 'supplier')),
  type TEXT NOT NULL,  -- 'pre_bill_modified', 'cash_discrepancy', etc.
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,  -- Flexible data: itemIds, amounts, before/after snapshots

  -- Context references
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  bill_id UUID,  -- No FK as bills are stored in orders.bills JSONB
  user_id UUID,  -- Who triggered the alert (cashier)

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'acknowledged', 'resolved')),
  acknowledged_by UUID,  -- Manager who acknowledged
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_alerts_category ON operations_alerts(category);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON operations_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON operations_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_shift ON operations_alerts(shift_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON operations_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_new ON operations_alerts(status) WHERE status = 'new';

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_alerts_dashboard ON operations_alerts(status, category, created_at DESC);

-- Enable RLS
ALTER TABLE operations_alerts ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_alerts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_alerts TO authenticated;

-- RLS Policy - matching pattern used by other tables (accounts, orders, payments, etc.)
-- App uses anon key with PIN authentication, not Supabase Auth
CREATE POLICY "Allow all for authenticated users" ON operations_alerts
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_operations_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS operations_alerts_updated_at ON operations_alerts;
CREATE TRIGGER operations_alerts_updated_at
  BEFORE UPDATE ON operations_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_operations_alerts_updated_at();

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE operations_alerts;
