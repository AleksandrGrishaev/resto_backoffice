-- Migration: 300_customers_status_allow_merged
-- Description: Add 'merged' to customers.status check constraint
-- Date: 2026-04-21
--
-- CONTEXT: migration 271_rpc_merge_customers sets source.status='merged'
-- when merging duplicates, but the check constraint only permitted
-- ('active','blocked'). As a result merge_customers has failed with
-- "violates check constraint customers_status_check" on both DEV and PROD
-- since day 1 — no customer has ever been successfully merged.

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_status_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'blocked'::text, 'merged'::text]));
