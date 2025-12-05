-- Migration: 036_add_tax_storage_fields
-- Description: Add tax storage fields to sales_transactions and orders tables
-- Date: 2025-12-04
-- Fixes: Issue #1 - Tax data completely missing

-- =============================================
-- PART 1: Add tax fields to sales_transactions
-- =============================================

ALTER TABLE sales_transactions
ADD COLUMN service_tax_rate NUMERIC(5,4) DEFAULT 0.05,
ADD COLUMN service_tax_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN government_tax_rate NUMERIC(5,4) DEFAULT 0.10,
ADD COLUMN government_tax_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN total_tax_amount NUMERIC(15,2) DEFAULT 0;

COMMENT ON COLUMN sales_transactions.service_tax_rate IS 'Service tax rate (e.g., 0.05 = 5%)';
COMMENT ON COLUMN sales_transactions.service_tax_amount IS 'Service tax amount in IDR';
COMMENT ON COLUMN sales_transactions.government_tax_rate IS 'Government tax rate (e.g., 0.10 = 10%)';
COMMENT ON COLUMN sales_transactions.government_tax_amount IS 'Government tax amount in IDR';
COMMENT ON COLUMN sales_transactions.total_tax_amount IS 'Total tax amount (sum of all taxes)';

-- Add indexes for tax reporting
CREATE INDEX idx_sales_transactions_service_tax ON sales_transactions(service_tax_amount) WHERE service_tax_amount > 0;
CREATE INDEX idx_sales_transactions_government_tax ON sales_transactions(government_tax_amount) WHERE government_tax_amount > 0;
CREATE INDEX idx_sales_transactions_total_tax ON sales_transactions(total_tax_amount) WHERE total_tax_amount > 0;

-- =============================================
-- PART 2: Validate revenue_breakdown structure
-- =============================================

-- Add check constraint to ensure taxes array in revenue_breakdown is properly structured
ALTER TABLE orders
ADD CONSTRAINT check_revenue_breakdown_taxes
CHECK (
  revenue_breakdown IS NULL OR
  jsonb_typeof(revenue_breakdown->'taxes') = 'array'
);

COMMENT ON CONSTRAINT check_revenue_breakdown_taxes ON orders IS 'Ensures taxes field in revenue_breakdown is an array';

-- =============================================
-- PART 3: Add validation constraints
-- =============================================

-- Ensure tax amounts are non-negative
ALTER TABLE sales_transactions
ADD CONSTRAINT check_service_tax_nonnegative CHECK (service_tax_amount >= 0),
ADD CONSTRAINT check_government_tax_nonnegative CHECK (government_tax_amount >= 0),
ADD CONSTRAINT check_total_tax_nonnegative CHECK (total_tax_amount >= 0);

-- Ensure tax rates are reasonable (0-50%)
ALTER TABLE sales_transactions
ADD CONSTRAINT check_service_tax_rate_valid CHECK (service_tax_rate >= 0 AND service_tax_rate <= 0.5),
ADD CONSTRAINT check_government_tax_rate_valid CHECK (government_tax_rate >= 0 AND government_tax_rate <= 0.5);

-- Ensure total tax equals sum of individual taxes (within 1 IDR tolerance)
ALTER TABLE sales_transactions
ADD CONSTRAINT check_total_tax_equals_sum
CHECK (ABS(total_tax_amount - (service_tax_amount + government_tax_amount)) < 1);

COMMENT ON CONSTRAINT check_total_tax_equals_sum ON sales_transactions IS 'Validates total tax equals sum of service + government tax (within 1 IDR tolerance)';
