# Sprint 2: Quick Start Guide

**Status**: 🔄 READY TO START
**Estimated Time**: 12-16 hours
**Priority**: HIGH

---

## 🎯 What We're Building

**Goal**: Integrate POS sales data into Backoffice and automatically write off inventory when items are sold.

**Current Problem**:

- ✅ POS records sales and payments (Sprint 1)
- ❌ Backoffice can't see sales data
- ❌ Storage balances don't update when items are sold
- ❌ No cost vs revenue analysis

**After Sprint 2**:

- ✅ Backoffice sees all sales from POS
- ✅ Storage balances update automatically on sale
- ✅ Full analytics: revenue, popular items, profitability
- ✅ Complete audit trail for all inventory changes

---

## 📋 Implementation Phases

### Phase 1: Data Models & Services (3-4 hours)

**Goal**: Define data structures and basic CRUD operations

**Tasks**:

1. Create `SalesTransaction` type in `src/stores/sales/types.ts`
2. Create `RecipeWriteOff` type in `src/stores/sales/recipeWriteOff/types.ts`
3. Create `SalesService` in `src/stores/sales/services.ts`
4. Create `RecipeWriteOffService` in `src/stores/sales/recipeWriteOff/services.ts`

**Deliverable**: Types and services ready to use

---

### Phase 2: Write-off Engine (4-5 hours)

**Goal**: Build the core logic to automatically write off ingredients when items are sold

**Tasks**:

1. Create `useWriteOffEngine` composable

   - Resolve menu item → recipe → ingredients
   - Calculate total quantities
   - Select batches (FIFO)
   - Update storage balances

2. Create `recipeWriteOffStore`

   - Main method: `processItemWriteOff(billItem)`
   - Integration with storage, recipes, menu stores

3. Update `paymentsStore.processSimplePayment()`

   - Add call to sales recording
   - Trigger write-off for each paid item

4. Integration testing
   - Test various scenarios (see below)

**Deliverable**: Working write-off engine with storage updates

---

### Phase 3: Sales Store & Analytics (2-3 hours)

**Goal**: Record sales data and provide analytics calculations

**Tasks**:

1. Create `salesStore`

   - Method: `recordSalesTransaction(payment, billItems)`
   - Computed: revenue, items sold, popular items

2. Create `useSalesAnalytics` composable

   - Revenue by date range
   - Top selling items
   - Payment method breakdown
   - Department breakdown

3. Integration with paymentsStore

**Deliverable**: Sales data persisted and analytics ready

---

### Phase 4: Backoffice UI (3-4 hours)

**Goal**: Build user interfaces for viewing sales and write-offs

**Tasks**:

1. Create `SalesAnalyticsView.vue`

   - Revenue summary cards
   - Top selling items table
   - Charts (payment methods, departments)

2. Create `SalesTransactionsView.vue`

   - List all transactions
   - Filters: date, item, payment method
   - Click → show write-off details

3. Create `WriteOffHistoryView.vue`

   - List all write-offs (manual + auto)
   - Show ingredients, costs, batches
   - Link to original sale

4. Update router and navigation menu

**Deliverable**: Working UI views for sales and write-offs

---

## 🧪 Critical Test Scenarios

### Scenario 1: Simple Product Sale

```
Menu Item: "Coke 330ml"
Composition:
  - type: product
  - id: coke_can
  - quantity: 1
  - unit: piece

Expected:
  ✅ SalesTransaction created
  ✅ Write-off 1 piece of coke_can
  ✅ Storage balance updated
  ✅ RecipeWriteOff record created
  ✅ StorageOperation created
```

### Scenario 2: Recipe-based Sale

```
Menu Item: "Nasi Goreng"
Composition:
  - type: recipe
  - id: recipe_nasi_goreng
  - quantity: 1
  - unit: portion

Recipe Ingredients:
  - Rice: 250g
  - Garlic: 10g
  - Onion: 20g
  - Soy Sauce: 15ml
  - Oil: 20ml
  - Egg: 1 piece

Expected:
  ✅ SalesTransaction created
  ✅ Write-off all 6 ingredients
  ✅ Storage balances updated for all items
  ✅ RecipeWriteOff record with all items
  ✅ StorageOperation created
```

### Scenario 3: Preparation-based Sale

```
Menu Item: "Burger"
Composition:
  - type: preparation
  - id: prep_patty
  - quantity: 1
  - unit: piece

Preparation Ingredients:
  - Ground beef: 150g
  - Salt: 2g
  - Pepper: 1g

Expected:
  ✅ SalesTransaction created
  ✅ Write-off all 3 ingredients (resolved from preparation)
  ✅ Storage balances updated
  ✅ RecipeWriteOff record created
  ✅ StorageOperation created
```

### Scenario 4: Mixed Composition

