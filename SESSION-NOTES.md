# Session Notes: Revenue Dashboard Refactoring

**Session Date:** 2025-12-04
**Status:** Phase 1 Complete - Ready for sales_transactions integration

---

## Summary

Revenue Dashboard was incorrectly using `OrdersStore` (POS operational data) for financial analytics. We discovered that:

- OrdersStore tracks **preparation status** (draft → cooking → served) - NOT financial data
- The correct source is **SalesStore (sales_transactions)** which has revenue, discounts, taxes

---

## What We Accomplished ✅

### 1. **Fixed DiscountsStore initialization**

- **File:** `src/stores/discounts/discountsStore.ts`
- **Change:** Added `supabaseService` import and implemented database loading
- **Result:** DiscountsStore now loads `discount_events` from Supabase
- **Status:** ✅ WORKING - discount events load successfully

### 2. **Added DiscountsStore to backoffice initialization**

- **File:** `src/core/initialization/DevInitializationStrategy.ts`
- **Change:** Added `loadDiscounts()` method and included in `initializeBackofficeStores()`
- **Result:** DiscountsStore initializes automatically for admin/manager roles
- **Status:** ✅ WORKING

### 3. **Reverted incorrect OrdersStore usage**

- **File:** `src/core/initialization/dependencies.ts`
- **Change:** Removed `'manager'` from `shouldLoadPOSStores()` - reverted to `['admin', 'cashier', 'waiter']`
- **Result:** Manager role no longer loads POS stores unnecessarily
- **Status:** ✅ REVERTED

### 4. **Cleaned up OrdersStore dependencies**

- **Files:**
  - `src/views/backoffice/analytics/RevenueDashboardView.vue`
  - `src/views/backoffice/analytics/DiscountAnalyticsView.vue`
  - `src/stores/discounts/composables/useDiscountAnalytics.ts`
- **Changes:** Removed all `usePosOrdersStore` imports and usage
- **Result:** Analytics components no longer depend on OrdersStore
- **Status:** ✅ CLEANED UP

### 5. **Documented complete refactoring plan**

- **File:** `NextTodoError.md`
- **Content:**
  - Problem description with evidence from logs
  - Detailed implementation plan (5 steps)
  - Code examples for each change
  - Testing plan
  - Optional SQL view for performance
- **Status:** ✅ DOCUMENTED

### 6. **Committed changes**

- **Commit:** `refactor: revert OrdersStore usage for Revenue Dashboard analytics`
- **Files changed:** 6 files
- **Status:** ✅ COMMITTED

---

## Current State of Revenue Dashboard

### What Works ✅

- DiscountsStore loads and initializes correctly
- discount_events table has data (verified in logs)
- Analytics views load without errors
- No POS stores loaded for manager role

### What Doesn't Work ❌

- Revenue metrics show **Rp 0** (empty orders array used as placeholder)
- Dashboard shows "REPORT HAS ZERO ORDERS!" warning
- OrderCount, plannedRevenue, actualRevenue all = 0

### Why It Doesn't Work

```typescript
// Current placeholder implementation
const orders: any[] = [] // Empty array!
DebugUtils.error(
  MODULE_NAME,
  '⚠️ DEPRECATED: Using orders as data source. Should use sales_transactions!'
)
```

---

## What's Next - Implementation Guide 🚀

### STEP 1: Update useDiscountAnalytics.ts to use sales_transactions

**File:** `src/stores/discounts/composables/useDiscountAnalytics.ts`

#### 1.1 Add SalesStore import

```typescript
import { useSalesStore } from '@/stores/sales'

export function useDiscountAnalytics() {
  const discountsStore = useDiscountsStore()
  const salesStore = useSalesStore() // ADD THIS
```

#### 1.2 Replace getDailyRevenueReport implementation

