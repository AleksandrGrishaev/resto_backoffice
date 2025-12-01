# Sprint: Fix P&L Food Cost with Proper Write-Off Recording

## Problem Summary

Manual write-offs (spoilage, education, test) are **NOT recorded as expense transactions** in Account Store, so they don't appear in P&L Food Cost calculations. Only automated negative batch write-offs are currently included.

### Current State

** What's Working:**

- Recipe-based food cost from sales is calculated correctly
- Negative batch expenses are recorded and included in P&L (`food_cost` category)
- Reconciliation corrections are tracked (`inventory_variance` category)

**L What's Missing:**

- Manual write-offs (expired, spoiled, other) are NOT creating expense transactions
- Write-offs are only stored in `storage_operations` table
- P&L Food Cost is incomplete (missing spoilage and manual losses)

### Required Fix

1. **Record expense transactions when manual write-offs are created**
2. **Filter by KPI-affecting categories** (exclude 'education', 'test', 'production_consumption', 'sales_consumption')
3. **Backfill historical write-off data** via migration script

---

## Implementation Tasks

###  Step 1: Enhance Write-Off Expense Service

**File:** `src/stores/storage/writeOffExpenseService.ts`

Add new method `recordManualWriteOff()`:

```typescript
/**
 * Record expense transaction when manual write-off is created
 * Only records for KPI-affecting write-offs (expired, spoiled, other)
 *
 * @param params - Write-off details
 */
async recordManualWriteOff(params: {
  reason: WriteOffReason
  totalValue: number
  description: string
  items: StorageOperationItem[]
}): Promise<void> {
  // Import helper function
  import { doesWriteOffAffectKPI } from './types'

  // Only record if affects KPI
  if (!doesWriteOffAffectKPI(params.reason)) {
    console.info('� Skipping expense for non-KPI write-off:', params.reason)
    return
  }

  const accountStore = useAccountStore()
  const defaultAccount = accountStore.accounts.find(a => a.name === 'acc_1')

  if (!defaultAccount) {
    console.error('L No default account found for write-off recording')
    throw new Error('No default account available for write-off recording')
  }

  // Validate total value
  if (typeof params.totalValue !== 'number' || isNaN(params.totalValue)) {
    console.error('L Invalid totalValue:', params.totalValue)
    throw new Error(`Invalid totalValue: ${params.totalValue}`)
  }

  // Create expense transaction
  await accountStore.createOperation({
    accountId: defaultAccount.id,
    type: 'expense',
    amount: -params.totalValue, // negative amount for expense
    description: params.description,
    expenseCategory: {
      type: 'daily',
      category: 'inventory_adjustment' // For spoilage/shortage
    },
    performedBy: {
      type: 'api',
      id: 'system',
      name: 'Inventory System'
    }
  })

  console.info(
    ` Recorded write-off expense (${params.reason}): Rp ${params.totalValue.toLocaleString()}`
  )
}
```

---

### � Step 2: Update Storage Service

**File:** `src/stores/storage/storageService.ts`

Modify `createWriteOff()` method to record expense after write-off creation:

```typescript
async createWriteOff(data: CreateWriteOffData): Promise<StorageOperation> {
  // ... existing validation and batch allocation logic ...

  // Create write-off operation
  const operation = await this.createStorageOperation({
    operationType: 'write_off',
    // ... existing operation data ...
  })

  //  NEW: Record financial transaction for KPI-affecting write-offs
  if (operation.writeOffDetails && operation.totalValue) {
    try {
      await writeOffExpenseService.recordManualWriteOff({
        reason: operation.writeOffDetails.reason,
        totalValue: operation.totalValue,
        description: operation.description,
        items: operation.items
      })
    } catch (error) {
      console.error('L Failed to record write-off expense:', error)
      // Don't throw - write-off operation already created
      // Financial transaction can be backfilled later if needed
    }
  }

  return operation
}
```

**Key Points:**

