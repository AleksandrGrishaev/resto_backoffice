-- Migration: Cleanup unused category_id column from preparations
-- Created: 2025-11-24
-- Description: Remove duplicate category_id column (type is the correct one)
-- Applied to DEV: 2025-11-24
-- Applied to PROD: [PENDING]

-- =============================================
-- CONTEXT
-- =============================================
-- The preparations table has two columns that reference preparation_categories:
--   1. type (NOT NULL) - created by migration 009, correct column
--   2. category_id (nullable) - legacy column, duplicate
--
-- Both columns are foreign keys to preparation_categories.id
-- This migration removes the duplicate category_id column

-- =============================================
-- MIGRATION
-- =============================================

-- Drop the unused category_id column
ALTER TABLE preparations DROP COLUMN IF EXISTS category_id;

-- Add comment to clarify the correct column
COMMENT ON COLUMN preparations.type IS 'Reference to preparation_categories.id (category_id was removed as duplicate)';

-- =============================================
-- VERIFICATION
-- =============================================
-- After migration, verify:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'preparations'
--   AND column_name IN ('type', 'category_id');
--
-- Expected result: only 'type' should exist