```typescript
async function getDailyRevenueReport(
  startDate: string,
  endDate: string
): Promise<DailyRevenueReport> {
  DebugUtils.info(MODULE_NAME, '📊 Generating daily revenue report', { startDate, endDate })

  // 1. Filter sales_transactions by date range
  const transactions = salesStore.transactions.filter(tx => {
    const txDate = tx.sold_at.split('T')[0]
    return txDate >= startDate && txDate <= endDate
  })

  DebugUtils.info(MODULE_NAME, '📦 Transactions filtered', {
    total: salesStore.transactions.length,
    filtered: transactions.length
  })

  // 2. Calculate Planned Revenue (before discounts)
  const plannedRevenue = transactions.reduce((sum, tx) => sum + tx.unit_price * tx.quantity, 0)

  // 3. Calculate Actual Revenue (after item discounts, before tax)
  const actualRevenue = transactions.reduce((sum, tx) => sum + tx.total_price, 0)

  // 4. Calculate Total Collected (with taxes)
  const totalCollected = transactions.reduce(
    (sum, tx) =>
      sum + tx.total_price + (tx.service_tax_amount || 0) + (tx.government_tax_amount || 0),
    0
  )

  // 5. Calculate Total Discounts from profit_calculation
  const totalDiscounts = transactions.reduce((sum, tx) => {
    const itemDiscount = tx.profit_calculation?.item_own_discount || 0
    const billDiscount = tx.profit_calculation?.allocated_bill_discount || 0
    return sum + itemDiscount + billDiscount
  }, 0)

  // 6. Get discount events count (from DiscountsStore)
  const discountEvents = discountsStore.discountEvents.filter(event => {
    const eventDate = event.appliedAt.split('T')[0]
    return eventDate >= startDate && eventDate <= endDate
  })
  const discountCount = discountEvents.length

  // 7. Calculate tax breakdown
  const taxBreakdown = transactions.reduce((acc, tx) => {
    // Service tax
    if (tx.service_tax_amount && tx.service_tax_rate) {
      const serviceTax = acc.find(t => t.name === 'Service Tax')
      if (serviceTax) {
        serviceTax.amount += tx.service_tax_amount
      } else {
        acc.push({
          taxId: 'service_tax',
          name: 'Service Tax',
          percentage: tx.service_tax_rate,
          amount: tx.service_tax_amount
        })
      }
    }

    // Government tax
    if (tx.government_tax_amount && tx.government_tax_rate) {
      const govTax = acc.find(t => t.name === 'Government Tax')
      if (govTax) {
        govTax.amount += tx.government_tax_amount
      } else {
        acc.push({
          taxId: 'government_tax',
          name: 'Government Tax',
          percentage: tx.government_tax_rate,
          amount: tx.government_tax_amount
        })
      }
    }

    return acc
  }, [] as TaxBreakdown[])

  const totalTaxes = taxBreakdown.reduce((sum, t) => sum + t.amount, 0)

  // 8. Calculate order-level statistics
  // Group transactions by payment_id to count unique orders
  const uniquePayments = new Set(transactions.map(tx => tx.payment_id))
  const orderCount = uniquePayments.size
  const averageOrderValue = orderCount > 0 ? totalCollected / orderCount : 0

  const report: DailyRevenueReport = {
    date: `${startDate} to ${endDate}`,
    plannedRevenue,
    actualRevenue,
    totalCollected,
    totalDiscounts,
    discountCount,
    totalTaxes,
    taxBreakdown,
    orderCount,
    averageOrderValue
  }

  DebugUtils.store(MODULE_NAME, '✅ Daily revenue report generated from sales_transactions', {
    plannedRevenue,
    actualRevenue,
    totalCollected,
    discountCount,
    orderCount,
    transactionsProcessed: transactions.length
  })

  return report
}
```

#### 1.3 Update getDiscountTransactions to enrich with sales data

```typescript
async function getDiscountTransactions(
  filterOptions?: DiscountFilterOptions
): Promise<DiscountTransactionView[]> {
  DebugUtils.info(MODULE_NAME, 'Getting discount transactions', { filterOptions })

  const events = discountsStore.getFilteredDiscounts(filterOptions)

  // Enrich with sales_transactions context
  const transactions: DiscountTransactionView[] = events.map(event => {
    // Find related sales transaction
    const salesTx = salesStore.transactions.find(
      tx => tx.order_id === event.orderId && tx.bill_id === event.billId
    )

    return {
      ...event,
      orderNumber: salesTx?.order_id
        ? `ORD-${salesTx.order_id.substring(0, 8)}`
        : `ORD-${event.orderId.substring(0, 8)}`,
      tableName: undefined, // Not available in sales_transactions
      orderType: undefined, // Not available in sales_transactions
      appliedByName: event.appliedBy || 'System',
      approvedByName: event.approvedBy || undefined
    }
  })

  DebugUtils.store(MODULE_NAME, 'Discount transactions retrieved', {
    count: transactions.length
  })

  return transactions
}
```

### STEP 2: Verify SalesStore is initialized

Check in browser console logs for:

```
[SalesStore] initialization
[SalesService] Loaded X transactions from Supabase
```

If not initialized, check:

