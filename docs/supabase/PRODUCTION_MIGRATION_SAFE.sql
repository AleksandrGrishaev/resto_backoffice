-- ============================================================================
-- SAFE PRODUCTION MIGRATION - Idempotent (can run multiple times)
-- All 36 tables with indexes and basic RLS
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CREATE ALL 36 TABLES
-- ============================================================================

-- 1. accounts
CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  name text NOT NULL,
  type text NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  description text,
  last_transaction_date timestamptz
);

-- 2. counteragents
CREATE TABLE IF NOT EXISTS counteragents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  display_name text,
  type text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  website text,
  product_categories text[] DEFAULT ARRAY[]::text[],
  payment_terms text NOT NULL DEFAULT 'on_delivery'::text,
  credit_limit numeric(15,2),
  lead_time_days integer NOT NULL DEFAULT 1,
  delivery_schedule text,
  min_order_amount numeric(15,2),
  description text,
  tags text[],
  notes text,
  is_active bool DEFAULT true,
  is_preferred bool DEFAULT false,
  total_orders integer DEFAULT 0,
  total_order_value numeric(15,2) DEFAULT 0,
  last_order_date timestamptz,
  average_delivery_time numeric(5,2),
  current_balance numeric(15,2) DEFAULT 0,
  balance_history jsonb DEFAULT '[]'::jsonb,
  last_balance_update timestamptz
);

-- 3. delete_procurement_requests
CREATE TABLE IF NOT EXISTS delete_procurement_requests (
  id text PRIMARY KEY,
  request_number text NOT NULL,
  department text NOT NULL,
  requested_by text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft'::text,
  priority text NOT NULL DEFAULT 'normal'::text,
  purchase_order_ids text[] DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

-- 4. delete_purchase_orders
CREATE TABLE IF NOT EXISTS delete_purchase_orders (
  id text PRIMARY KEY,
  order_number text NOT NULL,
  supplier_id uuid NOT NULL,
  supplier_name text NOT NULL,
  order_date timestamptz NOT NULL,
  expected_delivery_date timestamptz,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  is_estimated_total bool NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft'::text,
  bill_status text NOT NULL DEFAULT 'not_billed'::text,
  bill_status_calculated_at timestamptz,
  request_ids text[] DEFAULT ARRAY[]::text[],
  receipt_id text,
  bill_id text,
  notes text,
  original_total_amount numeric,
  actual_delivered_amount numeric,
  receipt_discrepancies jsonb,
  has_receipt_discrepancies bool DEFAULT false,
  receipt_completed_at timestamptz,
  receipt_completed_by text,
  has_shortfall bool DEFAULT false,
  shortfall_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

-- 5. delete_receipts
CREATE TABLE IF NOT EXISTS delete_receipts (
  id text PRIMARY KEY,
  receipt_number text NOT NULL,
  purchase_order_id text PRIMARY KEY,
  delivery_date timestamptz NOT NULL,
  received_by text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  has_discrepancies bool NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft'::text,
  storage_operation_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

-- 6. inventory_documents
CREATE TABLE IF NOT EXISTS inventory_documents (
  id text PRIMARY KEY,
  document_number text NOT NULL,
  inventory_date timestamptz NOT NULL,
  department text NOT NULL,
  item_type text NOT NULL DEFAULT 'product'::text,
  responsible_person text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_items integer NOT NULL DEFAULT 0,
  total_discrepancies integer NOT NULL DEFAULT 0,
  total_value_difference numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'::text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

-- 7. menu_categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid,
  name text NOT NULL,
  name_en text,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost numeric(10,2) DEFAULT 0,
  dish_type text,
  modifier_groups jsonb DEFAULT '[]'::jsonb,
  variants jsonb DEFAULT '[]'::jsonb,
  is_active bool DEFAULT true,
  sort_order integer DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  department text DEFAULT 'kitchen'::text,
  type text DEFAULT 'food'::text
);

-- 9. orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text NOT NULL,
  table_id uuid,
  shift_id uuid,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid'::text,
  payment_method text,
  paid_at timestamptz,
  notes text,
  customer_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  payment_ids text[] DEFAULT '{}'::text[],
  paid_amount numeric(10,2) DEFAULT 0,
  waiter_name text,
  estimated_ready_time timestamptz,
  actual_ready_time timestamptz,
  total_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  final_amount numeric(10,2) DEFAULT 0
);

-- 10. package_options
CREATE TABLE IF NOT EXISTS package_options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  package_name text NOT NULL,
  package_size numeric(10,3) NOT NULL,
  package_unit text NOT NULL,
  brand_name text,
  package_price numeric(10,2),
  base_cost_per_unit numeric(10,2) NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid,
  shift_id uuid,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  transaction_id text,
  receipt_number text,
  processed_at timestamptz,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  payment_number text,
  bill_ids text[] DEFAULT '{}'::text[],
  item_ids text[] DEFAULT '{}'::text[],
  received_amount numeric(10,2),
  change_amount numeric(10,2),
  refunded_at timestamptz,
  refund_reason text,
  refunded_by text,
  original_payment_id uuid,
  reconciled_at timestamptz,
  reconciled_by text,
  receipt_printed bool DEFAULT false,
  sync_status text DEFAULT 'pending'::text,
  synced_at timestamptz,
  processed_by_name text
);

-- 12. pending_payments
CREATE TABLE IF NOT EXISTS pending_payments (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  counteragent_id text PRIMARY KEY,
  counteragent_name text NOT NULL,
  amount numeric(15,2) NOT NULL,
  description text NOT NULL,
  due_date timestamptz,
  priority text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  category text NOT NULL,
  invoice_number text,
  notes text,
  assigned_to_account text,
  created_by jsonb NOT NULL,
  used_amount numeric(15,2) DEFAULT 0,
  linked_orders jsonb DEFAULT '[]'::jsonb,
  source_order_id text,
  last_amount_update timestamptz,
  amount_history jsonb DEFAULT '[]'::jsonb,
  auto_sync_enabled bool DEFAULT false,
  paid_amount numeric(15,2),
  paid_date timestamptz,
  requires_cashier_confirmation bool DEFAULT false,
  confirmation_status text,
  confirmed_by jsonb,
  confirmed_at timestamptz,
  rejection_reason text,
  assigned_shift_id text
);

-- 13. preparation_batches
CREATE TABLE IF NOT EXISTS preparation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_id uuid NOT NULL,
  batch_number text NOT NULL,
  initial_quantity numeric(10,3) NOT NULL,
  current_quantity numeric(10,3) NOT NULL,
  unit text NOT NULL,
  cost_per_unit numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  production_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  department text NOT NULL DEFAULT 'kitchen'::text,
  status text NOT NULL DEFAULT 'active'::text,
  notes text,
  created_by text,
  total_value numeric(10,2) NOT NULL,
  source_type text NOT NULL DEFAULT 'production'::text,
  is_active bool NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL
);

