# Technical Specification: POS Expense Linking System Fix

**Document Version:** 1.0  
**Date:** 2026-01-29  
**Author:** Claude Code  
**Status:** Draft - Ready for Implementation

---

## Executive Summary

This specification addresses critical architectural issues in the POS expense linking system that have resulted in **134 unlinked supplier transactions** totaling **Rp 30,995,652** becoming invisible to the Backoffice Payments Management interface.

**Root Cause:** After commit `1f18659` (Jan 24, 2026), POS supplier expenses stopped creating PendingPayment records. The expense linking UI reads unlinked expenses from localStorage instead of the database, causing expenses to become invisible after localStorage is cleared.

**Impact:**

- 95+ unlinked expenses invisible in production (localStorage cleared on tablet)
- 134 total supplier transactions in database without payment links
- Expenses cannot be linked to purchase orders
- Financial tracking incomplete

**Solution:** Restore PendingPayment creation for supplier expenses and migrate expense linking to read from database instead of localStorage.

---

## Table of Contents

1. [Architecture Analysis](#1-architecture-analysis)
2. [Root Causes](#2-root-causes)
3. [Code Changes Required](#3-code-changes-required)
4. [Database Changes Required](#4-database-changes-required)
5. [Edge Cases & Potential Bugs](#5-edge-cases--potential-bugs)
6. [Implementation Plan](#6-implementation-plan)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Rollback Plan](#8-rollback-plan)
9. [Monitoring & Validation](#9-monitoring--validation)

---

## 1. Architecture Analysis

### 1.1 Current Flow (BROKEN)

```
POS Shift → Create Direct Expense
    ↓
[shiftsStore.createDirectExpense()]
    ↓
├─ Create ShiftExpenseOperation (localStorage)
├─ Create Transaction in Account (DB) ✅
└─ ❌ NO PendingPayment created (removed in commit 1f18659)

Backoffice → Payments Management View
    ↓
[useExpenseLinking.unlinkedExpenses]
    ↓
├─ Read from shiftsStore.getExpensesByLinkingStatus()
└─ Source: localStorage (pos_shifts) ❌ WRONG

Result: After localStorage clear → All expenses invisible
```

### 1.2 Correct Flow (TARGET)

```
POS Shift → Create Direct Expense
    ↓
[shiftsStore.createDirectExpense()]
    ↓
├─ Create ShiftExpenseOperation (localStorage + DB sync)
├─ Create Transaction in Account (DB) ✅
└─ ✅ Create PendingPayment (DB) with status='completed'

Backoffice → Payments Management View
    ↓
[useExpenseLinking.unlinkedExpenses]
    ↓
├─ Read completed payments from DB via accountStore
└─ Source: Supabase (pending_payments table) ✅ CORRECT

Result: Always visible, survives localStorage clear
```

### 1.3 Data Sources Comparison

| Component                  | Current Source      | Correct Source              | Issue                              |
| -------------------------- | ------------------- | --------------------------- | ---------------------------------- |
| POS Expense Creation       | localStorage        | localStorage + DB           | Transaction created but no payment |
| Backoffice Expense Listing | localStorage        | Database (pending_payments) | Invisible after clear              |
| Expense Linking            | localStorage update | Database (linked_orders)    | Not persisted to DB                |
| Order Bill Status          | Database            | Database                    | Missing payment link               |

### 1.4 Key Architecture Decision

**Why expenses need PendingPayment records:**

1. **Universal Interface**: Backoffice doesn't have access to POS localStorage
2. **Persistence**: Database survives app restarts and device changes
3. **Linking Mechanism**: `accountStore.linkPaymentToOrder()` requires payment ID
4. **Bill Status Calculation**: Orders need payment links to calculate `bill_status`
5. **Audit Trail**: Payments table provides complete financial history

---

## 2. Root Causes

### 2.1 Commit 1f18659 (Jan 24, 2026)

**What Changed:**

```typescript
// BEFORE (working):
const payment = await accountStore.createPayment({...})
expenseOperation.relatedPaymentId = payment.id

// AFTER commit 1f18659 (broken):
// ❌ REMOVED: PendingPayment creation
// REASON: "Payment already completed, no need for pending record"
```

**Why It Broke:**

- **Incorrect Assumption**: Developer assumed completed payments don't need PendingPayment records
- **Missed Use Case**: Forgot that Backoffice uses pending_payments table to list ALL expenses (not just pending ones)
- **Architecture Mismatch**: POS uses localStorage, Backoffice uses database - no sync mechanism

### 2.2 Expense Linking Reads from localStorage

**File:** `src/stores/pos/shifts/composables/useExpenseLinking.ts`

**Lines 138-155:**

```typescript
const unlinkedExpenses = computed((): ExpenseWithSource[] => {
  // POS shift expenses
  const shiftUnlinked = shiftsStore
    .getExpensesByLinkingStatus('unlinked') // ❌ Reads from localStorage
    .map(e => ({ ...e, sourceType: 'pos' as const }))

  // Backoffice payments
  const backofficePayments = backofficeUnlinkedPayments.value // ✅ Reads from DB

  return [...shiftUnlinked, ...backofficePayments]
})
```

**Problem:**

- `shiftsStore.getExpensesByLinkingStatus()` reads from `shifts.value` (in-memory array loaded from localStorage)
- After localStorage clear → `shifts.value` is empty → no expenses shown
- Database has 134 transactions but they're not converted to PendingPayment format

### 2.3 Linking Updates Only localStorage

**File:** `src/stores/pos/shifts/composables/useExpenseLinking.ts`

**Lines 409-491 (linkExpenseToInvoice):**

```typescript
if (expense.relatedPaymentId) {
  // ✅ Modern mode: Uses accountStore.linkPaymentToOrder (updates DB)
  await accountStore.linkPaymentToOrder({...})
} else {
  // ❌ Legacy mode: Only updates localStorage
  const shift = shiftsStore.shifts.find(...)
  shift.expenseOperations[expenseIndex] = updatedExpense
  localStorage.setItem('pos_shifts', JSON.stringify(allShifts))

  // Missing: Update order.bill_status in database
}
```

**Problem:**

- Old expenses without `relatedPaymentId` fall into "legacy mode"
- Changes only saved to localStorage, never synced to database
- Order's `bill_status` not updated (stays 'not_billed' instead of 'partially_paid')

### 2.4 Why 95 Expenses Are Invisible

**Timeline:**

1. **Dec 26 - Jan 24**: POS creates expenses with PendingPayment (working)
2. **Jan 24**: Commit 1f18659 deployed → PendingPayment creation removed
3. **Jan 24 - Jan 29**: POS creates expenses WITHOUT PendingPayment (broken)
4. **Jan 29**: Tablet localStorage cleared (cache cleanup / browser reset)
5. **Result**: All expenses from Jan 24-29 disappear from Backoffice view

**Data Loss Path:**

```
POS Tablet localStorage:
├─ pos_shifts: [expense1, expense2, ...] → CLEARED
└─ Backoffice can't see these anymore

Database:
├─ transactions: 134 supplier expenses ✅ Still there
├─ pending_payments: 0 entries for these ❌ Missing
└─ Result: No way to link expenses to orders
```

---

## 3. Code Changes Required

### 3.1 File: `src/stores/pos/shifts/shiftsStore.ts`

**Location:** Lines 582-677 (createDirectExpense function)

**Change:** Restore PendingPayment creation for supplier expenses

**BEFORE (Current - Broken):**

```typescript
// Lines 643-653
// ❌ REMOVED: PendingPayment creation for direct supplier expenses
// REASON: Payment is already completed (paid from cash register)
// Creating a pending payment here causes:
// 1. Duplicate "unlinked" entries in Payments Management view
// 2. Confusion: payment is already completed, no need for pending payment
// The expense and transaction are sufficient records of this payment.
// If user needs to link this expense to a PO, they can do so via expense linking UI.
```

**AFTER (Fixed):**

```typescript
// Lines 643-685 (RESTORE and IMPROVE)
// ✅ STEP 2: Create PendingPayment for expense linking in Backoffice
// This is NOT a duplicate - it's the PRIMARY record for Backoffice
// Transaction records the accounting entry, PendingPayment enables linking to POs
if (data.counteragentId) {
  try {
    // Use createSupplierExpenseWithPayment from accountStore
    // This ensures payment + transaction are created atomically
    const { payment } = await accountStore.createSupplierExpenseWithPayment({
      accountId: data.accountId,
      type: 'expense',
      amount: data.amount,
      description: data.description,
      expenseCategory: { type: 'expense', category: 'supplier' },
      performedBy: data.performedBy,
      counteragentId: data.counteragentId,
      counteragentName: data.counteragentName
    })

    // Link expense to payment
    expenseOperation.relatedPaymentId = payment.id

    console.log('✅ Supplier expense payment created:', payment.id)
  } catch (paymentError) {
    console.error('❌ Failed to create payment for supplier expense:', paymentError)
    // Continue - expense and transaction are created, only payment linking failed
    // User can manually create payment in Backoffice if needed
  }
}
```

**Why This Fix Works:**

1. Uses existing `createSupplierExpenseWithPayment()` method (lines 1870-1966)
2. Creates payment with `status='completed'` (already paid from cash)
3. Links payment to transaction via `related_payment_id`
4. Payment appears in Backoffice via `backofficeUnlinkedPayments` computed
5. Survives localStorage clear because it's in database

**Alternative Approach (Simpler):**

If we want to avoid calling accountStore method (circular dependency risk), we can directly use paymentService:

```typescript
// Alternative: Direct paymentService call
const { paymentService } = await import('@/stores/account/service')

const payment = await paymentService.createPayment({
  counteragentId: data.counteragentId,
  counteragentName: data.counteragentName || '',
  amount: data.amount,
  description: data.description,
  category: 'supplier',
  priority: 'medium',
  invoiceNumber: data.invoiceNumber,
  notes: data.notes,
  usedAmount: 0,
  createdBy: data.performedBy
})

// Mark as completed immediately
await paymentService.update(payment.id, {
  status: 'completed',
  paidAmount: data.amount,
  paidDate: new Date().toISOString(),
  assignedToAccount: data.accountId
})

expenseOperation.relatedPaymentId = payment.id
```

### 3.2 File: `src/stores/pos/shifts/composables/useExpenseLinking.ts`

**Location:** Lines 138-156 (unlinkedExpenses computed)

**Change:** Add database-sourced unlinked transactions

**BEFORE (Current - Incomplete):**

```typescript
const unlinkedExpenses = computed((): ExpenseWithSource[] => {
  // POS shift expenses (from localStorage)
  const shiftUnlinked = shiftsStore
    .getExpensesByLinkingStatus('unlinked')
    .map(e => ({ ...e, sourceType: 'pos' as const }))

  const shiftPartiallyLinked = shiftsStore
    .getExpensesByLinkingStatus('partially_linked')
    .map(e => ({ ...e, sourceType: 'pos' as const }))

  // Backoffice payments (from database)
  const backofficePayments = backofficeUnlinkedPayments.value

  return [...shiftUnlinked, ...shiftPartiallyLinked, ...backofficePayments]
})
```

**AFTER (Fixed):**

```typescript
const unlinkedExpenses = computed((): ExpenseWithSource[] => {
  // 1. Backoffice payments (from database) - PRIMARY SOURCE
  const backofficePayments = backofficeUnlinkedPayments.value

  // 2. POS shift expenses (from localStorage) - FALLBACK for unsync'd expenses
  // Only include expenses that don't have a payment in the database
  // This handles the edge case where expense is created but payment sync failed
  const knownPaymentIds = new Set(backofficePayments.map(p => p.relatedPaymentId).filter(Boolean))

  const shiftUnlinked = shiftsStore
    .getExpensesByLinkingStatus('unlinked')
    .filter(e => !e.relatedPaymentId || !knownPaymentIds.has(e.relatedPaymentId))
    .map(e => ({ ...e, sourceType: 'pos' as const }))

  const shiftPartiallyLinked = shiftsStore
    .getExpensesByLinkingStatus('partially_linked')
    .filter(e => !e.relatedPaymentId || !knownPaymentIds.has(e.relatedPaymentId))
    .map(e => ({ ...e, sourceType: 'pos' as const }))

  // Combine: Database first (truth), then localStorage fallback
  const combined = [...backofficePayments, ...shiftUnlinked, ...shiftPartiallyLinked]
  combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return combined
})
```

**Why This Fix Works:**

1. Database payments are PRIMARY source (always correct)
2. localStorage expenses are FALLBACK (for unsync'd expenses only)
3. Deduplication prevents showing same expense twice
4. Works after localStorage clear (database survives)

**Note:** After database migration, we can remove the localStorage fallback entirely and rely 100% on database.

### 3.3 File: `src/stores/pos/shifts/composables/useExpenseLinking.ts`

**Location:** Lines 409-491 (linkExpenseToInvoice function)

**Change:** Remove legacy mode, always use database

**BEFORE (Current - Has Legacy Mode):**

```typescript
async function linkExpenseToInvoice(...) {
  if (expense.relatedPaymentId) {
    // Modern mode: Update database
    await accountStore.linkPaymentToOrder({...})
  } else {
    // ❌ Legacy mode: Update localStorage only
    const shift = shiftsStore.shifts.find(s => s.id === expense.shiftId)
    const expenseIndex = shift.expenseOperations.findIndex(e => e.id === expense.id)
    shift.expenseOperations[expenseIndex] = updatedExpense
    localStorage.setItem('pos_shifts', JSON.stringify(allShifts))
  }
}
```

**AFTER (Fixed):**

```typescript
async function linkExpenseToInvoice(
  expense: ShiftExpenseOperation,
  invoice: InvoiceSuggestion,
  linkAmount: number,
  performedBy: { id: string; name: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    isLoading.value = true
    error.value = null

    // ✅ ALWAYS use database linking (no legacy mode)
    if (!expense.relatedPaymentId) {
      // ❌ CRITICAL ERROR: Expense without payment ID
      // This should NEVER happen after fix 3.1 (all expenses get payments)
      // If it does happen, it means payment creation failed or this is old data
      throw new Error(
        'Expense has no payment ID. Cannot link without payment record. ' +
          'This expense may be from before the database migration. ' +
          'Please create a manual payment for this expense first.'
      )
    }

    // Use accountStore.linkPaymentToOrder (updates database)
    await accountStore.linkPaymentToOrder({
      paymentId: expense.relatedPaymentId,
      orderId: invoice.id,
      orderNumber: invoice.orderNumber,
      linkAmount: linkAmount
    })

    DebugUtils.info(MODULE_NAME, 'Expense linked via PendingPayment', {
      expenseId: expense.id,
      paymentId: expense.relatedPaymentId,
      invoiceId: invoice.id,
      amount: linkAmount
    })

    // linkPaymentToOrder already updates expense via updateExpenseLinkingStatusByPaymentId
    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to link expense'
    error.value = errorMsg
    DebugUtils.error(MODULE_NAME, 'Failed to link expense', { error: err })
    return { success: false, error: errorMsg }
  } finally {
    isLoading.value = false
  }
}
```

**Why This Fix Works:**

1. Removes localStorage write path (eliminates source of bugs)
2. Forces all links through database (single source of truth)
3. Provides clear error for old expenses without payment IDs
4. After migration, all expenses will have payment IDs

### 3.4 File: `src/stores/account/store.ts`

**Location:** Lines 1101-1274 (linkPaymentToOrder function)

**Change:** Update order.bill_status in database after linking

**BEFORE (Current - Incomplete):**

```typescript
async function linkPaymentToOrder(data: LinkPaymentToOrderDto, options?: LinkPaymentOptions) {
  // ... link payment to order ...

  // ✅ Update expense linkingStatus if this payment came from POS
  await shiftsStore.updateExpenseLinkingStatusByPaymentId(...)

  // ❌ MISSING: Update order.bill_status in database
}
```

**AFTER (Fixed):**

```typescript
async function linkPaymentToOrder(
  data: LinkPaymentToOrderDto,
  options?: LinkPaymentOptions
): Promise<{
  success: boolean
  adjustedPayments?: Array<{...}>
}> {
  // ... existing linking logic ...

  // ✅ Update expense linkingStatus (existing code)
  try {
    const { useShiftsStore } = await import('@/stores/pos/shifts')
    const shiftsStore = useShiftsStore()
    const totalLinkedAmount = payment.linkedOrders.filter(o => o.isActive).reduce((sum, o) => sum + o.linkedAmount, 0)
    const newLinkingStatus = totalLinkedAmount >= payment.amount ? 'linked' : 'partially_linked'

    await shiftsStore.updateExpenseLinkingStatusByPaymentId(
      data.paymentId,
      newLinkingStatus,
      data.orderId
    )
  } catch (expenseUpdateError) {
    DebugUtils.warn(MODULE_NAME, 'Failed to update expense linkingStatus', { error: expenseUpdateError })
  }

  // ✅ NEW: Update order.bill_status in database
  try {
    const { usePurchaseOrders } = await import('@/stores/supplier_2/composables/usePurchaseOrders')
    const { updateOrderBillStatus } = usePurchaseOrders()

    await updateOrderBillStatus(data.orderId)

    DebugUtils.info(MODULE_NAME, 'Updated order bill_status after payment link', {
      orderId: data.orderId,
      paymentId: data.paymentId
    })
  } catch (billStatusError) {
    // Non-critical - bill status update failed but payment is linked
    DebugUtils.warn(MODULE_NAME, 'Failed to update order bill_status', {
      orderId: data.orderId,
      error: billStatusError
    })
  }

  return { success: true, adjustedPayments: adjustedPayments.length > 0 ? adjustedPayments : undefined }
}
```

**Why This Fix Works:**

1. Automatically updates order status after linking
2. Order status reflects payment state (not_billed → partially_paid → fully_paid)
3. Non-blocking (continues even if update fails)
4. Uses existing `updateOrderBillStatus` infrastructure

---

## 4. Database Changes Required

### 4.1 Backfill Strategy Overview

**Goal:** Create PendingPayment records for 134 unlinked supplier transactions

**Approach:**

1. Find all supplier transactions without `related_payment_id`
2. For each transaction, create corresponding PendingPayment
3. Update transaction with `related_payment_id`
4. Verify data integrity

### 4.2 Migration SQL Script

**File:** `src/supabase/migrations/092_backfill_missing_supplier_payments.sql`

```sql
-- Migration: 092_backfill_missing_supplier_payments
-- Description: Create PendingPayment records for supplier transactions created after commit 1f18659
-- Date: 2026-01-29
-- Author: Claude Code

-- CONTEXT:
-- After commit 1f18659 (Jan 24, 2026), POS supplier expenses stopped creating PendingPayment records.
-- This migration backfills those missing payments to restore expense linking functionality.

-- VALIDATION QUERIES (run these first to understand the data):

-- 1. Count unlinked supplier transactions
SELECT
  COUNT(*) as unlinked_count,
  SUM(ABS(amount)) as total_amount,
  MIN(created_at) as oldest_transaction,
  MAX(created_at) as newest_transaction
FROM transactions
WHERE expense_category->>'category' = 'supplier'
  AND related_payment_id IS NULL
  AND status = 'completed';
-- Expected: ~134 transactions, ~Rp 30.9M, range Dec 26 - Jan 29

-- 2. Sample of unlinked transactions
SELECT
  id,
  created_at,
  amount,
  description,
  counteragent_name,
  counteragent_id,
  account_id,
  performed_by
FROM transactions
WHERE expense_category->>'category' = 'supplier'
  AND related_payment_id IS NULL
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check for existing payments (should be 0)
SELECT COUNT(*) as existing_payments
FROM pending_payments pp
WHERE EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.related_payment_id = pp.id
    AND t.expense_category->>'category' = 'supplier'
    AND t.related_payment_id IS NULL
);
-- Expected: 0 (no payments exist for these transactions)

-- MIGRATION STEPS:

-- Step 1: Create a temporary table to track the migration
CREATE TEMP TABLE migration_092_payments AS
SELECT
  t.id as transaction_id,
  'pp_' || encode(gen_random_bytes(16), 'hex') as new_payment_id,
  t.counteragent_id,
  t.counteragent_name,
  ABS(t.amount) as amount,
  t.description,
  t.created_at,
  t.performed_by,
  t.account_id
FROM transactions t
WHERE t.expense_category->>'category' = 'supplier'
  AND t.related_payment_id IS NULL
  AND t.status = 'completed'
  AND t.counteragent_id IS NOT NULL -- Only transactions with supplier info
ORDER BY t.created_at;

-- Verify temp table
SELECT COUNT(*) as to_migrate FROM migration_092_payments;

-- Step 2: Create PendingPayment records
INSERT INTO pending_payments (
  id,
  counteragent_id,
  counteragent_name,
  amount,
  description,
  category,
  status,
  priority,
  created_by,
  used_amount,
  linked_orders,
  source_order_id,
  paid_amount,
  paid_date,
  assigned_to_account,
  created_at,
  updated_at
)
SELECT
  m.new_payment_id,
  m.counteragent_id,
  m.counteragent_name,
  m.amount,
  m.description,
  'supplier',
  'completed', -- Payment already completed (cash paid)
  'medium',
  m.performed_by, -- Original transaction performer
  0, -- Not yet linked to orders
  '[]'::jsonb, -- Empty array, will be filled when linked
  NULL, -- No source order (direct cash expense)
  m.amount, -- Paid amount = transaction amount
  m.created_at, -- Paid date = transaction date
  m.account_id, -- Account where expense was paid from
  m.created_at, -- Created = transaction date
  m.created_at -- Updated = transaction date
FROM migration_092_payments m;

-- Verify insertions
SELECT COUNT(*) as created_payments FROM pending_payments
WHERE id IN (SELECT new_payment_id FROM migration_092_payments);

-- Step 3: Update transactions with related_payment_id
UPDATE transactions t
SET
  related_payment_id = m.new_payment_id,
  updated_at = NOW()
FROM migration_092_payments m
WHERE t.id = m.transaction_id;

-- Verify updates
SELECT COUNT(*) as linked_transactions FROM transactions t
WHERE t.id IN (SELECT transaction_id FROM migration_092_payments)
  AND t.related_payment_id IS NOT NULL;

-- Step 4: Validation queries

-- 4a. Verify all transactions now have payments
SELECT
  COUNT(*) as remaining_unlinked
FROM transactions
WHERE expense_category->>'category' = 'supplier'
  AND related_payment_id IS NULL
  AND status = 'completed'
  AND counteragent_id IS NOT NULL;
-- Expected: 0 (all linked)

-- 4b. Verify payment-transaction links
SELECT
  COUNT(*) as valid_links
FROM transactions t
JOIN pending_payments pp ON t.related_payment_id = pp.id
WHERE t.expense_category->>'category' = 'supplier';
-- Expected: 134+ (all migrated + any new ones)

-- 4c. Check data integrity
SELECT
  t.id as transaction_id,
  t.amount as transaction_amount,
  pp.amount as payment_amount,
  t.counteragent_name as transaction_supplier,
  pp.counteragent_name as payment_supplier,
  CASE
    WHEN ABS(t.amount) = pp.amount THEN 'OK'
    ELSE 'MISMATCH'
  END as amount_check,
  CASE
    WHEN t.counteragent_name = pp.counteragent_name THEN 'OK'
    ELSE 'MISMATCH'
  END as supplier_check
FROM transactions t
JOIN pending_payments pp ON t.related_payment_id = pp.id
WHERE t.id IN (SELECT transaction_id FROM migration_092_payments)
  AND (ABS(t.amount) != pp.amount OR t.counteragent_name != pp.counteragent_name);
-- Expected: 0 rows (no mismatches)

-- 4d. Summary report
SELECT
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM migration_092_payments) as transactions_processed,
  (SELECT COUNT(*) FROM pending_payments WHERE id IN (SELECT new_payment_id FROM migration_092_payments)) as payments_created,
  (SELECT COUNT(*) FROM transactions WHERE id IN (SELECT transaction_id FROM migration_092_payments) AND related_payment_id IS NOT NULL) as transactions_linked,
  (SELECT SUM(amount) FROM migration_092_payments) as total_amount;

-- ROLLBACK (if needed):
--
-- -- Delete created payments
-- DELETE FROM pending_payments
-- WHERE id IN (SELECT new_payment_id FROM migration_092_payments);
--
-- -- Clear related_payment_id from transactions
-- UPDATE transactions
-- SET related_payment_id = NULL, updated_at = NOW()
-- WHERE id IN (SELECT transaction_id FROM migration_092_payments);
```

### 4.3 Migration Execution Plan

**Phase 1: Preparation (DEV environment)**

1. Run validation queries to understand data
2. Review sample transactions
3. Verify no duplicate payments will be created
4. Test migration on DEV database

**Phase 2: Backup**

1. Export pending_payments table: `pg_dump --table=pending_payments`
2. Export transactions table: `pg_dump --table=transactions`
3. Store backups with timestamp

**Phase 3: Execution (PRODUCTION)**

1. Schedule maintenance window (low traffic time)
2. Run migration script via Supabase SQL Editor
3. Verify each step completes successfully
4. Run all validation queries
5. Check for data integrity issues

**Phase 4: Verification**

1. Open Backoffice → Payments Management → Unlinked tab
2. Verify 95+ expenses now visible
3. Test linking one expense to purchase order
4. Verify order.bill_status updates correctly
5. Check that no duplicates appear

---

## 5. Edge Cases & Potential Bugs

### 5.1 Duplicate Detection

**Scenario:** What if same expense exists in both localStorage AND database?

**Solution:**

```typescript
// In unlinkedExpenses computed (Fix 3.2)
const knownPaymentIds = new Set(backofficePayments.map(p => p.relatedPaymentId).filter(Boolean))
const shiftUnlinked = shiftsStore
  .getExpensesByLinkingStatus('unlinked')
  .filter(e => !e.relatedPaymentId || !knownPaymentIds.has(e.relatedPaymentId))
```

**Testing:**

1. Create expense in POS (goes to localStorage)
2. Sync to database (creates payment)
3. Verify expense appears only once in Backoffice
4. Link expense to order
5. Verify it disappears from unlinked tab

### 5.2 Race Conditions

**Scenario:** POS creates expense while Backoffice links same expense

**Solution:**

- Use database transactions for linking
- `linkPaymentToOrder` already has atomic updates
- If conflict occurs, latest update wins (optimistic locking)

**Testing:**

1. Open same expense in POS and Backoffice
2. Link from POS (localStorage update)
3. Link from Backoffice (database update)
4. Verify database version wins
5. Next POS sync overwrites localStorage with DB state

### 5.3 Old Expenses from Before Commit 1f18659

**Scenario:** Expenses created before Jan 24 might have payments, expenses after don't

**Solution:**

```typescript
// Already handled in linkExpenseToInvoice (Fix 3.3)
if (!expense.relatedPaymentId) {
  throw new Error(
    'Expense has no payment ID. This expense may be from before the database migration.'
  )
}
```

**Testing:**

1. Find expense from Dec 26 (has payment)
2. Find expense from Jan 25 (no payment after migration)
3. After migration, both should have payments
4. Both should be linkable

### 5.4 Partial Links

**Scenario:** Payment partially used, remaining amount available

**Solution:**

- Already handled in `linkPaymentToOrder`
- Uses `payment.amount - payment.usedAmount` to calculate available
- Updates `usedAmount` after each link
- Multiple orders can share one payment

**Testing:**

1. Create Rp 1,000,000 expense
2. Link Rp 600,000 to Order A
3. Verify available amount = Rp 400,000
4. Link Rp 400,000 to Order B
5. Verify expense marked as 'linked' (fully used)

### 5.5 localStorage Has Unsync'd Expenses

**Scenario:** localStorage has expenses created offline, not yet synced to DB

**Solution:**

```typescript
// In unlinkedExpenses computed (Fix 3.2)
// POS shift expenses are FALLBACK source
// They only appear if not already in database
const shiftUnlinked = shiftsStore
  .getExpensesByLinkingStatus('unlinked')
  .filter(e => !e.relatedPaymentId || !knownPaymentIds.has(e.relatedPaymentId))
```

**Testing:**

1. Create expense offline (localStorage only)
2. Go to Backoffice
3. Verify expense appears (from localStorage fallback)
4. Go back online, trigger sync
5. Verify expense now in database
6. Verify no duplicate

### 5.6 Transaction Amount Mismatch

**Scenario:** Transaction shows -Rp 100,000, payment shows Rp 100,000

**Solution:**

```sql
-- Migration uses ABS() to convert negative to positive
ABS(t.amount) as amount
```

**Validation:**

```sql
-- Check for mismatches after migration
SELECT * FROM transactions t
JOIN pending_payments pp ON t.related_payment_id = pp.id
WHERE ABS(t.amount) != pp.amount;
```

**Testing:**

1. Check transaction table (amount is negative for expenses)
2. Check pending_payments table (amount is positive)
3. Verify migration converts correctly
4. Verify UI shows positive amounts

### 5.7 Missing Counteragent Info

**Scenario:** Old transaction has no counteragent_id

**Solution:**

```sql
-- Migration filters for transactions WITH counteragent_id
WHERE t.counteragent_id IS NOT NULL
```

**Manual Handling:**

- If transaction has no counteragent, skip in migration
- User must manually create payment for these
- Add warning in UI for transactions without payments

**Testing:**

1. Find transaction with NULL counteragent_id
2. Verify it's NOT included in migration
3. Verify it shows warning in UI
4. Manually create payment from Backoffice

---

## 6. Implementation Plan

### Phase 1: Fix Code Architecture (Priority: CRITICAL)

**Estimated Time:** 4 hours

**Tasks:**

- [ ] **Task 1.1:** Restore PendingPayment creation in createDirectExpense (Fix 3.1)
  - File: `src/stores/pos/shifts/shiftsStore.ts`
  - Lines: 643-653
  - Test: Create supplier expense in POS, verify payment appears in DB
- [ ] **Task 1.2:** Update unlinkedExpenses to read from DB (Fix 3.2)
  - File: `src/stores/pos/shifts/composables/useExpenseLinking.ts`
  - Lines: 138-156
  - Test: Clear localStorage, verify expenses still visible
- [ ] **Task 1.3:** Remove legacy mode from linkExpenseToInvoice (Fix 3.3)
  - File: `src/stores/pos/shifts/composables/useExpenseLinking.ts`
  - Lines: 409-491
  - Test: Link expense, verify DB updated (not just localStorage)
- [ ] **Task 1.4:** Add bill_status update to linkPaymentToOrder (Fix 3.4)
  - File: `src/stores/account/store.ts`
  - Lines: 1224-1274
  - Test: Link payment, verify order.bill_status changes

**Acceptance Criteria:**

- ✅ New POS expenses create payments in database
- ✅ Backoffice shows expenses from database (not localStorage)
- ✅ Linking updates database (not localStorage)
- ✅ Order bill_status updates after linking
- ✅ All tests pass

### Phase 2: Database Backfill (Priority: HIGH)

**Estimated Time:** 2 hours

**Tasks:**

- [ ] **Task 2.1:** Create migration SQL file
  - File: `src/supabase/migrations/092_backfill_missing_supplier_payments.sql`
  - Content: See section 4.2
  - Review: Have team member review SQL before execution
- [ ] **Task 2.2:** Test migration on DEV database
  - Run validation queries
  - Execute migration
  - Verify results
  - Test rollback procedure
- [ ] **Task 2.3:** Backup production database
  - Export pending_payments table
  - Export transactions table
  - Store with timestamp
- [ ] **Task 2.4:** Execute migration on PRODUCTION
  - Schedule low-traffic window
  - Run via Supabase SQL Editor
  - Monitor each step
  - Run validation queries
- [ ] **Task 2.5:** Verify migration results
  - Check unlinked count = 0
  - Check total payments created = 134
  - Check no data integrity issues
  - Test linking in UI

**Acceptance Criteria:**

- ✅ All 134 transactions have payments
- ✅ All payment amounts match transaction amounts
- ✅ All counteragent names match
- ✅ No duplicate payments created
- ✅ Rollback procedure tested and works

### Phase 3: Testing (Priority: HIGH)

**Estimated Time:** 3 hours

**Test Scenarios:**

**Test 3.1: New Expense Creation**

1. Open POS → Shift Management → Create Expense
2. Enter supplier expense (Bu'Dewa, Rp 100,000)
3. Submit
4. **Verify:** Transaction created in `transactions` table
5. **Verify:** Payment created in `pending_payments` table
6. **Verify:** Payment.status = 'completed'
7. **Verify:** Transaction.related_payment_id = Payment.id
8. Go to Backoffice → Payments Management → Unlinked tab
9. **Verify:** New expense appears in list

**Test 3.2: Expense Linking**

1. Open Backoffice → Payments Management → Unlinked tab
2. Find migrated expense (from Jan 25-29)
3. Click "Link to Order"
4. Select purchase order
5. Enter link amount
6. Submit
7. **Verify:** Payment.linked_orders updated in DB
8. **Verify:** Payment.used_amount increased
9. **Verify:** Order.bill_status updated ('not_billed' → 'partially_paid')
10. **Verify:** Expense moves from Unlinked to History tab

**Test 3.3: After localStorage Clear**

1. Open POS → Create 3 new expenses
2. Verify all 3 appear in Backoffice
3. Clear browser localStorage (DevTools → Application → Clear)
4. Refresh page
5. **Verify:** All 3 expenses still visible in Backoffice
6. **Verify:** Can still link expenses to orders
7. **Verify:** No errors in console

**Test 3.4: Partial Linking**

1. Create Rp 1,000,000 expense
2. Link Rp 600,000 to Order A
3. **Verify:** Available amount = Rp 400,000
4. **Verify:** Expense shows in "Partially Linked" section
5. Link Rp 400,000 to Order B
6. **Verify:** Expense moves to "History" (fully linked)
7. **Verify:** Both orders show correct paid amounts

**Test 3.5: Unlinking**

1. Find linked expense in History tab
2. Click "Unlink" on Order A
3. **Verify:** Payment.linked_orders updated (isActive=false)
4. **Verify:** Payment.used_amount decreased
5. **Verify:** Order A bill_status reverts
6. **Verify:** Expense moves back to Unlinked tab

**Test 3.6: Old Expenses (Pre-Migration)**

1. Find expense from Dec 26 - Jan 23 (has payment from before 1f18659)
2. Verify it appears in Unlinked tab
3. Link to order
4. **Verify:** Links successfully (no error)
5. **Verify:** Order bill_status updates

**Test 3.7: Duplicate Prevention**

1. Create expense in POS (localStorage)
2. Check Backoffice → Should appear once
3. Sync to database
4. Check Backoffice → Should still appear once (no duplicate)
5. Link expense
6. Verify localStorage and DB both updated

**Acceptance Criteria:**

- ✅ All 7 test scenarios pass
- ✅ No console errors
- ✅ No duplicate expenses
- ✅ Bill status always correct
- ✅ Data consistent between localStorage and DB

### Phase 4: Deployment (Priority: MEDIUM)

**Estimated Time:** 2 hours

**Tasks:**

- [ ] **Task 4.1:** Create deployment branch
  - Branch name: `fix/expense-linking-database-migration`
  - Include all code changes (Phase 1)
  - Include migration file (Phase 2)
- [ ] **Task 4.2:** Create pull request
  - Title: "Fix: Restore POS expense linking with database migration"
  - Description: Link to this spec document
  - Include before/after comparison
  - List breaking changes (none)
- [ ] **Task 4.3:** Code review
  - Request review from 2 team members
  - Address feedback
  - Get approval
- [ ] **Task 4.4:** Deploy to staging
  - Merge to `dev` branch
  - Vercel auto-deploy to staging
  - Run smoke tests
- [ ] **Task 4.5:** Run migration on PRODUCTION database
  - Coordinate with team (announce downtime if needed)
  - Execute migration SQL
  - Verify results
- [ ] **Task 4.6:** Deploy code to production
  - Merge to `main` branch
  - Vercel auto-deploy to production
  - Monitor for errors
- [ ] **Task 4.7:** Post-deployment verification
  - Test new expense creation
  - Test expense linking
  - Verify 95 expenses now visible
  - Check error logs

**Acceptance Criteria:**

- ✅ Code deployed to production
- ✅ Migration executed successfully
- ✅ All 95 expenses visible and linkable
- ✅ No regression in existing functionality
- ✅ No errors in production logs

---

## 7. Acceptance Criteria

### 7.1 Functional Requirements

- ✅ **FR-1:** All 134 unlinked supplier transactions have PendingPayment records
- ✅ **FR-2:** All 95 "invisible" expenses appear in Backoffice Payments Management
- ✅ **FR-3:** New POS expenses automatically create payments in database
- ✅ **FR-4:** Expense linking updates database (not just localStorage)
- ✅ **FR-5:** Order.bill_status updates automatically after linking
- ✅ **FR-6:** Expenses remain visible after localStorage clear
- ✅ **FR-7:** No duplicate expenses appear in UI
- ✅ **FR-8:** Partial linking works correctly (usedAmount tracking)
- ✅ **FR-9:** Unlinking works correctly (isActive flag)
- ✅ **FR-10:** Legacy expenses (pre-Jan 24) still linkable

### 7.2 Data Integrity Requirements

- ✅ **DI-1:** Every supplier transaction has matching payment
- ✅ **DI-2:** Transaction.related_payment_id always points to valid payment
- ✅ **DI-3:** Payment.amount matches Transaction.amount (absolute value)
- ✅ **DI-4:** Payment.counteragent_name matches Transaction.counteragent_name
- ✅ **DI-5:** Payment.linked_orders always in sync with order payments
- ✅ **DI-6:** Payment.usedAmount equals sum of linkedOrders.linkedAmount
- ✅ **DI-7:** Order.bill_status reflects actual payment state
- ✅ **DI-8:** No orphaned payments (payments without transactions)
- ✅ **DI-9:** No orphaned transactions (transactions without payments, except old data)
- ✅ **DI-10:** localStorage eventually consistent with database

### 7.3 Performance Requirements

- ✅ **PR-1:** Expense listing loads in < 2 seconds (even with 500+ expenses)
- ✅ **PR-2:** Linking operation completes in < 1 second
- ✅ **PR-3:** Migration completes in < 5 minutes
- ✅ **PR-4:** No N+1 queries in expense loading
- ✅ **PR-5:** Database queries use proper indexes

### 7.4 User Experience Requirements

- ✅ **UX-1:** Clear error messages for failed operations
- ✅ **UX-2:** Loading states during async operations
- ✅ **UX-3:** Success confirmation after linking
- ✅ **UX-4:** Warning if linking old expense without payment
- ✅ **UX-5:** Correct expense counts in tab badges
- ✅ **UX-6:** No UI flicker during data loading

---

## 8. Rollback Plan

### 8.1 Code Rollback

**If code changes cause issues:**

**Step 1:** Revert git commits

```bash
# Find deployment commit
git log --oneline -10

# Revert to previous stable version
git revert <commit-hash>

# Push to main (triggers Vercel deploy)
git push origin main
```

**Step 2:** Verify revert

- Check Vercel deployment status
- Test POS expense creation (should work as before)
- Test Backoffice (may show old issue with invisible expenses)

**Note:** Code rollback does NOT affect database migration (payments remain)

### 8.2 Database Rollback

**If migration creates data issues:**

**Step 1:** Verify issue

```sql
-- Check for data integrity problems
SELECT * FROM transactions t
JOIN pending_payments pp ON t.related_payment_id = pp.id
WHERE ABS(t.amount) != pp.amount;
```

**Step 2:** Execute rollback SQL

```sql
-- Delete payments created by migration
DELETE FROM pending_payments
WHERE id IN (SELECT new_payment_id FROM migration_092_payments);

-- Clear related_payment_id from transactions
UPDATE transactions
SET related_payment_id = NULL, updated_at = NOW()
WHERE id IN (SELECT transaction_id FROM migration_092_payments);

-- Verify rollback
SELECT COUNT(*) as unlinked_again
FROM transactions
WHERE expense_category->>'category' = 'supplier'
  AND related_payment_id IS NULL;
-- Should return 134
```

**Step 3:** Restore from backup (if needed)

```bash
# Restore pending_payments table
psql $DATABASE_URL < pending_payments_backup_2026-01-29.sql

# Restore transactions table
psql $DATABASE_URL < transactions_backup_2026-01-29.sql
```

### 8.3 Rollback Decision Matrix

| Scenario                             | Code Rollback? | DB Rollback? | Action                              |
| ------------------------------------ | -------------- | ------------ | ----------------------------------- |
| New expenses fail to create payments | ✅ Yes         | ❌ No        | Revert code, keep migrated payments |
| UI shows duplicate expenses          | ✅ Yes         | ❌ No        | Fix deduplication logic             |
| Linking fails for migrated expenses  | ✅ Yes         | ❌ No        | Fix linking logic                   |
| Migration created wrong data         | ❌ No          | ✅ Yes       | Keep code, rollback migration       |
| Performance degradation              | ✅ Maybe       | ❌ No        | Optimize queries                    |
| Data corruption                      | ❌ No          | ✅ Yes       | Restore from backup                 |

---

## 9. Monitoring & Validation

### 9.1 Post-Deployment Queries

**Run these queries after deployment to verify system health:**

```sql
-- Query 1: Unlinked supplier transactions (should be 0)
SELECT COUNT(*) as unlinked_count
FROM transactions
WHERE expense_category->>'category' = 'supplier'
  AND related_payment_id IS NULL
  AND status = 'completed'
  AND counteragent_id IS NOT NULL;
-- Expected: 0

-- Query 2: Total supplier payments
SELECT
  COUNT(*) as total_payments,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  SUM(amount) as total_amount,
  SUM(used_amount) as total_used,
  SUM(amount - COALESCE(used_amount, 0)) as total_available
FROM pending_payments
WHERE category = 'supplier';
-- Expected: 134+ payments, 30.9M+ total amount

-- Query 3: Payment-transaction integrity check
SELECT
  COUNT(*) as valid_links,
  COUNT(CASE WHEN ABS(t.amount) = pp.amount THEN 1 END) as amount_matches,
  COUNT(CASE WHEN t.counteragent_name = pp.counteragent_name THEN 1 END) as supplier_matches
FROM transactions t
JOIN pending_payments pp ON t.related_payment_id = pp.id
WHERE t.expense_category->>'category' = 'supplier';
-- Expected: All counts equal (100% data integrity)

-- Query 4: Unlinked payments available for linking
SELECT
  COUNT(*) as unlinked_payments,
  SUM(amount - COALESCE(used_amount, 0)) as available_amount
FROM pending_payments
WHERE category = 'supplier'
  AND status = 'completed'
  AND (linked_orders IS NULL OR linked_orders = '[]'::jsonb OR
       (SELECT SUM((lo->>'linkedAmount')::numeric)
        FROM jsonb_array_elements(linked_orders) lo
        WHERE (lo->>'isActive')::boolean) < amount);
-- Expected: 134+ payments, 30.9M+ available

-- Query 5: Orders awaiting payment
SELECT
  o.id,
  o.order_number,
  o.supplier_name,
  o.bill_status,
  o.actual_delivered_amount as order_total,
  COALESCE((
    SELECT SUM((lo->>'linkedAmount')::numeric)
    FROM pending_payments pp,
         jsonb_array_elements(pp.linked_orders) lo
    WHERE (lo->>'orderId')::text = o.id
      AND (lo->>'isActive')::boolean
      AND pp.status = 'completed'
  ), 0) as paid_amount
FROM supplierstore_orders o
WHERE o.bill_status IN ('not_billed', 'partially_paid')
  AND o.status NOT IN ('draft', 'cancelled')
ORDER BY o.created_at DESC
LIMIT 20;
-- Review: Check if paid amounts are correct

-- Query 6: Recent expense linking activity
SELECT
  pp.id,
  pp.counteragent_name,
  pp.amount,
  pp.used_amount,
  jsonb_array_length(pp.linked_orders) as orders_count,
  pp.updated_at
FROM pending_payments pp
WHERE pp.category = 'supplier'
  AND pp.status = 'completed'
  AND pp.linked_orders IS NOT NULL
  AND pp.linked_orders != '[]'::jsonb
ORDER BY pp.updated_at DESC
LIMIT 10;
-- Review: Recent linking activity looks correct
```

### 9.2 UI Testing Checklist

**Test these scenarios in production after deployment:**

**Checklist Item 1:** Verify unlinked expenses visible

- [ ] Go to Backoffice → Payments Management → Unlinked tab
- [ ] Verify ~95-134 expenses shown
- [ ] Check expense amounts match transactions table
- [ ] Verify supplier names correct

**Checklist Item 2:** Test new expense creation

- [ ] Open POS → Shift Management
- [ ] Create new supplier expense (Rp 50,000)
- [ ] Go to Backoffice → Payments Management
- [ ] Verify new expense appears in Unlinked tab (within 30 seconds)

**Checklist Item 3:** Test expense linking

- [ ] Click "Link to Order" on unlinked expense
- [ ] Select purchase order from list
- [ ] Enter link amount
- [ ] Submit
- [ ] Verify success message
- [ ] Verify expense moves to History tab
- [ ] Open purchase order → Verify bill_status updated

**Checklist Item 4:** Test localStorage clear resilience

- [ ] Note current expense count
- [ ] Open DevTools → Application → Clear Storage
- [ ] Refresh page
- [ ] Verify same expense count (no data loss)

**Checklist Item 5:** Test partial linking

- [ ] Find large expense (> Rp 500,000)
- [ ] Link 50% to Order A
- [ ] Verify available amount = 50%
- [ ] Link remaining 50% to Order B
- [ ] Verify expense fully linked

### 9.3 Performance Monitoring

**Monitor these metrics for 7 days after deployment:**

| Metric                    | Target  | Alert Threshold |
| ------------------------- | ------- | --------------- |
| Expense list load time    | < 2s    | > 5s            |
| Link operation time       | < 1s    | > 3s            |
| Database query time (avg) | < 100ms | > 500ms         |
| Error rate                | < 0.1%  | > 1%            |
| Failed payment creations  | 0       | > 5 per day     |

**Monitoring Tools:**

- Supabase Dashboard → Database → Query Performance
- Vercel Analytics → Function Logs
- Browser DevTools → Network tab (check API response times)

### 9.4 Error Monitoring

**Watch for these errors in logs:**

```typescript
// Error 1: Payment creation failed
'Failed to create payment for supplier expense'
// Action: Check database permissions, verify counteragent_id exists

// Error 2: Linking failed (no payment ID)
'Expense has no payment ID. Cannot link without payment record.'
// Action: Run migration query to backfill this expense

// Error 3: Duplicate payment creation
'duplicate key value violates unique constraint'
// Action: Check for race condition, verify deduplication logic

// Error 4: Bill status update failed
'Failed to update order bill_status'
// Action: Check order exists, verify permissions
```

**Error Reporting:**

- Supabase Dashboard → Logs → Filter by "error"
- Vercel Dashboard → Functions → View logs
- Browser Console → Check for client-side errors

---

## Appendix A: Database Schema Reference

### Table: transactions

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  account_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'income' | 'expense' | 'transfer'
  amount NUMERIC NOT NULL, -- Negative for expenses
  description TEXT NOT NULL,
  balance_after NUMERIC NOT NULL,
  expense_category JSONB, -- {type, category}
  counteragent_id TEXT,
  counteragent_name TEXT,
  related_payment_id TEXT, -- Link to pending_payments
  performed_by JSONB NOT NULL,
  status TEXT NOT NULL,
  -- ... other fields
);

-- Example supplier expense:
{
  "id": "tx_abc123",
  "type": "expense",
  "amount": -100000, -- Negative
  "expense_category": {"type": "expense", "category": "supplier"},
  "counteragent_id": "ca_budewa",
  "counteragent_name": "Bu'Dewa",
  "related_payment_id": "pp_xyz789", -- Link to payment
  "status": "completed"
}
```

### Table: pending_payments

```sql
CREATE TABLE pending_payments (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  counteragent_id TEXT NOT NULL,
  counteragent_name TEXT NOT NULL,
  amount NUMERIC NOT NULL, -- Positive
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'supplier' | 'other'
  status TEXT NOT NULL, -- 'pending' | 'completed' | 'cancelled'
  priority TEXT NOT NULL,
  used_amount NUMERIC DEFAULT 0, -- Amount already linked to orders
  linked_orders JSONB, -- Array of {orderId, linkedAmount, isActive}
  source_order_id TEXT, -- Original PO that created this payment
  paid_amount NUMERIC,
  paid_date TIMESTAMPTZ,
  assigned_to_account TEXT,
  -- ... other fields
);

-- Example completed supplier payment:
{
  "id": "pp_xyz789",
  "counteragent_id": "ca_budewa",
  "counteragent_name": "Bu'Dewa",
  "amount": 100000, -- Positive
  "category": "supplier",
  "status": "completed",
  "used_amount": 0, -- Not yet linked
  "linked_orders": [], -- Empty initially
  "paid_amount": 100000,
  "paid_date": "2026-01-25T10:30:00Z",
  "assigned_to_account": "acc_cash_register"
}
```

### Relationship Diagram

```
┌─────────────────────┐         ┌──────────────────────┐
│   transactions      │         │  pending_payments    │
├─────────────────────┤         ├──────────────────────┤
│ id                  │         │ id                   │
│ type: "expense"     │         │ category: "supplier" │
│ amount: -100000     │         │ amount: 100000       │
│ expense_category    │         │ status: "completed"  │
│ counteragent_id ────┼────┬───>│ counteragent_id      │
│ related_payment_id ─┼────┘    │ used_amount: 0       │
│ status: "completed" │         │ linked_orders: []    │
└─────────────────────┘         └──────────────────────┘
                                         │
                                         │ links to
                                         ▼
                                ┌──────────────────────┐
                                │ supplierstore_orders │
                                ├──────────────────────┤
                                │ id                   │
                                │ order_number         │
                                │ bill_status          │
                                │ total_amount         │
                                └──────────────────────┘
```

---

## Appendix B: Glossary

| Term                      | Definition                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| **POS**                   | Point of Sale - Tablet interface used by cashiers for shift management and direct expenses |
| **Backoffice**            | Web-based management interface for managers to link expenses to purchase orders            |
| **PendingPayment**        | Database record representing a payment (pending or completed) that can be linked to orders |
| **ShiftExpenseOperation** | POS expense record stored in localStorage within shift data                                |
| **Expense Linking**       | Process of associating a completed payment with a purchase order for accounting            |
| **relatedPaymentId**      | Foreign key linking transaction to its payment record                                      |
| **linkedOrders**          | JSONB array in payment showing which orders it's been allocated to                         |
| **usedAmount**            | Portion of payment already allocated to orders                                             |
| **bill_status**           | Order payment status: 'not_billed', 'partially_paid', 'fully_paid'                         |
| **Legacy Mode**           | Old code path for expenses without payment IDs (updates localStorage only)                 |
| **Modern Mode**           | New code path using payment IDs (updates database)                                         |

---

## Appendix C: References

- **Commit 1f18659**: "fix: remove duplicate pending payments in receipt and direct expense"
- **Migration 091**: Updated `complete_receipt_full` RPC to stop creating payments
- **File: shiftsStore.ts**: Lines 582-677 (createDirectExpense)
- **File: useExpenseLinking.ts**: Lines 97-655 (expense linking composable)
- **File: accountStore.ts**: Lines 1101-1274 (linkPaymentToOrder)
- **Database**: Production Supabase (bkntdcvzatawencxghob)

---

**Document End**

For questions or clarifications, contact the development team.
