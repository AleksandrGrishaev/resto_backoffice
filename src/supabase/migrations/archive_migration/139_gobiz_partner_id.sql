-- Migration: 139_gobiz_partner_id
-- Description: Add partner_id for facilitator (POS partner) model, make outlet_id nullable
-- Date: 2026-02-05

-- CONTEXT: GoBiz facilitator model uses partner_id to identify the POS partner.
-- Outlets are linked after authentication, so outlet_id should be nullable.

-- Add partner_id column
ALTER TABLE gobiz_config ADD COLUMN IF NOT EXISTS partner_id TEXT;

-- Make outlet_id nullable (facilitator model gets outlets after auth)
ALTER TABLE gobiz_config ALTER COLUMN outlet_id DROP NOT NULL;
ALTER TABLE gobiz_config ALTER COLUMN outlet_id SET DEFAULT '';
