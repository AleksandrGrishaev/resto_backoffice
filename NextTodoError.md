# Task: Refactor Revenue Dashboard to use sales_transactions instead of orders

## Problem Description

**Current Implementation (INCORRECT):**

- Revenue Dashboard uses `ordersStore` (POS orders) for financial analytics
- Added `manager` role to `shouldLoadPOSStores()` to load orders for analytics
- OrdersStore tracks order **preparation status** (draft � waiting � cooking � served)
- OrdersStore is NOT designed for financial reporting

**Why this is wrong:**

1. OrdersStore contains operational data (kitchen workflow), not financial data
2. Orders don't have final revenue breakdown with taxes and discounts applied
3. Loading POS stores for backoffice analytics is architectural violation
4. Manager role shouldn't need POS system just for reports

**Correct Approach:**
Use **SalesStore (sales_transactions)** which tracks:

-  Final revenue per item (with taxes, discounts applied)
-  Discount allocations (item + bill level)
-  Payment methods and amounts
-  Profit calculations with actual costs
-  Write-off references

## Evidence from Logs

**SalesStore has all needed data:**

```javascript
[SalesStore] Recording sales transaction: {
  amount: 43987.5,           // Total collected (with taxes)
  billDiscountAmount: 6750,  // Bill-level discounts
  itemsCount: 1,
  profit_calculation: {...}, // Item price, discounts, costs
  service_tax_amount: ...,   // Tax breakdown
  government_tax_amount: ...
}
```

**DiscountEvents already tracked:**

```javascript
[DiscountSupabaseService]: Saving discount event to database {
  discountAmount: 6750,
  type: 'bill',
  reason: 'service_issue',
  applied_at: '...'
}
```

## Required Changes

### 1.  Revert manager role change (DONE MANUALLY)

**File:** `src/core/initialization/dependencies.ts:151`

```typescript
// REVERT THIS:
export function shouldLoadPOSStores(userRoles: UserRole[]): boolean {
  return userRoles.some(role => ['admin', 'manager', 'cashier', 'waiter'].includes(role))
  //                                      ^^^^^^^^ REMOVE!
}

// TO:
export function shouldLoadPOSStores(userRoles: UserRole[]): boolean {
  return userRoles.some(role => ['admin', 'cashier', 'waiter'].includes(role))
}
```

### 2. Refactor useDiscountAnalytics.ts

**File:** `src/stores/discounts/composables/useDiscountAnalytics.ts`

**Change imports:**

```typescript
// OLD:
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
const ordersStore = usePosOrdersStore()

// NEW:
import { useSalesStore } from '@/stores/sales'
const salesStore = useSalesStore()
```

**Change data source:**

```typescript
// OLD: Filter orders by payment_status
const orders = ordersStore.orders.filter(order => {
  const orderDate = order.createdAt.split('T')[0]
  return orderDate >= startDate && orderDate <= endDate && order.paymentStatus === 'paid'
})

// NEW: Group sales_transactions by payment_id
const transactions = salesStore.transactions.filter(tx => {
  const txDate = tx.sold_at.split('T')[0]
  return txDate >= startDate && txDate <= endDate
})

// Group by payment_id to get order-level metrics
const groupedByPayment = transactions.reduce((acc, tx) => {
  const key = tx.payment_id
  if (!acc[key]) {
    acc[key] = {
      payment_id: key,
      items: [],
      total_revenue: 0,
      total_discounts: 0,
      total_taxes: 0
    }
  }

  acc[key].items.push(tx)
  acc[key].total_revenue += tx.total_price

  // Sum discounts from profit_calculation
  const itemDiscount = tx.profit_calculation?.item_own_discount || 0
  const billDiscount = tx.profit_calculation?.allocated_bill_discount || 0
  acc[key].total_discounts += itemDiscount + billDiscount

  // Sum taxes
  acc[key].total_taxes += (tx.service_tax_amount || 0) + (tx.government_tax_amount || 0)

  return acc
}, {})
```

**Recalculate metrics:**