```
Menu Item: "Nasi Goreng with Chicken"
Variant Composition:
  - type: recipe (nasi_goreng base)
  - type: product (chicken_breast, 150g)

Expected:
  ✅ Write-off recipe ingredients (6 items)
  ✅ Write-off chicken (1 item)
  ✅ Total 7 items written off
  ✅ All records created correctly
```

### Scenario 5: Multiple Portions

```
Menu Item: "Mie Goreng" x 3 portions

Expected:
  ✅ All quantities multiplied by 3
  ✅ Storage balances reflect 3x write-off
  ✅ RecipeWriteOff shows soldQuantity: 3
```

---

## 🔑 Key Files to Create

### Phase 1: Data Layer

```
src/stores/sales/
├── types.ts                  # NEW
├── services.ts               # NEW
├── index.ts                  # NEW
└── recipeWriteOff/
    ├── types.ts              # NEW
    ├── services.ts           # NEW
    └── index.ts              # NEW
```

### Phase 2: Business Logic

```
src/stores/sales/recipeWriteOff/
├── recipeWriteOffStore.ts    # NEW
└── composables/
    ├── useWriteOffEngine.ts  # NEW
    └── useDecomposition.ts   # NEW
```

### Phase 3: Sales Store

```
src/stores/sales/
├── salesStore.ts             # NEW
└── composables/
    ├── useSalesAnalytics.ts  # NEW
    └── useSalesFilters.ts    # NEW (optional)
```

### Phase 4: UI Views

```
src/views/backoffice/sales/
├── SalesAnalyticsView.vue    # NEW
└── SalesTransactionsView.vue # NEW

src/views/backoffice/inventory/
└── WriteOffHistoryView.vue   # NEW
```

### Files to Modify

```
src/stores/pos/payments/paymentsStore.ts  # Add sales recording
src/core/appInitializer.ts                # Add new stores
src/router/index.ts                       # Add new routes
src/views/backoffice/BackofficeLayout.vue # Update menu
```

---

## 🚀 Step-by-Step Getting Started

### Day 1: Foundation (Phase 1)

**Morning (2 hours)**:

1. ☐ Create `src/stores/sales/types.ts`

   - Define `SalesTransaction` interface
   - Define analytics types
   - Export all types

2. ☐ Create `src/stores/sales/recipeWriteOff/types.ts`
   - Define `RecipeWriteOff` interface
   - Define `RecipeWriteOffItem` interface
   - Export all types

**Afternoon (2 hours)**: 3. ☐ Create `src/stores/sales/services.ts`

- Implement `SalesService` class
- Methods: getAllTransactions, saveSalesTransaction, getStatistics
- Use localStorage for persistence

4. ☐ Create `src/stores/sales/recipeWriteOff/services.ts`
   - Implement `RecipeWriteOffService` class
   - Methods: getAllWriteOffs, saveWriteOff, getWriteOffsByItem
   - Use localStorage for persistence

**Evening (optional)**: 5. ☐ Write unit tests for services (optional but recommended)

---

### Day 2: Write-off Engine (Phase 2)

**Morning (2 hours)**:

1. ☐ Create `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts`
   - Implement `decomposeMenuItem()` - main method
   - Implement `decomposeComposition()` - recursive resolver
   - Implement `mergeDecomposedItems()` - merge duplicates
   - Handle all 3 types: recipe, preparation, product

**Afternoon (3 hours)**: 2. ☐ Create `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts`

- Initialize store
- Implement `processItemWriteOff(billItem)` - main method
- Integration with storageStore (write-off batches)
- Integration with recipesStore (get recipes/preparations)
- Integration with menuStore (get menu items)

3. ☐ Update `src/stores/pos/payments/paymentsStore.ts`
   - Import salesStore and recipeWriteOffStore
   - Add call after payment success:
     ```typescript
     await salesStore.recordSalesTransaction(payment, billItems)
     ```

**Evening**: 4. ☐ Integration testing

- Test Scenario 1: Simple product sale
- Test Scenario 2: Recipe-based sale
- Test Scenario 3: Preparation-based sale
- Verify storage balances updated
- Verify records created

---

### Day 3: Sales Store & Analytics (Phase 3)

**Morning (2 hours)**:

1. ☐ Create `src/stores/sales/salesStore.ts`

   - Initialize store
   - Implement `recordSalesTransaction(payment, billItems)`
   - Computed: todayRevenue, todayItemsSold, popularItems
   - Method: `fetchSalesTransactions(filters)`

2. ☐ Create `src/stores/sales/composables/useSalesAnalytics.ts`
   - `calculateRevenue(transactions, dateRange)`
   - `getTopSellingItems(transactions, limit)`
   - `getRevenueByPaymentMethod(transactions)`
   - `getRevenueByDepartment(transactions)`

