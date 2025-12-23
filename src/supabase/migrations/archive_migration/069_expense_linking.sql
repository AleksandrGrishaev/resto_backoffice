-- Migration: 069_expense_linking
-- Description: Add expense-invoice linking system for POS receipts
-- Date: 2024-12-15
-- Author: Claude Code

-- CONTEXT:
-- This migration adds the infrastructure for linking POS expense operations
-- to supplier invoices (supplierstore_orders). It supports:
-- 1. Online receipts with immediate linking
-- 2. Offline expenses that can be linked later in backoffice
-- 3. Partial linking (expense amount != invoice amount)
-- 4. Audit trail for link/unlink operations

-- ============================================
-- 1. EXPENSE INVOICE LINKS (with built-in audit)
-- ============================================
-- One table for links AND history (instead of two separate tables)
-- Link: create record with is_active = true
-- Unlink: set is_active = false, fill unlinked_* fields

CREATE TABLE IF NOT EXISTS expense_invoice_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Expense reference
  expense_id TEXT NOT NULL,           -- ShiftExpenseOperation.id
  shift_id UUID NOT NULL,             -- shifts.id

  -- Invoice reference
  invoice_id TEXT NOT NULL,           -- supplierstore_orders.id
  invoice_number TEXT NOT NULL,

  -- Link details
  linked_amount DECIMAL(15,2) NOT NULL,
  balance_adjustment_amount DECIMAL(15,2),  -- difference: expense - invoice

  -- Link info
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_by JSONB NOT NULL,           -- { id, name, role }
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Unlink info (filled when unlinking)
  unlinked_at TIMESTAMPTZ,
  unlinked_by JSONB,
  unlink_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_expense_links_expense ON expense_invoice_links(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_links_invoice ON expense_invoice_links(invoice_id);
CREATE INDEX IF NOT EXISTS idx_expense_links_shift ON expense_invoice_links(shift_id);
CREATE INDEX IF NOT EXISTS idx_expense_links_active ON expense_invoice_links(is_active) WHERE is_active = true;

-- RLS Policy
ALTER TABLE expense_invoice_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_links_all" ON expense_invoice_links FOR ALL USING (true);


-- ============================================
-- 2. APP SETTINGS
-- ============================================
-- Application settings (expense mode, thresholds, etc.)

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Default expense settings
INSERT INTO app_settings (key, value) VALUES
('expense_settings', '{
  "defaultExpenseMode": "backoffice_first",
  "allowCashierDirectExpense": true,
  "autoSuggestThreshold": 0.05
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS Policy
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_all" ON app_settings FOR ALL USING (true);


-- ============================================
-- 3. DATA MIGRATION: Add linkingStatus to existing expenses
-- ============================================
-- Add linkingStatus to existing supplier_payment in shifts.expense_operations
-- This ensures backward compatibility with existing data

UPDATE shifts
SET expense_operations = (
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN (op->>'type') = 'supplier_payment' AND (op->>'status') = 'confirmed'
        THEN op || '{"linkingStatus": "fully_linked"}'::jsonb
        WHEN (op->>'type') = 'supplier_payment' AND (op->>'status') != 'confirmed'
        THEN op || '{"linkingStatus": "unlinked"}'::jsonb
        ELSE op
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(expense_operations) AS op
)
WHERE expense_operations IS NOT NULL
  AND jsonb_array_length(expense_operations) > 0;


-- ============================================
-- 4. HELPER FUNCTION: Get unlinked expenses
-- ============================================
-- Returns all unlinked expense operations across all shifts

CREATE OR REPLACE FUNCTION get_unlinked_expenses(
  p_counteragent_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  expense_id TEXT,
  shift_id UUID,
  shift_number TEXT,
  expense_type TEXT,
  amount DECIMAL,
  counteragent_id TEXT,
  counteragent_name TEXT,
  created_at TIMESTAMPTZ,
  notes TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (op->>'id')::TEXT as expense_id,
    s.id as shift_id,
    s.shift_number,
    (op->>'type')::TEXT as expense_type,
    (op->>'amount')::DECIMAL as amount,
    (op->>'counteragentId')::TEXT as counteragent_id,
    (op->>'counteragentName')::TEXT as counteragent_name,
    (op->>'createdAt')::TIMESTAMPTZ as created_at,
    (op->>'notes')::TEXT as notes
  FROM shifts s,
       jsonb_array_elements(s.expense_operations) AS op
  WHERE (op->>'linkingStatus') = 'unlinked'
    AND (op->>'type') IN ('supplier_payment', 'unlinked_expense')
    AND (p_counteragent_id IS NULL OR (op->>'counteragentId') = p_counteragent_id)
  ORDER BY (op->>'createdAt')::TIMESTAMPTZ DESC;
END;
$$;


-- ============================================
-- 5. HELPER FUNCTION: Get available invoices for linking
-- ============================================
-- Returns invoices that can be linked to an expense

CREATE OR REPLACE FUNCTION get_available_invoices_for_linking(
  p_counteragent_id TEXT
)
RETURNS TABLE (
  invoice_id TEXT,
  order_number TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  total_amount DECIMAL,
  already_linked_amount DECIMAL,
  remaining_amount DECIMAL,
  created_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    so.id::TEXT as invoice_id,
    so.order_number,
    so.supplier_id,
    so.supplier_name,
    so.total_amount,
    COALESCE(
      (SELECT SUM(eil.linked_amount)
       FROM expense_invoice_links eil
       WHERE eil.invoice_id = so.id::TEXT AND eil.is_active = true),
      0
    ) as already_linked_amount,
    so.total_amount - COALESCE(
      (SELECT SUM(eil.linked_amount)
       FROM expense_invoice_links eil
       WHERE eil.invoice_id = so.id::TEXT AND eil.is_active = true),
      0
    ) as remaining_amount,
    so.created_at,
    so.status
  FROM supplierstore_orders so
  WHERE so.supplier_id = p_counteragent_id
    AND so.status IN ('sent', 'delivered')
    AND so.bill_status NOT IN ('fully_paid', 'overpaid')
  ORDER BY so.created_at DESC;
END;
$$;


-- ============================================
-- SUMMARY
-- ============================================
-- Tables created:
--   1. expense_invoice_links - Links between expenses and invoices with audit
--   2. app_settings - Application settings storage
--
-- Functions created:
--   1. get_unlinked_expenses() - Get all unlinked expenses
--   2. get_available_invoices_for_linking() - Get invoices available for linking
--
-- Data migration:
--   - Added linkingStatus to existing supplier_payment expenses
