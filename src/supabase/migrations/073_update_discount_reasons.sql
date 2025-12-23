-- Migration: 073_update_discount_reasons
-- Description: Update discount_events table to use new discount reason values
-- Date: 2024-12-23
-- Context: Updating discount reason categories to match business requirements
--
-- Old reasons:
--   'customer_complaint', 'service_issue', 'food_quality', 'promotion', 'loyalty',
--   'staff_error', 'compensation', 'manager_decision', 'other'
--
-- New reasons:
--   'loyalty_card', 'promo_review', 'compliment', 'senior_agreement',
--   'kitchen_mistake', 'owner_family', 'other'
--
-- ⚠️ IMPORTANT: This migration assumes discount_events table has been created
-- If table doesn't exist, this migration will be skipped

-- ============================================================================
-- STEP 1: Drop existing constraint (if table exists)
-- ============================================================================

DO $$
BEGIN
  -- Check if discount_events table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'discount_events'
  ) THEN
    -- Drop old constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'discount_events'
      AND constraint_name LIKE '%reason%check%'
    ) THEN
      -- Find and drop the constraint (name might vary)
      EXECUTE (
        SELECT 'ALTER TABLE discount_events DROP CONSTRAINT ' || constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'discount_events'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%reason%'
        LIMIT 1
      );
      RAISE NOTICE '✅ Dropped old discount reason constraint';
    END IF;

    -- ============================================================================
    -- STEP 2: Update existing data to new reason values (if any)
    -- ============================================================================

    -- Map old reasons to new reasons
    -- customer_complaint, service_issue, food_quality → kitchen_mistake
    UPDATE discount_events
    SET reason = 'kitchen_mistake'
    WHERE reason IN ('customer_complaint', 'service_issue', 'food_quality', 'staff_error');

    -- promotion → promo_review
    UPDATE discount_events
    SET reason = 'promo_review'
    WHERE reason = 'promotion';

    -- loyalty → loyalty_card
    UPDATE discount_events
    SET reason = 'loyalty_card'
    WHERE reason = 'loyalty';

    -- compensation → compliment
    UPDATE discount_events
    SET reason = 'compliment'
    WHERE reason = 'compensation';

    -- manager_decision → owner_family (as these are typically discretionary)
    UPDATE discount_events
    SET reason = 'owner_family'
    WHERE reason = 'manager_decision';

    RAISE NOTICE '✅ Updated existing discount reasons to new values';

    -- ============================================================================
    -- STEP 3: Add new constraint with updated reason values
    -- ============================================================================

    ALTER TABLE discount_events
      ADD CONSTRAINT discount_events_reason_check
      CHECK (reason IN (
        'loyalty_card',
        'promo_review',
        'compliment',
        'senior_agreement',
        'kitchen_mistake',
        'owner_family',
        'other'
      ));

    RAISE NOTICE '✅ Added new discount reason constraint';
    RAISE NOTICE '✅ Migration 073: Discount reasons updated successfully';

  ELSE
    RAISE NOTICE '⚠️ Table discount_events does not exist, skipping migration 073';
  END IF;
END $$;
