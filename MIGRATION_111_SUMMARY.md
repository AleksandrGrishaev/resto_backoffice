# Migration 111: Support Active Negative Batches

**Date:** 2026-01-29
**Status:** ✅ COMPLETED (Applied to DEV database)
**Purpose:** Change negative batch lifecycle to remain active instead of auto-reconciling during receipt completion

---

## 📋 Executive Summary

### Problem

When stock goes negative (-1000g) and new stock arrives (+5000g), the system was:

- Closing negative batches immediately (`is_active = false, reconciled_at = NOW()`)
- Showing **5000g** on storage (incorrect - should be 4000g)
- Losing track of the debt until inventory reconciliation

### Solution

With Migration 111, negative batches now:

- **Remain active** (`is_active = true, reconciled_at = NULL`)
- **Participate in balance calculations** (SUM includes negative quantities)
- Show **4000g** on storage (correct: -1000 + 5000 = 4000)
- Get closed during **inventory reconciliation** instead of receipt completion

---

## 🔧 Files Changed

### 1. Database Migrations

**File:** `src/supabase/migrations/111_support_active_negative_batches_fifo.sql`

- ✅ Updated `allocate_product_fifo()` RPC function
- ✅ Updated `allocate_preparation_fifo()` RPC function
- Changes:
  - Removed `current_quantity > 0` filter
  - Added `ORDER BY` to prioritize positive batches first
  - Added negative batch handling in allocation loop

**File:** `src/supabase/functions/complete_receipt_full.sql`

- ✅ Removed auto-reconciliation of negative batches (lines 107-116)
- Changes:
  - Deleted `UPDATE storage_batches SET reconciled_at = NOW()` logic
  - Now returns `reconciledBatches = 0` (no longer reconciling)
  - Added comment explaining new behavior

### 2. TypeScript Services

**File:** `src/stores/storage/storageService.ts`

- ✅ Updated `allocateFIFO()` method (lines 231-330)

  - Removed `.gt('current_quantity', 0)` filter
  - Changed to `.eq('is_active', true)`
  - Added separation of positive/negative batches
  - Priority: positive batches first, then negative batches (FIFO within each group)

- ✅ Updated `allocatePreparationFIFO()` method (lines 345-447)
  - Same changes as `allocateFIFO()`

**File:** `src/stores/supplier_2/integrations/storageIntegration.ts`

- ✅ Removed auto-reconciliation calls (lines 382-395)
  - Deleted import of `reconciliationService`
  - Deleted loop calling `autoReconcileOnNewBatch()`
  - Added comment explaining removal

**File:** `src/stores/storage/storageStore.ts` (FIXED 2026-01-29)

- ✅ Removed auto-reconciliation calls (lines 517-536)
  - Deleted reconciliationService import and loop
  - Added Migration 111 comment explaining removal
  - **BUG FIX**: This was missed in initial migration, causing negative batches to still be reconciled

**File:** `src/stores/preparation/preparationStore.ts` (FIXED 2026-01-29)

- ✅ Removed auto-reconciliation calls (lines 276-294)
  - Deleted reconciliationService import and loop
  - Added Migration 111 comment explaining removal
  - **BUG FIX**: This was missed in initial migration, causing negative batches to still be reconciled

**File:** `src/stores/supplier_2/composables/useReceipts.ts`

- ✅ Updated logging (line 311-314)
  - Added note that `reconciledBatches` is now always 0
  - Added conditional log message for new behavior

---

## 📊 Behavior Changes

### Before Migration 111:

```
Initial State:
├─ Negative batch: -1000g (is_negative=true, is_active=true)

Receipt Completion (5000g arrives):
├─ New batch created: +5000g (is_active=true)
├─ Negative batch updated: reconciled_at=NOW(), is_active=false ❌
└─ Balance shown: 5000g ❌ WRONG

FIFO Allocation (sale 500g):
├─ Query: WHERE is_active=true AND current_quantity > 0
├─ Found: Only +5000g batch (negative batch excluded)
└─ Result: 5000g - 500g = 4500g remaining
```

### After Migration 111:

```
Initial State:
├─ Negative batch: -1000g (is_negative=true, is_active=true)

Receipt Completion (5000g arrives):
├─ New batch created: +5000g (is_active=true)
├─ Negative batch: STAYS ACTIVE ✅
└─ Balance shown: 4000g ✅ CORRECT (-1000 + 5000)

FIFO Allocation (sale 500g):
├─ Query: WHERE is_active=true (includes negative batches)
├─ Batches ordered: [+5000g (positive first), -1000g (negative second)]
├─ Allocate from: +5000g batch
└─ Result: 4000g - 500g = 3500g remaining
```