-- 14. preparation_categories
CREATE TABLE IF NOT EXISTS preparation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'mdi-chef-hat'::text,
  emoji text NOT NULL DEFAULT '👨‍🍳'::text,
  color text NOT NULL DEFAULT 'grey-darken-2'::text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 15. preparation_ingredients
CREATE TABLE IF NOT EXISTS preparation_ingredients (
  id text PRIMARY KEY,
  preparation_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'product'::text,
  product_id uuid NOT NULL,
  quantity numeric(10,3) NOT NULL,
  unit text NOT NULL,
  notes text,
  sort_order integer NOT NULL DEFAULT 0
);

-- 16. preparation_inventory_documents
CREATE TABLE IF NOT EXISTS preparation_inventory_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL,
  inventory_date timestamptz NOT NULL DEFAULT now(),
  department text NOT NULL,
  responsible_person text NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  total_items integer NOT NULL DEFAULT 0,
  total_discrepancies integer NOT NULL DEFAULT 0,
  total_value_difference numeric NOT NULL DEFAULT 0,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  items jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- 17. preparation_operations
CREATE TABLE IF NOT EXISTS preparation_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  operation_date timestamptz NOT NULL DEFAULT now(),
  department text NOT NULL,
  responsible_person text,
  items jsonb NOT NULL,
  total_value numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed'::text,
  notes text,
  consumption_details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  document_number text NOT NULL,
  correction_details jsonb,
  write_off_details jsonb,
  related_inventory_id uuid
);

