# Receipt Completion Optimization - Implementation Notes

## Date: 2026-01-02

## Problem

Receipt completion was taking **~20 seconds for 10 items** due to 45-60+ sequential API calls:

- Transit batch conversion: 5s (10 sequential updates)
- Reconciliation: 4s (10 individual queries)
- Storage operation: 1s
- Receipt/order updates: 3s
- Product price updates: 7s (20 sequential updates)

**Total: ~20 seconds, 45-60+ API calls, NO transaction safety**

## Solution

Created Supabase RPC function `complete_receipt_full` that consolidates ALL operations into one atomic transaction.

## Implementation

### 1. RPC Function Structure

**Location:**

- Function code: `src/supabase/functions/complete_receipt_full.sql`
- Migration: `src/supabase/migrations/025_complete_receipt_rpc.sql`

**Operations (in single transaction):**

1. Convert transit batches → active (single UPDATE with WHERE)
2. Update batch quantities/prices from received items
3. Reconcile negative batches (single UPDATE)
4. Create storage_operation record (audit trail)
5. Create pending_payment (debt to supplier)
6. Update receipt status to 'completed'
7. Update order status to 'delivered'

**Error Handling:**

- Automatic rollback on any error
- Validation of order/receipt existence
- JSONB response with success/error details

### 2. Client Integration

**File:** `src/stores/supplier_2/composables/useReceipts.ts`

**Changes:**

- Added `supabase` import
- Replaced `completeReceipt()` function with optimized version
- Single RPC call replaces 60+ sequential operations
- Performance timing added (console logs)
- Background state refresh (non-blocking)

### 3. Expected Performance

| Metric    | Before | After     |
| --------- | ------ | --------- |
| Time      | ~20s   | ~1-2s     |
| API Calls | 45-60+ | 1         |
| Atomicity | None   | Full      |
| Rollback  | Manual | Automatic |

### 4. Testing Data Available

- **Draft receipts:** 3 receipts ready for testing
- **Transit batches:** 16 batches across 8 orders
- **Test receipt:** `395d38b7-63af-4ff1-92d1-5e7d47e0327a` (Sensa Roastery)

## Files Created/Modified

### Created:

1. `src/supabase/functions/complete_receipt_full.sql` - RPC function definition
2. `src/supabase/migrations/025_complete_receipt_rpc.sql` - Migration file

### Modified:

1. `src/stores/supplier_2/composables/useReceipts.ts` - Client implementation

## Next Steps for Testing

1. Run dev server: `pnpm dev`
2. Navigate to Supplier → Receipts
3. Select draft receipt `RCP-1224-033` (Sensa Roastery)
4. Click "Complete Receipt"
5. Check console for timing: `🎉 Receipts: Receipt RCP-1224-033 completed in XXXms`
6. Verify data integrity:
   - Storage batches converted (transit → active)
   - Storage operation created
   - Pending payment created
   - Receipt/order status updated

## Production Deployment

When ready to deploy to production:

1. **Switch MCP to production** (see CLAUDE.md)
2. **Apply migration:**
   ```typescript
   mcp__supabase__apply_migration({
     name: '025_complete_receipt_rpc',
     query: '...' // from migration file
   })
   ```
3. **Verify function:**
   ```sql
   SELECT proname, prosecdef
   FROM pg_proc
   WHERE proname = 'complete_receipt_full';
   ```
4. **Deploy client code** (Vercel auto-deploy from main branch)
5. **Switch MCP back to DEV**

## Rollback Plan

If issues arise in production:

1. Revert client code to previous version (git revert)
2. Old client logic will continue to work (sequential calls)
3. RPC function can remain (not breaking)
4. Fix issues, redeploy

## Notes

- RPC function uses `SECURITY DEFINER` for proper permissions
- All monetary calculations preserve precision (NUMERIC type)
- Function returns detailed counts for verification
- Background refresh prevents UI blocking
