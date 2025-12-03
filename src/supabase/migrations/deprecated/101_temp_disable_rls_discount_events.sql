-- Migration: 101_temp_disable_rls_discount_events
-- Description: TEMPORARY - Disable RLS on discount_events to test if auth is working
-- Date: 2025-12-04
-- Author: Claude Code
-- IMPORTANT: This is for TESTING ONLY, will re-enable RLS after confirming root cause

-- CONTEXT:
-- Orders, payments, shifts all work fine (RLS passes)
-- Only discount_events fails with 403
-- This means JWT token IS present and valid
-- Need to test if RLS is the blocker or something else

-- Temporarily disable RLS
ALTER TABLE discount_events DISABLE ROW LEVEL SECURITY;

-- TESTING PLAN:
-- 1. Try to create bill discount after this migration
-- 2. If it works → problem is RLS policy logic
-- 3. If it fails → problem is elsewhere (validation, constraint, etc.)

-- ROLLBACK (re-enable RLS after testing):
-- ALTER TABLE discount_events ENABLE ROW LEVEL SECURITY;
