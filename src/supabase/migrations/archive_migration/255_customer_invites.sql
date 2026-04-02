-- Migration: 255_customer_invites
-- Description: Unified invite table for customer and order QR invite flows
-- Date: 2026-03-26
--
-- CONTEXT: Two QR invite flows:
-- 'customer' — staff creates invite for existing POS customer (30 day TTL)
-- 'order' — auto-generated on pre-bill for orders without customer (2 hour TTL)
-- Customer scans QR → registers on website → gets linked to order/customer

CREATE TABLE IF NOT EXISTS public.customer_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('customer', 'order')),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired')),
  claimed_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,

  CONSTRAINT invite_has_target CHECK (
    (type = 'customer' AND customer_id IS NOT NULL) OR
    (type = 'order' AND order_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON customer_invites (token) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_invites_customer ON customer_invites (customer_id);
CREATE INDEX IF NOT EXISTS idx_invites_order ON customer_invites (order_id);

-- RLS
ALTER TABLE customer_invites ENABLE ROW LEVEL SECURITY;

-- Staff full access
CREATE POLICY "staff_all" ON customer_invites
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- NO anon SELECT policy — token lookup is handled by get_invite_by_token() SECURITY DEFINER RPC
-- This prevents enumeration of active invites

-- Grant service_role access (Edge Functions)
GRANT ALL ON customer_invites TO service_role;

-- Ensure pgcrypto is available (needed by RPCs for token generation)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