- Call `recordManualWriteOff()` after successful write-off creation
- Wrap in try-catch (don't fail entire operation if expense recording fails)
- `doesWriteOffAffectKPI()` filter is inside the service method

---

### � Step 3: Create Backfill Migration

**File:** `src/supabase/migrations/012_backfill_writeoff_expenses.sql`

Query historical write-offs and create corresponding expense transactions:

```sql
-- Migration: 012_backfill_writeoff_expenses
-- Description: Backfill expense transactions for historical KPI-affecting write-offs
-- Date: 2024-01-XX
-- Author: Claude

-- CONTEXT:
-- Manual write-offs were not creating expense transactions in Account Store.
-- This migration backfills historical data to ensure P&L Food Cost is accurate.

-- PRE-MIGRATION VALIDATION
-- Check how many write-offs will be backfilled
SELECT
  COUNT(*) as total_writeoffs,
  COUNT(*) FILTER (WHERE (write_off_details->>'affectsKPI')::boolean = true) as kpi_affecting,
  COUNT(*) FILTER (WHERE (write_off_details->>'affectsKPI')::boolean = false) as non_kpi
FROM storage_operations
WHERE operation_type = 'write_off';

-- ACTUAL CHANGES
-- Insert expense transactions for KPI-affecting write-offs
INSERT INTO account_operations (
  id,
  account_id,
  type,
  amount,
  description,
  expense_category,
  performed_by,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  (SELECT id FROM accounts WHERE name = 'acc_1' LIMIT 1) as account_id,
  'expense' as type,
  -ABS(so.total_value) as amount, -- negative for expense
  so.description,
  jsonb_build_object(
    'type', 'daily',
    'category', 'inventory_adjustment'
  ) as expense_category,
  jsonb_build_object(
    'type', 'api',
    'id', 'migration_backfill',
    'name', 'Historical Write-Off Backfill'
  ) as performed_by,
  so.created_at,
  NOW() as updated_at
FROM storage_operations so
WHERE
  so.operation_type = 'write_off'
  AND (so.write_off_details->>'affectsKPI')::boolean = true
  AND so.total_value IS NOT NULL
  AND so.total_value > 0
  -- Avoid duplicates: only insert if no matching transaction exists
  AND NOT EXISTS (
    SELECT 1 FROM account_operations ao
    WHERE ao.description = so.description
    AND ao.created_at = so.created_at
    AND ao.type = 'expense'
    AND ao.expense_category->>'category' = 'inventory_adjustment'
  );

-- POST-MIGRATION VALIDATION
-- Verify transactions were created
SELECT
  COUNT(*) as backfilled_count,
  SUM(ABS(amount)) as total_amount
FROM account_operations
WHERE
  performed_by->>'id' = 'migration_backfill'
  AND expense_category->>'category' = 'inventory_adjustment';

-- Show breakdown by write-off reason (from description)
SELECT
  CASE
    WHEN description ILIKE '%expired%' THEN 'expired'
    WHEN description ILIKE '%spoil%' THEN 'spoiled'
    ELSE 'other'
  END as inferred_reason,
  COUNT(*) as count,
  SUM(ABS(amount)) as total_amount
FROM account_operations
WHERE performed_by->>'id' = 'migration_backfill'
GROUP BY 1
ORDER BY total_amount DESC;
```

---

### � Step 4-7: Testing & Verification

**Step 4: Test new write-offs with KPI-affecting reasons**

1. Create write-off with reason = 'expired'
2. Verify expense transaction created in Account Store
3. Check description, amount, category (`inventory_adjustment`)
4. Verify P&L includes it in spoilage section

**Step 5: Test new write-offs with non-KPI reasons**

1. Create write-off with reason = 'education'
2. Verify NO expense transaction created
3. Verify write-off still recorded in `storage_operations`
4. Verify P&L does NOT include it

**Step 6: Apply migration to backfill historical data**

1. Review migration SQL
2. Apply via MCP: `mcp__supabase__apply_migration()`
3. Check validation queries (pre/post migration)
4. Verify no duplicates created

**Step 7: Verify P&L Food Cost includes write-offs correctly**

1. Open P&L Report View
2. Check "Real Food Cost" section
3. Verify spoilage breakdown (expired + spoiled)
4. Verify shortage breakdown (other)
5. Compare with previous P&L calculations

---

## Write-Off Category Classification

** INCLUDED in P&L Food Cost (KPI-affecting):**

- `expired` � Spoilage (product past expiry date)
- `spoiled` � Spoilage (damaged/spoiled product)
- `other` � Shortage (spills, mistakes, other losses)

**L EXCLUDED from P&L Food Cost (Non-KPI):**

- `education` � Staff training (not a loss)
- `test` � Recipe development/testing (not a loss)
- `production_consumption` � Normal operations (raw � prep)
- `sales_consumption` � Normal operations (product � sale)

---

## P&L Food Cost Calculation (After Fix)

```typescript
Real Food Cost = Sales COGS + Net Inventory Adjustments

Where:
  Sales COGS = Sum of actualCost.totalCost from sales_transactions

  Net Inventory Adjustments = -Losses + Gains

  Losses (expenses, negative amounts):
    - Spoilage (expired + spoiled write-offs)
    - Shortage (other write-offs)
    - Negative batches (automated system write-offs)

  Gains (income, positive amounts):
    - Surplus (positive inventory adjustments)
    - Reconciliation (negative batch corrections)
```

**P&L Report Categories:**

- `food_cost` - Negative batch expenses (automated)
- `inventory_variance` - Reconciliation corrections (automated)
- `inventory_adjustment` - Manual write-offs + manual adjustments

---

## Files Modified

1.  `src/stores/storage/writeOffExpenseService.ts` - Add `recordManualWriteOff()` method
2. � `src/stores/storage/storageService.ts` - Update `createWriteOff()` to record expenses
3. � `src/supabase/migrations/012_backfill_writeoff_expenses.sql` - Backfill historical data

## Files Verified (No Changes Needed)

- `src/stores/analytics/plReportStore.ts` - Existing filtering logic is correct
- `src/stores/storage/types.ts` - KPI classification already defined
- `src/views/backoffice/analytics/PLReportView.vue` - UI display is correct