-- 18. preparations
CREATE TABLE IF NOT EXISTS preparations (
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by text,
  updated_by text,
  name text NOT NULL,
  code text,
  description text,
  type text NOT NULL,
  output_quantity numeric(10,3) NOT NULL,
  output_unit text NOT NULL,
  preparation_time integer NOT NULL,
  instructions text NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  cost_per_portion numeric(10,2),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid,
  department text NOT NULL DEFAULT 'kitchen'::text
);

-- 19. products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  name_ru text,
  category text NOT NULL,
  price numeric(10,2) NOT NULL,
  cost numeric(10,2),
  unit text NOT NULL DEFAULT 'pcs'::text,
  sku text,
  barcode text,
  is_active bool NOT NULL DEFAULT true,
  is_available bool NOT NULL DEFAULT true,
  track_stock bool NOT NULL DEFAULT false,
  current_stock numeric(10,3) DEFAULT 0,
  min_stock numeric(10,3) DEFAULT 0,
  description text,
  image_url text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  base_unit text NOT NULL,
  base_cost_per_unit numeric(10,2) NOT NULL,
  yield_percentage integer DEFAULT 100,
  can_be_sold bool DEFAULT false,
  used_in_departments text[] DEFAULT ARRAY['kitchen'::text],
  storage_conditions text,
  shelf_life integer,
  max_stock numeric(10,3),
  name_en text,
  lead_time_days integer,
  primary_supplier_id text,
  recommended_package_id text
);

-- 20. recipe_components
CREATE TABLE IF NOT EXISTS recipe_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  component_id text PRIMARY KEY,
  component_type text NOT NULL,
  quantity numeric(10,3) NOT NULL,
  unit text NOT NULL,
  preparation text,
  is_optional bool DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0
);

-- 21. recipe_steps
CREATE TABLE IF NOT EXISTS recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  step_number integer NOT NULL,
  instruction text NOT NULL,
  duration integer,
  temperature integer,
  equipment text[]
);

-- 22. recipe_write_offs
CREATE TABLE IF NOT EXISTS recipe_write_offs (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sales_transaction_id text,
  menu_item_id uuid,
  variant_id text PRIMARY KEY,
  recipe_id text,
  portion_size numeric NOT NULL,
  sold_quantity numeric NOT NULL,
  write_off_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  decomposed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_composition jsonb NOT NULL DEFAULT '[]'::jsonb,
  department text NOT NULL,
  operation_type text NOT NULL DEFAULT 'auto_sales_writeoff'::text,
  performed_at timestamptz NOT NULL,
  performed_by text NOT NULL,
  storage_operation_id text
);

-- 23. recipes
CREATE TABLE IF NOT EXISTS recipes (
  legacy_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by text,
  updated_by text,
  name text NOT NULL,
  code text,
  description text,
  category text NOT NULL,
  portion_size numeric(10,2) NOT NULL,
  portion_unit text NOT NULL,
  prep_time integer,
  cook_time integer,
  difficulty text NOT NULL DEFAULT 'medium'::text,
  tags text[],
  is_active bool NOT NULL DEFAULT true,
  cost numeric(10,2),
  id uuid NOT NULL DEFAULT gen_random_uuid()
);

-- 24. sales_transactions
CREATE TABLE IF NOT EXISTS sales_transactions (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  payment_id uuid,
  order_id uuid,
  bill_id text PRIMARY KEY,
  item_id text PRIMARY KEY,
  shift_id uuid,
  menu_item_id uuid,
  menu_item_name text NOT NULL,
  variant_id text PRIMARY KEY,
  variant_name text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  payment_method text NOT NULL,
  sold_at timestamptz NOT NULL,
  processed_by text NOT NULL,
  recipe_id text,
  recipe_write_off_id text,
  profit_calculation jsonb NOT NULL,
  decomposition_summary jsonb NOT NULL,
  synced_to_backoffice bool DEFAULT true,
  synced_at timestamptz,
  department text NOT NULL
);

