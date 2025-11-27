-- Migration: 017_create_sales_transactions
-- Description: Create sales_transactions table for storing sales transactions with FIFO cost tracking
-- Date: 2025-01-27
-- Sprint: 2 - FIFO Allocation for Actual Cost

-- CONTEXT: This table stores all sales transactions from POS system
-- Each row represents one bill item sold, with:
-- - Actual cost calculated from FIFO batches (actualCost field)
-- - Profit calculation based on actual cost
-- - Links to orders, payments, and write-off operations

-- ================================================================
-- TABLE: sales_transactions
-- ================================================================

CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ================================================================
  -- REFERENCE DATA (Links to POS data)
  -- ================================================================
  payment_id UUID NOT NULL,
  order_id UUID NOT NULL,
  bill_id UUID NOT NULL,
  item_id UUID NOT NULL,
  shift_id UUID,

  -- ================================================================
  -- MENU DATA
  -- ================================================================
  menu_item_id UUID NOT NULL,
  menu_item_name TEXT NOT NULL,
  variant_id UUID NOT NULL,
  variant_name TEXT NOT NULL,

  -- ================================================================
  -- SALE DATA
  -- ================================================================
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(12, 2) NOT NULL CHECK (total_price >= 0),
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('cash', 'card', 'qr_gojek', 'qr_grab', 'qr_other', 'transfer', 'other')
  ),

  -- ================================================================
  -- DATETIME
  -- ================================================================
  sold_at TIMESTAMPTZ NOT NULL,
  processed_by TEXT NOT NULL,

  -- ================================================================
  -- RECIPE/INVENTORY LINKS
  -- ================================================================
  recipe_id UUID,
  recipe_write_off_id UUID,
  preparation_write_off_ids UUID[], -- ✅ SPRINT 2: Array of preparation write-off IDs
  product_write_off_ids UUID[], -- ✅ SPRINT 2: Array of product write-off IDs (for direct sales)

  -- ================================================================
  -- PROFIT CALCULATION (JSONB)
  -- Structure:
  -- {
  --   "originalPrice": number,
  --   "itemOwnDiscount": number,
  --   "allocatedBillDiscount": number,
  --   "finalRevenue": number,
  --   "ingredientsCost": number,
  --   "profit": number,
  --   "profitMargin": number
  -- }
  -- ================================================================
  profit_calculation JSONB NOT NULL,

  -- ================================================================
  -- ✅ ACTUAL COST BREAKDOWN (JSONB) - SPRINT 2
  -- Structure:
  -- {
  --   "totalCost": number,
  --   "preparationCosts": [
  --     {
  --       "preparationId": string,
  --       "preparationName": string,
  --       "quantity": number,
  --       "unit": string,
  --       "batchAllocations": [
  --         {
  --           "batchId": string,
  --           "batchNumber": string,
  --           "allocatedQuantity": number,
  --           "costPerUnit": number,
  --           "totalCost": number,
  --           "batchCreatedAt": string
  --         }
  --       ],
  --       "averageCostPerUnit": number,
  --       "totalCost": number
  --     }
  --   ],
  --   "productCosts": [same structure as preparationCosts],
  --   "method": "FIFO" | "LIFO" | "WeightedAverage",
  --   "calculatedAt": string
  -- }
  -- ================================================================
  actual_cost JSONB,

  -- ================================================================
  -- DECOMPOSITION SUMMARY (JSONB) - DEPRECATED, kept for backward compatibility
  -- Will be replaced by actual_cost in future versions
  -- ================================================================
  decomposition_summary JSONB,

  -- ================================================================
  -- SYNC STATUS
  -- ================================================================
  synced_to_backoffice BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ,

  -- ================================================================
  -- DEPARTMENT
  -- ================================================================
  department TEXT NOT NULL CHECK (department IN ('kitchen', 'bar')),

  -- ================================================================
  -- TIMESTAMPS
  -- ================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_sales_transactions_payment_id
  ON sales_transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_order_id
  ON sales_transactions(order_id);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_sold_at
  ON sales_transactions(sold_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_menu_item_id
  ON sales_transactions(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_department
  ON sales_transactions(department);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_shift_id
  ON sales_transactions(shift_id);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_payment_method
  ON sales_transactions(payment_method);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_sales_transactions_sold_at_department
  ON sales_transactions(sold_at DESC, department);

-- ================================================================
-- RLS POLICIES
-- ================================================================
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all sales transactions
CREATE POLICY "sales_transactions_select_policy"
  ON sales_transactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert sales transactions
CREATE POLICY "sales_transactions_insert_policy"
  ON sales_transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update sales transactions
CREATE POLICY "sales_transactions_update_policy"
  ON sales_transactions FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Restrict delete to admins only
CREATE POLICY "sales_transactions_delete_policy"
  ON sales_transactions FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND 'admin' = ANY(users.roles)
    )
  );

-- ================================================================
-- UPDATED_AT TRIGGER
-- ================================================================
CREATE OR REPLACE FUNCTION update_sales_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_transactions_updated_at_trigger
  BEFORE UPDATE ON sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_transactions_updated_at();

-- ================================================================
-- VALIDATION
-- ================================================================

-- Validate that profit calculation is consistent
CREATE OR REPLACE FUNCTION validate_sales_transaction_profit()
RETURNS TRIGGER AS $$
DECLARE
  calc_profit DECIMAL(12, 2);
  stored_profit DECIMAL(12, 2);
BEGIN
  -- Extract profit from profit_calculation JSONB
  stored_profit := (NEW.profit_calculation->>'profit')::DECIMAL(12, 2);

  -- Calculate expected profit (finalRevenue - ingredientsCost)
  calc_profit := (NEW.profit_calculation->>'finalRevenue')::DECIMAL(12, 2)
                - (NEW.profit_calculation->>'ingredientsCost')::DECIMAL(12, 2);

  -- Check consistency (allow 0.01 difference for rounding)
  IF ABS(stored_profit - calc_profit) > 0.01 THEN
    RAISE EXCEPTION 'Profit calculation mismatch: expected %, got %', calc_profit, stored_profit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_transactions_validate_profit_trigger
  BEFORE INSERT OR UPDATE ON sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_sales_transaction_profit();

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE sales_transactions IS
  'Sales transactions with FIFO-based actual cost tracking. Each row represents one bill item sold.';

COMMENT ON COLUMN sales_transactions.actual_cost IS
  'JSONB: Actual cost breakdown from FIFO batch allocation (Sprint 2)';

COMMENT ON COLUMN sales_transactions.decomposition_summary IS
  'JSONB: DEPRECATED - Legacy decomposition-based cost (will be removed in future)';

COMMENT ON COLUMN sales_transactions.profit_calculation IS
  'JSONB: Profit calculation based on actual cost from FIFO batches';
