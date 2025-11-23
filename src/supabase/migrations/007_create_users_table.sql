-- Migration 007: Create Users Table for Authentication
-- Purpose: Support three authentication methods:
--   1. Email + Password (admin/manager) - Supabase Auth
--   2. PIN (cashier) - Quick POS login
--   3. KITCHEN PIN (bar/kitchen) - Quick kitchen/bar login
-- Author: Phase 4 - Authentication Migration
-- Date: 2025-11-23

-- ============================================================================
-- EXTENSION: pgcrypto for PIN hashing
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TABLE: users (public schema)
-- Extends auth.users with roles, PIN authentication, and profile data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  -- Primary key linked to Supabase Auth
  id UUID PRIMARY KEY,

  -- Basic profile information
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,

  -- PIN authentication for quick login
  -- Hashed using crypt() for security
  pin_hash TEXT,

  -- User roles (can have multiple)
  -- Supported: admin, manager, cashier, waiter, kitchen, bar
  roles TEXT[] NOT NULL DEFAULT '{}',

  -- User status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Login tracking
  last_login_at TIMESTAMPTZ,

  -- Metadata
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_roles CHECK (
    roles <@ ARRAY['admin', 'manager', 'cashier', 'waiter', 'kitchen', 'bar']::TEXT[]
  ),
  CONSTRAINT email_or_pin CHECK (
    email IS NOT NULL OR pin_hash IS NOT NULL
  )
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin_hash) WHERE pin_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================================================
-- FUNCTION: authenticate_with_pin
-- Purpose: Authenticate users via PIN (cashier, kitchen, bar)
-- Returns: User profile data if PIN is valid
-- Security: SECURITY DEFINER to bypass RLS for authentication
-- ============================================================================
CREATE OR REPLACE FUNCTION authenticate_with_pin(pin_input TEXT)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_roles TEXT[],
  user_avatar TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  found_user users%ROWTYPE;
BEGIN
  -- Find user with matching PIN (using crypt for secure comparison)
  SELECT * INTO found_user
  FROM users
  WHERE pin_hash = crypt(pin_input, pin_hash)
    AND is_active = true
  LIMIT 1;

  -- If no user found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Update last login timestamp
  UPDATE users
  SET last_login_at = NOW()
  WHERE id = found_user.id;

  -- Return user profile data
  RETURN QUERY
  SELECT
    found_user.id,
    found_user.name,
    found_user.email,
    found_user.roles,
    found_user.avatar_url;
END;
$$;

-- ============================================================================
-- FUNCTION: create_user_with_pin
-- Purpose: Create a new user with PIN authentication (helper for migration)
-- Security: SECURITY DEFINER to allow user creation
-- ============================================================================
CREATE OR REPLACE FUNCTION create_user_with_pin(
  p_name TEXT,
  p_pin TEXT,
  p_roles TEXT[],
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
  pin_salt TEXT;
BEGIN
  -- Generate new UUID for user
  new_user_id := gen_random_uuid();

  -- Insert user with hashed PIN
  INSERT INTO users (id, name, email, pin_hash, roles, is_active)
  VALUES (
    new_user_id,
    p_name,
    p_email,
    crypt(p_pin, gen_salt('bf')), -- Blowfish hashing
    p_roles,
    true
  );

  RETURN new_user_id;
END;
$$;

-- ============================================================================
-- FUNCTION: update_user_pin
-- Purpose: Update user PIN (for cashier/kitchen users)
-- Security: SECURITY DEFINER to allow PIN updates
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_pin(
  p_user_id UUID,
  p_new_pin TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update PIN with new hash
  UPDATE users
  SET pin_hash = crypt(p_new_pin, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id
    AND is_active = true;

  -- Return success if row was updated
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- RLS POLICIES (will be enhanced in migration 006_enable_rls_policies.sql)
-- ============================================================================
-- Note: RLS policies are already defined in migration 006
-- This ensures users table has RLS enabled from the start
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Basic policy: Users can view their own profile
CREATE POLICY IF NOT EXISTS "users_view_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Basic policy: Users can update their own profile
CREATE POLICY IF NOT EXISTS "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON TABLE users IS 'User profiles with support for email and PIN authentication';
COMMENT ON COLUMN users.id IS 'User ID (can link to auth.users for email auth)';
COMMENT ON COLUMN users.pin_hash IS 'Bcrypt-hashed PIN for quick login (cashier/kitchen)';
COMMENT ON COLUMN users.roles IS 'User roles: admin, manager, cashier, waiter, kitchen, bar';
COMMENT ON FUNCTION authenticate_with_pin IS 'Authenticate user via PIN and return profile data';
COMMENT ON FUNCTION create_user_with_pin IS 'Helper function to create PIN-based users';
COMMENT ON FUNCTION update_user_pin IS 'Update user PIN securely';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify table creation:
-- SELECT * FROM users;
-- SELECT * FROM pg_indexes WHERE tablename = 'users';
-- SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%pin%';

-- ============================================================================
-- SEED DATA (example)
-- ============================================================================
-- Example: Create a cashier with PIN
-- SELECT create_user_with_pin('Cashier 1', '1234', ARRAY['cashier']::TEXT[]);

-- Example: Create kitchen staff with PIN
-- SELECT create_user_with_pin('Kitchen Staff', '5678', ARRAY['kitchen']::TEXT[]);

-- Example: Create bar staff with PIN
-- SELECT create_user_with_pin('Bartender', '9999', ARRAY['bar']::TEXT[]);