**Afternoon**: 3. ☐ Update `src/core/appInitializer.ts`

- Add salesStore initialization (backoffice only)
- Add recipeWriteOffStore initialization (backoffice only)

4. ☐ Integration testing
   - Create sample sales
   - Verify analytics calculate correctly
   - Verify filters work

---

### Day 4: Backoffice UI (Phase 4)

**Morning (2 hours)**:

1. ☐ Create `src/views/backoffice/sales/SalesAnalyticsView.vue`
   - Revenue summary cards (total, avg, count)
   - Top selling items table (with filters)
   - Payment method breakdown (chart or table)
   - Department breakdown (kitchen vs bar)

**Afternoon (2 hours)**: 2. ☐ Create `src/views/backoffice/sales/SalesTransactionsView.vue`

- Transactions list (v-data-table)
- Filters: date range, menu item, payment method
- Click row → show write-off details dialog
- Export to CSV button (optional)

3. ☐ Create `src/views/backoffice/inventory/WriteOffHistoryView.vue`
   - Write-offs list (manual + auto)
   - Filter by type: all, manual, auto_sales_writeoff
   - Click row → show ingredients, costs, batches
   - Link to original sale transaction

**Evening**: 4. ☐ Update router and navigation

- Add routes to `src/router/index.ts`
- Update navigation menu in BackofficeLayout.vue
- Test all navigation links work

5. ☐ Final testing
   - End-to-end: POS sale → Backoffice view
   - Check all filters work
   - Check all links work
   - Performance check (< 200ms for analytics)

---

## 💡 Pro Tips

### Tip 1: Start Simple

Begin with Scenario 1 (simple product sale) and make it work end-to-end before adding complexity.

### Tip 2: Log Everything

Add detailed console logs in write-off engine to debug issues:

```typescript
console.log('🔍 Resolving composition for:', billItem.menuItemName)
console.log('📦 Ingredients to write off:', writeOffItems)
console.log('✅ Write-off completed:', result)
```

### Tip 3: Use Vue DevTools

Monitor Pinia stores in Vue DevTools to see state changes in real-time.

### Tip 4: Test Incrementally

Don't wait until everything is done to test. Test after each phase.

### Tip 5: Handle Edge Cases

- Recipe not found → log warning, skip write-off
- Product out of stock → log error, show notification
- Batch not found → log error, use next batch

---

## 🐛 Common Issues & Solutions

### Issue 1: Write-off not triggered

**Symptom**: Payment succeeds but no write-off happens
**Check**:

- Is `salesStore.recordSalesTransaction()` called in `processSimplePayment()`?
- Are errors caught and logged?
- Check browser console for errors

### Issue 2: Ingredients not written off

**Symptom**: RecipeWriteOff created but storage balances unchanged
**Check**:

- Does `storageStore.writeOffBatches()` exist?
- Are batches available (not out of stock)?
- Check FIFO logic for batch selection

### Issue 3: Wrong quantities

**Symptom**: Write-off quantities don't match expected
**Check**:

- Is `quantity * soldPortions` calculated correctly?
- Are units converted properly (kg → g)?
- Are duplicate items merged correctly?

### Issue 4: Performance slow

**Symptom**: Write-off takes > 100ms
**Solution**:

- Batch storage updates (update all at once)
- Use indexedDB instead of localStorage (for large datasets)
- Debounce write-off calls (queue and process)

---

## ✅ Definition of Done

Sprint 2 is complete when:

### Functional Requirements:

- [ ] POS sale triggers sales recording
- [ ] Sales recording triggers auto write-off
- [ ] Storage balances update correctly
- [ ] All 5 test scenarios pass
- [ ] Backoffice views show correct data
- [ ] Filters and navigation work

### Technical Requirements:

- [ ] No console errors
- [ ] Performance targets met (< 100ms write-off, < 200ms analytics)
- [ ] All TypeScript types defined
- [ ] All stores initialized properly
- [ ] localStorage persistence works
- [ ] Code follows project conventions

### Documentation:

- [ ] Sprint 2 summary document created
- [ ] Architecture diagram updated
- [ ] API documentation for new stores (optional)

---

## 📚 Reference Documents

- **Sprint2_Backoffice_Sales_Integration_Plan.md** - Full detailed plan
- **Sprint2_Architecture_Diagram.md** - Visual architecture and data flow
- **Sprint1_Extended_Implementation.md** - Reference for POS integration
- **Payment_Architecture_Final.md** - Payment system architecture

---

## 🎉 After Sprint 2

You will have:

- ✅ Complete POS → Backoffice integration
- ✅ Automatic inventory write-offs
- ✅ Sales analytics and reporting
- ✅ Full audit trail
- ✅ Foundation for Sprint 3 (advanced analytics, predictions)

**Ready to start? Begin with Phase 1, Day 1, Morning! 🚀**

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