- User role (must be `admin` to load SalesStore - it's in POS section)
- `shouldLoadPOSStores(['admin'])` returns `true`

### STEP 3: Test with real data

1. Open Revenue Dashboard: `/analytics/revenue`
2. Check console logs:
   - `[SalesStore]` should show transactions loaded
   - `[DiscountAnalytics]` should show transactions filtered
   - Should see actual revenue numbers (not Rp 0)
3. Generate report for date range with sales
4. Verify numbers match database

### STEP 4: Update component logs (optional)

**File:** `src/views/backoffice/analytics/RevenueDashboardView.vue`

Add SalesStore check:

```typescript
import { useSalesStore } from '@/stores/sales'

// In handleGenerateReport():
const salesStore = useSalesStore()
DebugUtils.info(MODULE_NAME, '📦 SalesStore check', {
  storeExists: !!salesStore,
  initialized: salesStore?.initialized,
  transactionsCount: salesStore?.transactions?.length || 0
})
```

---

## Database Schema Reference

### sales_transactions table

```sql
CREATE TABLE sales_transactions (
  id TEXT PRIMARY KEY,
  payment_id UUID,
  order_id UUID,
  bill_id TEXT,
  menu_item_name TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,      -- Original price per unit (before discounts)
  total_price NUMERIC,     -- Final price (after item discounts, before tax)
  sold_at TIMESTAMPTZ,

  -- Discount info (in profit_calculation JSONB)
  profit_calculation JSONB, -- {
  --   item_own_discount: number,
  --   allocated_bill_discount: number,
  --   final_revenue: number
  -- }

  -- Tax info
  service_tax_rate NUMERIC,
  service_tax_amount NUMERIC,
  government_tax_rate NUMERIC,
  government_tax_amount NUMERIC,
  total_tax_amount NUMERIC
)
```

### discount_events table

```sql
CREATE TABLE discount_events (
  id TEXT PRIMARY KEY,
  order_id UUID,
  bill_id TEXT,
  type TEXT,              -- 'item' | 'bill'
  discount_amount NUMERIC,
  reason TEXT,
  applied_at TIMESTAMPTZ,
  applied_by UUID
)
```

---

## Testing Data

**Verify data exists in Supabase:**

```sql
-- Check sales_transactions
SELECT
  COUNT(*) as total_transactions,
  MIN(sold_at) as first_sale,
  MAX(sold_at) as last_sale,
  SUM(total_price) as total_revenue,
  SUM(service_tax_amount + government_tax_amount) as total_taxes
FROM sales_transactions;

-- Check discount_events
SELECT
  COUNT(*) as total_events,
  SUM(discount_amount) as total_discounts,
  MIN(applied_at) as first_discount,
  MAX(applied_at) as last_discount
FROM discount_events;

-- Check if they match by date
SELECT
  DATE(st.sold_at) as date,
  COUNT(DISTINCT st.payment_id) as orders,
  SUM(st.unit_price * st.quantity) as planned_revenue,
  SUM(st.total_price) as actual_revenue,
  SUM(st.total_price + COALESCE(st.service_tax_amount, 0) + COALESCE(st.government_tax_amount, 0)) as total_collected,
  COUNT(de.id) as discount_count,
  SUM(de.discount_amount) as total_discounts
FROM sales_transactions st
LEFT JOIN discount_events de ON de.order_id = st.order_id
GROUP BY DATE(st.sold_at)
ORDER BY DATE(st.sold_at) DESC;
```

---

## Known Issues / Notes

1. **SalesStore loads only for admin role** (it's in POS section)

   - Manager users won't see data unless we move SalesStore to backoffice initialization
   - Options:
     - A) Add SalesStore to backoffice stores (recommended for analytics access)
     - B) Create read-only SQL view for revenue_analytics
     - C) Use RPC function to fetch aggregated data

2. **sales_transactions doesn't have order_type or table info**

   - Can't enrich DiscountTransactions with table names
   - Solution: Add to sales_transactions schema in future, or join with orders table

3. **TypeScript types need verification**
   - Check `SalesTransaction` type in `@/stores/sales/types`
   - Verify `profit_calculation` JSONB structure matches code

---

## Files Modified (Committed)

```
✅ src/core/initialization/DevInitializationStrategy.ts
✅ src/stores/discounts/discountsStore.ts
✅ src/stores/discounts/composables/useDiscountAnalytics.ts
✅ src/views/backoffice/analytics/RevenueDashboardView.vue
✅ src/views/backoffice/analytics/DiscountAnalyticsView.vue
✅ NextTodoError.md (documentation)
```

---

## Quick Start for Next Session

```bash
# 1. Pull latest changes
git pull

# 2. Checkout feature branch
git checkout feature/menu-implementation

# 3. Start dev server
pnpm dev

# 4. Open Revenue Dashboard
http://localhost:5174/analytics/revenue

# 5. Open browser console and look for:
#    - [SalesStore] initialization logs
#    - sales_transactions count
#    - Then implement STEP 1 from above
```

---

## Success Criteria

Revenue Dashboard should show:

- ✅ Planned Revenue > Rp 0 (from sales_transactions.unit_price \* quantity)
- ✅ Actual Revenue > Rp 0 (from sales_transactions.total_price)
- ✅ Total Collected > Rp 0 (from total_price + taxes)
- ✅ Total Discounts > Rp 0 (from discount_events)
- ✅ Order Count > 0 (distinct payment_ids)
- ✅ Tax Breakdown populated (service + government taxes)

---

**Ready to implement!** 🚀

All groundwork is done - just need to connect sales_transactions data source to analytics composable.
