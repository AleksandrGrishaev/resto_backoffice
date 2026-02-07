# Task: Investigate Shift Close Payment Breakdown & Expense Sync

## Problem Statement

After closing a shift with delivery channel orders (GoFood/GoBiz), the payment breakdown and expense sync to Account Store appears to not work correctly. Need to verify the full chain and fix any issues.

---

## Context: Recent Changes (this session)

### 1. ShiftSyncAdapter fixes (`src/core/sync/adapters/ShiftSyncAdapter.ts`)

- **Fixed `methodType` → `methodCode` bug (line 214):** `SalesTransaction.paymentMethod` stores the PM **code** (e.g. `'gopay'`, `'bni'`), but the old code used `paymentMethod.type` (which is `'cash'` | `'bank'`). They only matched for cash. For all non-cash PMs, `methodTxs` was empty → fell back to global tax rates AND skipped commission block entirely.
- **Added `channelCode` to `loadChannelCommissions`** query
- **Channel-specific commission categories:** `gobiz` → `gojek_commission`, `grab` → `grab_commission` (DB migration 146 applied to DEV)

### 2. PaymentDialog default method fix (`src/views/pos/payment/PaymentDialog.vue`)

- `resetForm()` now picks first available method for channel instead of hardcoding `'cash'`
- Fixes issue where delivery channels without cash method showed empty selection

### 3. P&L platformCommissions (`src/stores/analytics/plReportStore.ts`, `types.ts`, `PLReportView.vue`)

- Added `platformCommissions` and `netRevenue` to PLReport
- Gross/net profit now uses `netRevenue` as base

### 4. Revenue validation fix (`useOrderCalculations.ts`)

- Fixed Rule 3 validation for inclusive-tax channels: now accepts both `plannedRevenue = actualRevenue + discounts` (exclusive) and `plannedRevenue = actualRevenue + discounts + taxes` (inclusive)

---

## Investigation Plan

### Step 1: Verify Payment Method Flow (code vs type vs id)

The full chain should be:

```
PaymentDialog.selectedMethod (code: 'gopay')
  → PosPayment.method (code: 'gopay')
    → SalesTransaction.paymentMethod (code: 'gopay')
    → shift.paymentMethods[].methodCode (code: 'gopay')
      → ShiftSyncAdapter: paymentMethod.code matched to salesTx.paymentMethod ✓
```

**Check in browser console after making a delivery order + payment:**

```js
// After payment, check the shift's paymentMethods:
JSON.parse(localStorage.getItem('pos_shifts')).find(s => s.status === 'active')?.paymentMethods
// Verify methodCode, methodType, methodId, amount are correct
```

### Step 2: Verify Tax Calculation for Channel Orders

After the `methodCode` fix, channel-aware taxes should now work:

- GoFood order (inclusive 5% tax): revenue should be net (price / 1.05), NOT price / 1.15
- Dine-in order (exclusive 5% + 10%): revenue should be price, taxes added separately

**Check:** Close shift, look at console logs for:

```
📊 Channel-aware taxes from N transactions for GoPay: revenue=X, Service Tax=Y, Local Tax=Z
```

vs fallback:

```
📊 Fallback tax breakdown for GoPay: revenue=X, Service Tax=Y, Local Tax=Z
```

### Step 3: Verify Commission Creation

After the fix, commissions should be created for delivery channels:

```
✅ Commission expense created: txn_xxx (20800 → GoFood 20%)
```

**Check in Supabase:**

```sql
SELECT * FROM transactions
WHERE description LIKE '%Commission%'
ORDER BY created_at DESC LIMIT 10;
```

### Step 4: KNOWN BUG — Expense Sync Gap

**Critical finding from code analysis — two expense types are NOT synced:**

The sync adapter Loop 1 (line ~400) only creates transactions for `type === 'direct_expense'` AND `status === 'completed'`. But there are two creation paths that produce `type: 'supplier_payment'` + `status: 'completed'` WITHOUT creating a transaction:

| Path                                          | type               | status      | Has Transaction? | Synced?    | Risk     |
| --------------------------------------------- | ------------------ | ----------- | ---------------- | ---------- | -------- |
| `createDirectExpense` (non-supplier)          | `direct_expense`   | `completed` | No               | YES        | OK       |
| `createDirectExpense` (supplier)              | `supplier_payment` | `completed` | YES (immediate)  | Collected  | OK       |
| `confirmExpense`                              | `supplier_payment` | `confirmed` | YES (immediate)  | Collected  | OK       |
| **`createLinkedExpense`**                     | `supplier_payment` | `completed` | **NO**           | **MISSED** | **HIGH** |
| **`createUnlinkedExpense`** (no counteragent) | `supplier_payment` | `completed` | **NO**           | **MISSED** | **HIGH** |

**Root cause:** `ShiftSyncAdapter` line ~403 filter:

```typescript
if (expense.status !== 'completed' || expense.type !== 'direct_expense') {
  continue // Skips supplier_payment with completed status!
}
```

Loop 2 (line ~461) finds these supplier_payments but **only collects existing transactionIds** — it does NOT create new transactions. If `relatedTransactionId` is undefined (which it is for these paths), the expense amount is silently lost.

**Potential fix:** In the sync adapter, also create transactions for `supplier_payment` + `completed` + no `relatedTransactionId`.

### Step 5: Test Scenario

1. Open shift
2. Create GoFood delivery order → pay with GoPay → verify payment recorded
3. Create dine-in order → pay with cash → verify
4. Add a direct expense (e.g. "buy napkins") from POS
5. Add a supplier payment via `createLinkedExpense` path (if UI allows)
6. Close shift
7. **Verify in console:**
   - Revenue transactions: GoFood should have channel-aware tax (5% only, NOT 15%)
   - Commission: GoFood Commission (20%) expense should be created
   - Cash order: should have correct 5% + 10% tax breakdown
   - Direct expense: should have account transaction
   - Supplier payment: check if transaction was created
8. **Verify in Supabase:**
   ```sql
   SELECT description, type, amount, expense_category
   FROM transactions
   WHERE related_payment_id = '<shift_id>'
   ORDER BY created_at;
   ```

---

## Key Files

| File                                            | Purpose                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `src/core/sync/adapters/ShiftSyncAdapter.ts`    | Main sync logic — payment matching, tax calc, commission, expenses |
| `src/stores/pos/shifts/shiftsStore.ts`          | Shift management — endShift, expense operations, payment methods   |
| `src/stores/pos/shifts/services.ts`             | ShiftsService — updatePaymentMethods, getDefaultPaymentMethods     |
| `src/stores/pos/shifts/types.ts`                | PosShift, PaymentMethodSummary, ShiftExpenseOperation types        |
| `src/stores/pos/payments/paymentsStore.ts`      | processSimplePayment — creates PosPayment, updates shift           |
| `src/stores/catalog/payment-methods.service.ts` | PaymentMethod catalog (code, type, id, accountId)                  |
| `src/stores/sales/salesStore.ts`                | recordSalesTransaction — stores paymentMethod as code              |
| `src/views/pos/payment/PaymentDialog.vue`       | Payment UI — passes method code                                    |

---

## DB Context

- **DEV database:** `fjkfckjpnbcyuknsnchy` (MCP connected)
- **Migration 146 applied:** `gojek_commission`, `grab_commission`, `platform_commission` categories (is_opex=false, is_system=true)
- **Channels seeded:** dine_in (11% tax excl), takeaway (11% tax excl), gobiz (5% tax incl, 20% commission), grab (5% tax incl, 25% commission)
