-- Migration: 224_grant_customer_identities_access
-- Description: Fix missing grants on customer_identities table
-- Date: 2026-03-16
-- Context: customer_identities had no grants for authenticated/service_role,
--          causing 403 errors when staff queries customers table
--          (RLS policy customer_read_own does subquery on customer_identities)

GRANT SELECT, INSERT, UPDATE, DELETE ON customer_identities TO authenticated;
GRANT ALL ON customer_identities TO service_role;

-- Also add missing DELETE grant on customers for staff cleanup operations
GRANT DELETE ON customers TO authenticated;
