-- Migration: 012_add_preparation_shelf_life
-- Description: Add shelf_life column and prepare for auto write-off integration
-- Date: 2025-01-25
-- Author: Kitchen App Team
-- Context: Sprint 1 - Preparation Production with Auto Write-off
--
-- This migration adds:
-- 1. shelf_life column to preparations (base shelf life in days)
-- 2. related_preparation_operation_id to storage_operations (link prep production to raw product write-off)
-- 3. Performance index for related operations lookup
--
-- Related files:
-- - src/stores/preparation/preparationService.ts (auto write-off logic)
-- - src/stores/storage/storageService.ts (new write-off reasons)

-- ============================================================================
-- 1. Add shelf_life column to preparations table
-- ============================================================================

ALTER TABLE preparations
ADD COLUMN shelf_life INTEGER NOT NULL DEFAULT 2;

COMMENT ON COLUMN preparations.shelf_life IS
'Base shelf life in days after production. Used to calculate expiry_date dynamically: production_date + shelf_life days.
Examples: Kitchen preparations (2 days), Bar preparations (7 days).
Expiry is calculated in application layer, not stored in database.';

-- ============================================================================
-- 2. Backfill existing preparations with sensible defaults
-- ============================================================================

-- Kitchen preparations: 2 days shelf life (default)
UPDATE preparations
SET shelf_life = 2
WHERE department = 'kitchen' OR department IS NULL;

-- Bar preparations: 7 days shelf life (longer for sauces, syrups, etc.)
UPDATE preparations
SET shelf_life = 7
WHERE department = 'bar';

-- ============================================================================
-- 3. Add related_operation_id to storage_operations
-- ============================================================================

-- This creates a link between:
-- - Storage write-off operation (raw products consumed)
-- - Preparation operation (preparation batch created)
-- Allows tracing which raw products were used to make which preparation

ALTER TABLE storage_operations
ADD COLUMN related_preparation_operation_id uuid REFERENCES preparation_operations(id);

COMMENT ON COLUMN storage_operations.related_preparation_operation_id IS
'Links storage write-off to the preparation operation that triggered it.
When a preparation is produced, raw products are automatically written off from storage.
This field stores the preparation_operations.id that caused the write-off.
Enables audit trail: raw products → preparation batch.';

-- ============================================================================
-- 4. Create index for performance
-- ============================================================================

-- Index for quick lookup of storage write-offs related to preparation production
CREATE INDEX idx_storage_operations_related_prep
ON storage_operations(related_preparation_operation_id)
WHERE related_preparation_operation_id IS NOT NULL;

COMMENT ON INDEX idx_storage_operations_related_prep IS
'Performance index for finding storage write-offs related to preparation production.
Used in WriteOffHistoryView to show production consumption history.';

-- ============================================================================
-- 5. Update write_off_details JSONB structure (documentation only)
-- ============================================================================

-- NOTE: No schema change needed for write_off_details JSONB column.
-- The application will handle new reason types:
--
-- NEW write-off reasons:
-- - 'production_consumption': Raw products consumed when making preparations (non-KPI)
-- - 'sales_consumption': Products/preparations consumed when selling menu items (non-KPI)
--
-- Existing write-off reasons (unchanged):
-- - 'expired', 'spoiled', 'damaged', 'theft' (KPI-affecting)
-- - 'other', 'education', 'test' (KPI-affecting)
--
-- Example write_off_details for production_consumption:
-- {
--   "reason": "production_consumption",
--   "affectsKPI": false,
--   "notes": "Auto write-off for preparation production: Burger Sauce"
-- }

-- ============================================================================
-- 6. Validation queries (run after migration)
-- ============================================================================

-- Verify shelf_life column added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'preparations' AND column_name = 'shelf_life';

-- Verify backfill completed
-- SELECT department, shelf_life, COUNT(*)
-- FROM preparations
-- GROUP BY department, shelf_life;

-- Verify related_preparation_operation_id column added
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'storage_operations' AND column_name = 'related_preparation_operation_id';

-- Verify index created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'storage_operations' AND indexname = 'idx_storage_operations_related_prep';

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Next steps:
-- 1. Update TypeScript types (src/stores/preparation/types.ts)
-- 2. Update TypeScript types (src/stores/storage/types.ts)
-- 3. Implement auto write-off logic (src/stores/preparation/preparationService.ts)
-- 4. Update UI components (src/views/Preparation/components/AddPreparationProductionItemDialog.vue)