---

## 🧪 Testing Checklist

### ✅ Completed Tests (DEV Database):

- [x] RPC functions deployed successfully
- [x] `allocate_product_fifo()` callable
- [x] `allocate_preparation_fifo()` callable
- [x] `complete_receipt_full` updated (no reconciliation)
- [x] **Migration 112 applied successfully** (Critical bug fixes)
- [x] Infinite loop safeguards verified (zero allocation test passed)
- [x] Deficit calculation verified (large allocation test: 50000g requested, 19321g available, 30679g deficit)
- [x] Performance indexes created (`idx_storage_batches_fifo_active_negative`, `idx_preparation_batches_fifo_active_negative`)
- [x] FIFO allocation working correctly (Coffee bean: 500g allocated from oldest batch)
- [x] Edge case handling verified (0g request returns empty allocations gracefully)

### ⏳ Pending Tests:

- [ ] Create negative batch via write-off (insufficient stock)
- [ ] Verify: `is_negative=true, is_active=true, reconciled_at=NULL`
- [ ] Complete receipt for same product
- [ ] Verify: Negative batch still active after receipt
- [ ] Check balance calculation includes negative batch
- [ ] Test FIFO allocation uses positive batches first
- [ ] Test sale transaction with negative batch present
- [ ] Verify cost calculation is correct

---

## 🎯 Key Impacts

### Balance Calculation

✅ **Already handles active negative batches**

- `calculateBalances()` sums ALL active batches (including negative)
- No changes needed - works out of the box

### FIFO Allocation

✅ **Updated to support negative batches**

- Positive batches allocated first (FIFO order)
- Negative batches allocated second (FIFO order)
- Prevents incorrect cost calculations

### Receipt Operations

✅ **No longer auto-reconciles**

- Negative batches stay active
- Reconciliation happens during inventory only
- Maintains debt visibility

### POS Sales

✅ **Uses updated FIFO RPC**

- Cost calculations now include negative batch costs
- More accurate COGS tracking
- No breaking changes for UI

---

## 🔄 Inventory Reconciliation (Future Work)

**Status:** Not yet implemented in this migration

**Plan:** During inventory reconciliation, negative batches should be closed:

```typescript
// In finalizeInventory():
async function closeNegativeBatches(productId: string) {
  await supabase
    .from('storage_batches')
    .update({
      is_active: false,
      status: 'reconciled', // New status value
      reconciled_at: NOW(),
      reconciliation_type: 'inventory_count'
    })
    .eq('item_id', productId)
    .eq('is_negative', true)
    .eq('is_active', true)
}
```

**Recommended:** Implement in next sprint after testing current changes.

---

## 🚀 Deployment Strategy

### DEV Environment:

✅ **COMPLETED** - Migration 111 applied successfully

- RPC functions updated
- TypeScript services updated
- Ready for testing

### Production Environment:

⏳ **PENDING** - Awaiting DEV testing completion

**Recommended Steps:**

1. ✅ Complete all DEV tests
2. ⏳ Create test scenarios document
3. ⏳ Perform user acceptance testing
4. ⏳ Backup production database
5. ⏳ Apply migration to PROD via Supabase SQL Editor
6. ⏳ Deploy TypeScript changes (build + deploy)
7. ⏳ Monitor for issues
8. ⏳ Verify balance calculations in production

---

## ⚠️ Rollback Plan

If issues are found:

### Database Rollback:

```sql
-- Recreate old allocate_product_fifo (with current_quantity > 0 filter)
-- Recreate old complete_receipt_full (with reconciliation logic)
```

### TypeScript Rollback:

```bash
git revert <commit-hash>
pnpm build
# Deploy previous version
```

### Data Impact:

- ✅ **Low risk** - No data corruption
- ✅ **Backward compatible** - Old reconciled batches still work
- ⚠️ **Temporary inconsistency** - Active negative batches may show in balances

---

## 📝 Documentation Updates Needed

- [ ] Update developer docs with new negative batch lifecycle
- [ ] Update user guide for inventory reconciliation
- [ ] Add troubleshooting section for "why is my balance different?"
- [ ] Create training materials for warehouse staff

