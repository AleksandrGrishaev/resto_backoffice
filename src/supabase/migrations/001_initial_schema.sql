-- Sprint 7: Initial Supabase Schema for Kitchen App MVP
-- Critical entities: shifts, orders, payments, products, tables
-- Run this SQL in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: shifts
-- Cashier shift management with financial tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_number INTEGER NOT NULL,
  cashier_id UUID REFERENCES auth.users(id),
  cashier_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,

  -- Totals
  total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_card DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_qr DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Payment methods (JSONB)
  payment_methods JSONB NOT NULL DEFAULT '[]',

  -- Corrections & Expenses (JSONB)
  corrections JSONB NOT NULL DEFAULT '[]',
  expense_operations JSONB NOT NULL DEFAULT '[]',

  -- Sync info
  synced_to_account BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ,
  account_transaction_ids TEXT[],
  sync_error TEXT,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_cashier_id ON shifts(cashier_id);
CREATE INDEX idx_shifts_created_at ON shifts(created_at DESC);

-- ============================================================================
-- TABLE: tables
-- Restaurant tables for dine-in orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number TEXT NOT NULL UNIQUE,
  area TEXT,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  current_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_tables_status ON tables(status);

-- ============================================================================
-- TABLE: orders
-- Customer orders (dine-in, takeaway, delivery)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('dine_in', 'takeaway', 'delivery')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'paid', 'cancelled')),

  -- Items (JSONB array)
  items JSONB NOT NULL DEFAULT '[]',

  -- Totals
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Payment info
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,
  customer_name TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for faster lookups
CREATE INDEX idx_orders_shift_id ON orders(shift_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================================================
-- TABLE: payments
-- Payment records for orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,

  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'qr', 'mixed')),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Payment details (JSONB for flexibility)
  details JSONB NOT NULL DEFAULT '{}',

  -- References
  transaction_id TEXT,
  receipt_number TEXT,

  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_shift_id ON payments(shift_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ============================================================================
-- TABLE: products
-- Product catalog (menu items, ingredients, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ru TEXT,
  category TEXT NOT NULL,

  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),

  unit TEXT NOT NULL DEFAULT 'pcs',
  sku TEXT,
  barcode TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,

  -- Stock info
  track_stock BOOLEAN NOT NULL DEFAULT false,
  current_stock DECIMAL(10, 3) DEFAULT 0,
  min_stock DECIMAL(10, 3) DEFAULT 0,

  -- Metadata
  description TEXT,
  image_url TEXT,
  tags TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_products_name ON products(name);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- MVP: Simple policies - all authenticated users can access all data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Shifts policies
CREATE POLICY "Authenticated users can view all shifts"
  ON shifts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create shifts"
  ON shifts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update shifts"
  ON shifts FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Tables policies
CREATE POLICY "Authenticated users can view all tables"
  ON tables FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage tables"
  ON tables FOR ALL
  USING (auth.role() = 'authenticated');

-- Orders policies
CREATE POLICY "Authenticated users can view all orders"
  ON orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  USING (auth.role() = 'authenticated');

-- Payments policies
CREATE POLICY "Authenticated users can view all payments"
  ON payments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create payments"
  ON payments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update payments"
  ON payments FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Products policies
CREATE POLICY "Authenticated users can view all products"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage products"
  ON products FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE shifts IS 'Cashier shifts with financial tracking and sync status';
COMMENT ON TABLE tables IS 'Restaurant tables for dine-in orders';
COMMENT ON TABLE orders IS 'Customer orders (dine-in, takeaway, delivery)';
COMMENT ON TABLE payments IS 'Payment records for orders';
COMMENT ON TABLE products IS 'Product catalog (menu items, ingredients, etc.)';

-- ============================================================================
-- INITIAL DATA (Optional - for testing)
-- ============================================================================

-- Insert sample tables (can be removed in production)
INSERT INTO tables (table_number, area, capacity, status) VALUES
  ('T1', 'Main Hall', 4, 'available'),
  ('T2', 'Main Hall', 4, 'available'),
  ('T3', 'Main Hall', 2, 'available'),
  ('T4', 'Terrace', 6, 'available'),
  ('T5', 'Terrace', 4, 'available')
ON CONFLICT (table_number) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
SELECT 'Migration complete! Tables created:' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('shifts', 'tables', 'orders', 'payments', 'products')
ORDER BY table_name;