-- 25. shifts
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_number integer NOT NULL,
  cashier_id uuid,
  cashier_name text NOT NULL,
  status text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  total_sales numeric(10,2) NOT NULL DEFAULT 0,
  total_cash numeric(10,2) NOT NULL DEFAULT 0,
  total_card numeric(10,2) NOT NULL DEFAULT 0,
  total_qr numeric(10,2) NOT NULL DEFAULT 0,
  payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  corrections jsonb NOT NULL DEFAULT '[]'::jsonb,
  expense_operations jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_to_account bool NOT NULL DEFAULT false,
  synced_at timestamptz,
  account_transaction_ids text[],
  sync_error text,
  sync_attempts integer DEFAULT 0,
  last_sync_attempt timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  starting_cash numeric(10,2) NOT NULL DEFAULT 0,
  starting_cash_verified bool NOT NULL DEFAULT true,
  ending_cash numeric(10,2),
  expected_cash numeric(10,2),
  cash_discrepancy numeric(10,2),
  cash_discrepancy_type text,
  total_transactions integer NOT NULL DEFAULT 0,
  duration integer,
  notes text,
  device_id text,
  location text,
  account_balances jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_payments jsonb NOT NULL DEFAULT '[]'::jsonb,
  sync_status text NOT NULL DEFAULT 'pending'::text,
  last_sync_at timestamptz,
  pending_sync bool NOT NULL DEFAULT false,
  sync_queued_at timestamptz
);

-- 26. storage_batches
CREATE TABLE IF NOT EXISTS storage_batches (
  id text PRIMARY KEY,
  batch_number text NOT NULL,
  item_id text PRIMARY KEY,
  item_type text NOT NULL DEFAULT 'product'::text,
  warehouse_id text PRIMARY KEY,
  initial_quantity numeric NOT NULL,
  current_quantity numeric NOT NULL,
  unit text NOT NULL,
  cost_per_unit numeric NOT NULL,
  total_value numeric NOT NULL,
  receipt_date timestamptz NOT NULL,
  expiry_date timestamptz,
  source_type text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  is_active bool NOT NULL DEFAULT true,
  notes text,
  purchase_order_id text,
  supplier_id text,
  supplier_name text,
  planned_delivery_date timestamptz,
  actual_delivery_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 27. storage_operations
CREATE TABLE IF NOT EXISTS storage_operations (
  id text PRIMARY KEY,
  operation_type text NOT NULL,
  document_number text NOT NULL,
  operation_date timestamptz NOT NULL,
  department text NOT NULL,
  responsible_person text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_value numeric,
  correction_details jsonb,
  write_off_details jsonb,
  related_inventory_id text,
  status text NOT NULL DEFAULT 'draft'::text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  warehouse_id text
);

-- 28. supplierstore_order_items
CREATE TABLE IF NOT EXISTS supplierstore_order_items (
  id text PRIMARY KEY,
  order_id text PRIMARY KEY,
  item_id text PRIMARY KEY,
  item_name text NOT NULL,
  ordered_quantity numeric(10,3) NOT NULL,
  received_quantity numeric(10,3),
  unit text NOT NULL,
  package_id text PRIMARY KEY,
  package_name text NOT NULL,
  package_quantity numeric(10,3) NOT NULL,
  package_unit text NOT NULL,
  price_per_unit numeric(12,2) NOT NULL DEFAULT 0,
  package_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  is_estimated_price bool NOT NULL DEFAULT false,
  last_price_date timestamptz,
  status text NOT NULL DEFAULT 'ordered'::text
);

-- 29. supplierstore_orders
CREATE TABLE IF NOT EXISTS supplierstore_orders (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by text,
  updated_by text,
  order_number text NOT NULL,
  supplier_id text PRIMARY KEY,
  supplier_name text NOT NULL,
  order_date timestamptz NOT NULL DEFAULT now(),
  expected_delivery_date timestamptz,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  is_estimated_total bool NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft'::text,
  bill_status text NOT NULL DEFAULT 'not_billed'::text,
  bill_status_calculated_at timestamptz,
  request_ids jsonb DEFAULT '[]'::jsonb,
  receipt_id text,
  bill_id text,
  original_total_amount numeric(12,2),
  actual_delivered_amount numeric(12,2),
  receipt_discrepancies jsonb DEFAULT '[]'::jsonb,
  has_receipt_discrepancies bool DEFAULT false,
  receipt_completed_at timestamptz,
  receipt_completed_by text,
  has_shortfall bool DEFAULT false,
  shortfall_amount numeric(12,2),
  notes text
);

-- 30. supplierstore_receipt_items
CREATE TABLE IF NOT EXISTS supplierstore_receipt_items (
  id text PRIMARY KEY,
  receipt_id text PRIMARY KEY,
  order_item_id text PRIMARY KEY,
  item_id text PRIMARY KEY,
  item_name text NOT NULL,
  ordered_quantity numeric(10,3) NOT NULL,
  received_quantity numeric(10,3) NOT NULL,
  unit text NOT NULL,
  package_id text PRIMARY KEY,
  package_name text NOT NULL,
  ordered_package_quantity numeric(10,3) NOT NULL,
  received_package_quantity numeric(10,3) NOT NULL,
  package_unit text NOT NULL,
  ordered_price numeric(12,2) NOT NULL,
  actual_price numeric(12,2),
  ordered_base_cost numeric(12,2) NOT NULL,
  actual_base_cost numeric(12,2),
  notes text
);

-- 31. supplierstore_receipts
CREATE TABLE IF NOT EXISTS supplierstore_receipts (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by text,
  updated_by text,
  receipt_number text NOT NULL,
  purchase_order_id text PRIMARY KEY,
  delivery_date timestamptz NOT NULL DEFAULT now(),
  received_by text NOT NULL,
  has_discrepancies bool NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft'::text,
  storage_operation_id text,
  notes text
);

-- 32. supplierstore_request_items
CREATE TABLE IF NOT EXISTS supplierstore_request_items (
  id text PRIMARY KEY,
  request_id text PRIMARY KEY,
  item_id text PRIMARY KEY,
  item_name text NOT NULL,
  requested_quantity numeric(10,3) NOT NULL,
  unit text NOT NULL,
  package_id text,
  package_name text,
  package_quantity numeric(10,3),
  estimated_price numeric(12,2),
  priority text,
  category text,
  notes text
);

-- 33. supplierstore_requests
CREATE TABLE IF NOT EXISTS supplierstore_requests (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by text,
  updated_by text,
  request_number text NOT NULL,
  department text NOT NULL,
  requested_by text NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  priority text NOT NULL DEFAULT 'normal'::text,
  purchase_order_ids jsonb DEFAULT '[]'::jsonb,
  notes text
);

-- 34. tables
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number text NOT NULL,
  area text,
  capacity integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'available'::text,
  current_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 35. transactions
CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  account_id text PRIMARY KEY,
  type text NOT NULL,
  amount numeric(15,2) NOT NULL,
  description text NOT NULL,
  balance_after numeric(15,2) NOT NULL,
  expense_category jsonb,
  counteragent_id text,
  counteragent_name text,
  related_order_ids text[] DEFAULT ARRAY[]::text[],
  related_payment_id text,
  performed_by jsonb NOT NULL,
  status text NOT NULL DEFAULT 'completed'::text,
  transfer_details jsonb,
  is_correction bool DEFAULT false
);

