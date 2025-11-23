-- Migration: Enable Row Level Security (RLS) Policies
-- Purpose: Secure all tables with proper access control
-- CRITICAL for production security!

-- ============================================
-- USERS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on users table
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY IF NOT EXISTS "users_view_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY IF NOT EXISTS "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY IF NOT EXISTS "admins_view_all_users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.roles)
    )
  );

-- Admins can create new users
CREATE POLICY IF NOT EXISTS "admins_create_users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.roles)
    )
  );

-- Admins can update any user
CREATE POLICY IF NOT EXISTS "admins_update_users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.roles)
    )
  );

-- ============================================
-- PRODUCTS TABLE RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;

-- Everyone can view products (needed for POS)
CREATE POLICY IF NOT EXISTS "products_select_all" ON products
  FOR SELECT
  USING (true);

-- Only admin/manager can insert products
CREATE POLICY IF NOT EXISTS "products_insert_admin" ON products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin/manager can update products
CREATE POLICY IF NOT EXISTS "products_update_admin" ON products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin can delete products
CREATE POLICY IF NOT EXISTS "products_delete_admin" ON products
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================
-- ORDERS TABLE RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

-- POS users (admin, cashier, manager) can view all orders
CREATE POLICY IF NOT EXISTS "orders_select_pos_users" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- POS users can create orders
CREATE POLICY IF NOT EXISTS "orders_insert_pos_users" ON orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- POS users can update orders
CREATE POLICY IF NOT EXISTS "orders_update_pos_users" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin can delete orders
CREATE POLICY IF NOT EXISTS "orders_delete_admin" ON orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================
-- ORDER_ITEMS TABLE RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;

-- POS users can view order items
CREATE POLICY IF NOT EXISTS "order_items_select_pos" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- POS users can insert order items
CREATE POLICY IF NOT EXISTS "order_items_insert_pos" ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- POS users can update order items
CREATE POLICY IF NOT EXISTS "order_items_update_pos" ON order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin can delete order items
CREATE POLICY IF NOT EXISTS "order_items_delete_admin" ON order_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================
-- PAYMENTS TABLE RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;

-- POS users can view payments
CREATE POLICY IF NOT EXISTS "payments_select_pos" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- POS users can create payments
CREATE POLICY IF NOT EXISTS "payments_insert_pos" ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin/manager can update payments (for corrections)
CREATE POLICY IF NOT EXISTS "payments_update_admin" ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin can delete payments
CREATE POLICY IF NOT EXISTS "payments_delete_admin" ON payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================
-- SHIFTS TABLE RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS shifts ENABLE ROW LEVEL SECURITY;

-- Users can view their own shifts
CREATE POLICY IF NOT EXISTS "shifts_view_own" ON shifts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Cashiers can create shifts
CREATE POLICY IF NOT EXISTS "shifts_insert_cashier" ON shifts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- Users can update their own shifts (for closing)
CREATE POLICY IF NOT EXISTS "shifts_update_own" ON shifts
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin can delete shifts
CREATE POLICY IF NOT EXISTS "shifts_delete_admin" ON shifts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================
-- TABLES TABLE RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS tables ENABLE ROW LEVEL SECURITY;

-- POS users can view tables
CREATE POLICY IF NOT EXISTS "tables_select_pos" ON tables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles)
           OR 'cashier' = ANY(users.roles)
           OR 'manager' = ANY(users.roles))
    )
  );

-- Admin/manager can create tables
CREATE POLICY IF NOT EXISTS "tables_insert_admin" ON tables
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Admin/manager can update tables
CREATE POLICY IF NOT EXISTS "tables_update_admin" ON tables
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin can delete tables
CREATE POLICY IF NOT EXISTS "tables_delete_admin" ON tables
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================
-- RECIPES TABLE RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS recipes ENABLE ROW LEVEL SECURITY;

-- Everyone can view recipes (needed for production/kitchen)
CREATE POLICY IF NOT EXISTS "recipes_select_all" ON recipes
  FOR SELECT
  USING (true);

-- Admin/manager can create recipes
CREATE POLICY IF NOT EXISTS "recipes_insert_admin" ON recipes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Admin/manager can update recipes
CREATE POLICY IF NOT EXISTS "recipes_update_admin" ON recipes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

-- Only admin can delete recipes
CREATE POLICY IF NOT EXISTS "recipes_delete_admin" ON recipes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================
-- MENU TABLE RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS menu ENABLE ROW LEVEL SECURITY;

-- Everyone can view menu (needed for POS)
CREATE POLICY IF NOT EXISTS "menu_select_all" ON menu
  FOR SELECT
  USING (true);

-- Admin/manager can modify menu
CREATE POLICY IF NOT EXISTS "menu_insert_admin" ON menu
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

CREATE POLICY IF NOT EXISTS "menu_update_admin" ON menu
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ('admin' = ANY(users.roles) OR 'manager' = ANY(users.roles))
    )
  );

CREATE POLICY IF NOT EXISTS "menu_delete_admin" ON menu
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- All tables should show rowsecurity = true

-- ============================================
-- NOTES
-- ============================================

-- These RLS policies ensure:
-- 1. Users can only see their own data (unless admin)
-- 2. Financial data (payments, shifts) is strictly controlled
-- 3. POS operations work for cashiers and managers
-- 4. Kitchen and production staff can view needed data
-- 5. Only admins can delete critical data

-- IMPORTANT: In development, you can temporarily disable RLS:
-- ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
--
-- But NEVER disable RLS in production!