---

## ✅ Success Criteria

Migration is considered successful when:

1. ✅ All RPC functions deployed without errors
2. ⏳ Balance calculations show correct net quantities
3. ⏳ FIFO allocation prioritizes positive batches
4. ⏳ Receipt completion leaves negative batches active
5. ⏳ No errors in POS sales transactions
6. ⏳ Cost calculations remain accurate
7. ⏳ Inventory reconciliation works as expected

---

## 📞 Support

**Questions?** Contact development team
**Issues?** Check DEV database logs via `mcp__supabase__get_logs`
**Rollback needed?** See rollback plan above

---

**Status:** 🟢 Migration 111 + 112 applied to DEV, TypeScript reconciliation bug fixed
**Next Step:** Test complete flow with actual receipt creation and verify negative batches remain active

---

## ⚠️ Critical Bug Fix (2026-01-29 Evening)

**Issue Found:** User reported that negative batches were still being reconciled after receipt creation.

**Root Cause:** Two client-side stores were still calling `reconciliationService.autoReconcileOnNewBatch()`:

- `src/stores/storage/storageStore.ts:522` (for products)
- `src/stores/preparation/preparationStore.ts:281` (for preparations)

These calls were **NOT removed** during initial Migration 111 implementation, causing the migration to be partially ineffective.

**Fix Applied:**

- Removed all `autoReconcileOnNewBatch()` calls from both stores
- Added Migration 111 comments explaining the removal
- Updated documentation to reflect the bug fix

**Status:** ✅ Fixed in working directory, ready for testing

---

## 🔧 Migration 112: Critical Bug Fixes (Applied 2026-01-29)

After comprehensive code review, Migration 112 was created to fix critical issues in Migration 111:

### Fixes Applied:

**Critical #1: Infinite Loop Safeguards** ✅

- Added `IF v_allocated <= 0 THEN EXIT` checks in both RPC functions
- Prevents infinite loops from zero-quantity batches or floating-point precision errors
- Verified with edge case tests (0g allocation, zero-quantity batches)

**Critical #3: Transaction Isolation Documentation** ✅

- Added comprehensive comments explaining PostgreSQL's implicit transaction behavior
- Documented SECURITY DEFINER privilege model
- Reference: https://www.postgresql.org/docs/current/plpgsql-transactions.html

**Major #4: Deficit Calculation Fix** ✅

- Simplified formula: `CASE WHEN v_total_allocated >= p_quantity THEN 0 ELSE p_quantity - v_total_allocated END`
- Removed double-counting issue when allocating from negative batches
- Verified with large allocation test (50000g requested vs 19321g available)

**Major #5: Performance Indexes** ✅

- Created composite indexes for FIFO queries:
  - `idx_storage_batches_fifo_active_negative` on `(item_id, is_active, current_quantity, receipt_date, created_at)`
  - `idx_preparation_batches_fifo_active_negative` on `(preparation_id, is_active, current_quantity, production_date/created_at)`
- Analyzed tables to update statistics

### Test Results (DEV Database):

| Test Case                                    | Expected                    | Actual                                                | Status  |
| -------------------------------------------- | --------------------------- | ----------------------------------------------------- | ------- |
| Normal allocation (500g)                     | Allocate from oldest batch  | ✅ Allocated 500g @ Rp287/g from BTR-260107-060535-01 | ✅ PASS |
| Zero allocation (0g)                         | Empty allocations, no error | ✅ Returns `allocations: [], deficit: 0`              | ✅ PASS |
| Large allocation (50000g > 19321g available) | Allocate all + deficit      | ✅ Allocated 19321g from 3 batches + 30679g deficit   | ✅ PASS |
| Infinite loop safeguard                      | No infinite loops           | ✅ All loops terminate correctly                      | ✅ PASS |
| Index creation                               | Both indexes exist          | ✅ Both indexes visible in pg_indexes                 | ✅ PASS |

### Remaining Work:

**Critical #2: JSONB Input Validation** ⏳

- Deferred to future migration
- Current protection: PostgreSQL's prepared statements prevent SQL injection
- Recommended: Add explicit schema validation in `complete_receipt_full`

**Major #6-7: Race Conditions & NULL Cost Handling** ⏳

- Deferred by using "single-POS" limitation
- Full fix requires exclusive use of RPC functions (remove client-side allocation)