```typescript
// Planned Revenue = sum of (unit_price * quantity) before discounts
const plannedRevenue = transactions.reduce((sum, tx) => sum + tx.unit_price * tx.quantity, 0)

// Actual Revenue = sum of total_price (after item discounts, before taxes)
const actualRevenue = transactions.reduce((sum, tx) => sum + tx.total_price, 0)

// Total Collected = sum of (total_price + taxes)
const totalCollected = transactions.reduce(
  (sum, tx) =>
    sum + tx.total_price + (tx.service_tax_amount || 0) + (tx.government_tax_amount || 0),
  0
)

// Total Discounts = from profit_calculation
const totalDiscounts = transactions.reduce((sum, tx) => {
  const itemDiscount = tx.profit_calculation?.item_own_discount || 0
  const billDiscount = tx.profit_calculation?.allocated_bill_discount || 0
  return sum + itemDiscount + billDiscount
}, 0)
```

### 3. Update Revenue Dashboard component

**File:** `src/views/backoffice/analytics/RevenueDashboardView.vue`

**Remove OrdersStore import:**

```typescript
// Remove this:
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'

// Keep only:
import { useDiscountsStore } from '@/stores/discounts'
```

**Update store checks:**

```typescript
// Remove ordersStore check
const ordersStore = usePosOrdersStore() // DELETE

// Add salesStore check
const salesStore = useSalesStore()
DebugUtils.info(MODULE_NAME, '=� SalesStore check', {
  storeExists: !!salesStore,
  initialized: salesStore?.initialized,
  transactionsCount: salesStore?.transactions?.length || 0
})
```

### 4. Ensure SalesStore loads for backoffice roles

**File:** `src/core/initialization/DevInitializationStrategy.ts`

SalesStore is already loaded in `initializePOSStores()` for admin role.
But we need to ensure it loads for **manager** role in backoffice context.

**Option A:** Load SalesStore in `initializeBackofficeStores()` for analytics
**Option B:** Keep SalesStore in POS section, ensure admin loads it (current behavior)

**Recommended:** Option B - admin role already loads POS stores including sales.
Manager can view reports via shared data or RPC functions.

### 5. Database View Alternative (Optional - Future Enhancement)

Create a SQL view for revenue analytics:

```sql
CREATE VIEW revenue_analytics AS
SELECT
  DATE(st.sold_at) as transaction_date,
  st.payment_id,
  st.shift_id,
  -- Planned revenue (before discounts)
  SUM(st.unit_price * st.quantity) as planned_revenue,
  -- Actual revenue (after discounts, before tax)
  SUM(st.total_price) as actual_revenue,
  -- Total collected (with taxes)
  SUM(st.total_price + COALESCE(st.service_tax_amount, 0) + COALESCE(st.government_tax_amount, 0)) as total_collected,
  -- Discount breakdown
  SUM((st.profit_calculation->>'item_own_discount')::numeric) as item_discounts,
  SUM((st.profit_calculation->>'allocated_bill_discount')::numeric) as bill_discounts,
  -- Tax breakdown
  SUM(COALESCE(st.service_tax_amount, 0)) as service_tax,
  SUM(COALESCE(st.government_tax_amount, 0)) as government_tax,
  -- Item count
  COUNT(*) as items_count
FROM sales_transactions st
GROUP BY DATE(st.sold_at), st.payment_id, st.shift_id;
```

This would make analytics queries much faster and simpler.

## Testing Plan

1.  Verify SalesStore loads for admin role
2.  Check sales_transactions table has data
3.  Update analytics composable to use sales_transactions
4.  Test Revenue Dashboard shows correct metrics
5.  Verify discount events match sales_transactions
6.  Test date range filtering
7.  Test CSV export

## Priority

**HIGH** - Current implementation loads unnecessary POS stores for backoffice users and uses wrong data source.

## Files to Change

1. `src/core/initialization/dependencies.ts` - Revert manager role
2. `src/stores/discounts/composables/useDiscountAnalytics.ts` - Use sales_transactions
3. `src/views/backoffice/analytics/RevenueDashboardView.vue` - Remove orders dependency
4. Optional: Create SQL view for performance

---

**Status:** Ready to implement
**Assigned:** Developer
**Estimated Time:** 2-3 hours
