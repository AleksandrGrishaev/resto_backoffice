-- Migration: 046_add_related_storage_operation_ids
-- Description: Add missing column for linking preparation operations to storage write-offs
-- Date: 2025-12-11
--
-- CONTEXT: The code was updated to include relatedStorageOperationIds field in
-- preparation operations, but the column was never added to the database.
-- This caused 400 Bad Request errors when creating preparation productions.
--
-- Fix for error: POST /rest/v1/preparation_operations 400 (Bad Request)

ALTER TABLE preparation_operations
ADD COLUMN IF NOT EXISTS related_storage_operation_ids text[] DEFAULT NULL;

COMMENT ON COLUMN preparation_operations.related_storage_operation_ids IS
'Array of storage_operations IDs that were created as part of this preparation operation (e.g., raw product write-offs during production)';