-- 36. warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- ADD PRIMARY KEYS
-- ============================================================================


-- ============================================================================
-- DROP EXISTING RLS POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Allow all for authenticated users" ON accounts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON counteragents;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_categories;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_items;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON orders;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON products;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON recipes;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON tables;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;


-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_estimated_ready_time ON orders(estimated_ready_time);
CREATE INDEX IF NOT EXISTS idx_orders_payment_ids ON orders USING gin(payment_ids);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shift_id ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter_name ON orders(waiter_name);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON orders(order_number);

-- Package options indexes
CREATE INDEX IF NOT EXISTS idx_package_options_is_active ON package_options(is_active);
CREATE INDEX IF NOT EXISTS idx_package_options_product_id ON package_options(product_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_bill_ids ON payments USING gin(bill_ids);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_item_ids ON payments USING gin(item_ids);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_original_payment_id ON payments(original_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_processed_by_name ON payments(processed_by_name);
CREATE INDEX IF NOT EXISTS idx_payments_shift_id ON payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON payments(sync_status);
CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_number_key ON payments(payment_number);

-- Pending payments indexes
CREATE INDEX IF NOT EXISTS idx_pending_payments_confirmation_status ON pending_payments(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_counteragent_id ON pending_payments(counteragent_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_due_date ON pending_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_pending_payments_priority ON pending_payments(priority);
CREATE INDEX IF NOT EXISTS idx_pending_payments_source_order_id ON pending_payments(source_order_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON pending_payments(status);

-- Preparation batches indexes
CREATE INDEX IF NOT EXISTS idx_preparation_batches_department ON preparation_batches(department);
CREATE INDEX IF NOT EXISTS idx_preparation_batches_expires_at ON preparation_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_preparation_batches_preparation_id ON preparation_batches(preparation_id);
CREATE INDEX IF NOT EXISTS idx_preparation_batches_status ON preparation_batches(status);

-- Preparation categories indexes
CREATE INDEX IF NOT EXISTS idx_preparation_categories_active ON preparation_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_preparation_categories_key ON preparation_categories(key);
CREATE INDEX IF NOT EXISTS idx_preparation_categories_sort ON preparation_categories(sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS preparation_categories_key_key ON preparation_categories(key);

-- Preparation ingredients indexes
CREATE INDEX IF NOT EXISTS idx_preparation_ingredients_preparation_id ON preparation_ingredients(preparation_id);
CREATE INDEX IF NOT EXISTS idx_preparation_ingredients_product_id ON preparation_ingredients(product_id);

-- Preparation inventory documents indexes
CREATE INDEX IF NOT EXISTS idx_preparation_inventory_documents_date ON preparation_inventory_documents(inventory_date);
CREATE INDEX IF NOT EXISTS idx_preparation_inventory_documents_department ON preparation_inventory_documents(department);
CREATE INDEX IF NOT EXISTS idx_preparation_inventory_documents_status ON preparation_inventory_documents(status);
CREATE UNIQUE INDEX IF NOT EXISTS preparation_inventory_documents_unique_number ON preparation_inventory_documents(document_number);

-- Preparation operations indexes
CREATE INDEX IF NOT EXISTS idx_preparation_operations_date ON preparation_operations(operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_preparation_operations_department ON preparation_operations(department);
CREATE INDEX IF NOT EXISTS idx_preparation_operations_status ON preparation_operations(status);
CREATE INDEX IF NOT EXISTS idx_preparation_operations_type ON preparation_operations(operation_type);

-- Preparations indexes
CREATE INDEX IF NOT EXISTS idx_preparations_category_id ON preparations(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preparations_code ON preparations(code);
CREATE INDEX IF NOT EXISTS idx_preparations_department ON preparations(department);
CREATE INDEX IF NOT EXISTS idx_preparations_is_active ON preparations(is_active);
CREATE INDEX IF NOT EXISTS idx_preparations_type ON preparations(type);
CREATE UNIQUE INDEX IF NOT EXISTS preparations_code_key ON preparations(code);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_base_unit ON products(base_unit);
CREATE INDEX IF NOT EXISTS idx_products_can_be_sold ON products(can_be_sold);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_used_in_departments ON products USING gin(used_in_departments);

-- Recipe components indexes
CREATE INDEX IF NOT EXISTS idx_recipe_components_component_id ON recipe_components(component_id);
CREATE INDEX IF NOT EXISTS idx_recipe_components_recipe_id ON recipe_components(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_components_sort_order ON recipe_components(recipe_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_recipe_components_type ON recipe_components(component_type);
CREATE UNIQUE INDEX IF NOT EXISTS recipe_components_unique_sort_order ON recipe_components(recipe_id, sort_order);

-- Recipe steps indexes
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_step_number ON recipe_steps(recipe_id, step_number);
CREATE UNIQUE INDEX IF NOT EXISTS recipe_steps_recipe_id_step_number_key ON recipe_steps(recipe_id, step_number);

-- Recipe write-offs indexes
CREATE INDEX IF NOT EXISTS idx_recipe_write_offs_department ON recipe_write_offs(department);
CREATE INDEX IF NOT EXISTS idx_recipe_write_offs_menu_item ON recipe_write_offs(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_write_offs_performed_at ON recipe_write_offs(performed_at);
CREATE INDEX IF NOT EXISTS idx_recipe_write_offs_sales_transaction ON recipe_write_offs(sales_transaction_id);
CREATE INDEX IF NOT EXISTS idx_recipe_write_offs_storage_operation ON recipe_write_offs(storage_operation_id);

-- Recipes indexes
CREATE INDEX IF NOT EXISTS idx_recipes_active ON recipes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_code ON recipes(code);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_is_active ON recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_recipes_updated ON recipes(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS recipes_code_unique ON recipes(code);

-- Sales transactions indexes
CREATE INDEX IF NOT EXISTS idx_sales_transactions_department ON sales_transactions(department);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_menu_item ON sales_transactions(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_payment ON sales_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_payment_method ON sales_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_shift ON sales_transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_sold_at ON sales_transactions(sold_at);

-- Shifts indexes
CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id ON shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_created_at ON shifts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);

-- Storage batches indexes
CREATE INDEX IF NOT EXISTS idx_storage_batches_item_warehouse ON storage_batches(item_id, warehouse_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_storage_batches_status ON storage_batches(status);
CREATE INDEX IF NOT EXISTS idx_storage_batches_warehouse_status ON storage_batches(warehouse_id, status, receipt_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS storage_batches_batch_number_key ON storage_batches(batch_number);

-- Storage operations indexes
CREATE INDEX IF NOT EXISTS idx_storage_operations_date ON storage_operations(operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_storage_operations_department ON storage_operations(department);
CREATE INDEX IF NOT EXISTS idx_storage_operations_type ON storage_operations(operation_type, operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_storage_operations_type_status ON storage_operations(operation_type, status);
CREATE UNIQUE INDEX IF NOT EXISTS storage_operations_document_number_key ON storage_operations(document_number);

-- Supplierstore orders indexes
CREATE INDEX IF NOT EXISTS idx_supplierstore_orders_bill_status ON supplierstore_orders(bill_status);
CREATE INDEX IF NOT EXISTS idx_supplierstore_orders_date ON supplierstore_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplierstore_orders_status ON supplierstore_orders(status, bill_status);
CREATE INDEX IF NOT EXISTS idx_supplierstore_orders_supplier ON supplierstore_orders(supplier_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS supplierstore_orders_order_number_key ON supplierstore_orders(order_number);

-- Supplierstore order items indexes
CREATE INDEX IF NOT EXISTS idx_supplierstore_order_items_item ON supplierstore_order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_supplierstore_order_items_order ON supplierstore_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_supplierstore_order_items_status ON supplierstore_order_items(status);

-- Supplierstore receipts indexes
CREATE INDEX IF NOT EXISTS idx_supplierstore_receipts_date ON supplierstore_receipts(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplierstore_receipts_discrepancies ON supplierstore_receipts(has_discrepancies);
CREATE INDEX IF NOT EXISTS idx_supplierstore_receipts_order ON supplierstore_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplierstore_receipts_status ON supplierstore_receipts(status);
CREATE UNIQUE INDEX IF NOT EXISTS supplierstore_receipts_receipt_number_key ON supplierstore_receipts(receipt_number);

-- Supplierstore receipt items indexes
CREATE INDEX IF NOT EXISTS idx_supplierstore_receipt_items_item ON supplierstore_receipt_items(item_id);
CREATE INDEX IF NOT EXISTS idx_supplierstore_receipt_items_order_item ON supplierstore_receipt_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_supplierstore_receipt_items_receipt ON supplierstore_receipt_items(receipt_id);

-- Supplierstore requests indexes
CREATE INDEX IF NOT EXISTS idx_supplierstore_requests_created_at ON supplierstore_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplierstore_requests_dept ON supplierstore_requests(department, status);
CREATE INDEX IF NOT EXISTS idx_supplierstore_requests_status ON supplierstore_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS supplierstore_requests_request_number_key ON supplierstore_requests(request_number);

-- Supplierstore request items indexes
CREATE INDEX IF NOT EXISTS idx_supplierstore_request_items_item ON supplierstore_request_items(item_id);
CREATE INDEX IF NOT EXISTS idx_supplierstore_request_items_request ON supplierstore_request_items(request_id);

-- Tables indexes
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE UNIQUE INDEX IF NOT EXISTS tables_table_number_key ON tables(table_number);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_counteragent_id ON transactions(counteragent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_related_payment_id ON transactions(related_payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Warehouses indexes
CREATE UNIQUE INDEX IF NOT EXISTS warehouses_code_key ON warehouses(code);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (Basic setup - customize per requirements)
-- ============================================================================

-- Enable RLS on core tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE counteragents ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy: Allow all for authenticated users (customize later!)
CREATE POLICY "Allow all for authenticated users" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON counteragents FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON menu_categories FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON menu_items FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON recipes FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON tables FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON transactions FOR ALL USING (true);

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

SELECT '✅ MIGRATION COMPLETE!' AS status;
SELECT 'Total tables created:' AS info, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public';

SELECT 'Total indexes created:' AS info, COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey';

