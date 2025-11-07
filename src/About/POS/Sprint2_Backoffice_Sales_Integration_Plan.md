# Sprint 2: Backoffice Sales Integration & Inventory Write-off

**Date**: 2025-11-07
**Status**: 🔄 PLANNING
**Estimated Time**: 12-16 hours
**Priority**: HIGH

---

## 📋 Overview

Sprint 2 фокусируется на интеграции данных о продажах из POS в Backoffice и автоматическом списании остатков по рецептам.

### Current Problem

После завершения Sprint 1 у нас есть:

- ✅ **POS**: Полная система платежей (payments, orders, bills, items)
- ✅ **Menu**: Структура меню с вариантами и составами
- ✅ **Recipes**: Рецепты и полуфабрикаты с калькуляцией себестоимости
- ✅ **Storage**: Управление складом, партиями, остатками

**НО**: Нет связи между этими системами!

Когда в POS продается блюдо:

1. ✅ Создается `PosBillItem` с `menuItemId` + `variantId`
2. ✅ Создается `PosPayment` при оплате
3. ❌ **Backoffice не видит данные о продажах**
4. ❌ **Не происходит списание ингредиентов**
5. ❌ **Нет аналитики себестоимости vs выручки**

### Solution Architecture

```
POS Sales Data
  ↓
Sync Layer (localStorage → Backoffice)
  ↓
Sales Analytics (View/Reports)
  ↓
Inventory Write-off Engine
  ↓
Updated Storage Balances
```

---

## 🎯 Goals

### Business Goals:

1. **Видимость продаж** - backoffice должен видеть все транзакции из POS
2. **Автоматическое списание** - остатки должны уменьшаться при продаже
3. **Анализ прибыльности** - себестоимость vs цена продажи
4. **Контроль остатков** - понимание, сколько порций можно приготовить

### Technical Goals:

1. Унифицированный Data Flow: POS → Backoffice
2. Реактивное обновление остатков
3. Audit trail для всех списаний
4. Performance: списание должно работать быстро (< 100ms)

---

## 📦 Architecture Components

### 1. Data Models (Extension)

#### SalesTransaction (NEW)

```typescript
// Unified sales record for backoffice
interface SalesTransaction extends BaseEntity {
  // Reference data
  paymentId: string // Link to PosPayment
  orderId: string // Link to PosOrder
  billId: string // Link to PosBill
  itemId: string // Link to PosBillItem
  shiftId?: string // Link to PosShift

  // Menu data
  menuItemId: string
  menuItemName: string
  variantId: string
  variantName: string

  // Sale data
  quantity: number
  unitPrice: number
  totalPrice: number
  paymentMethod: PaymentMethod

  // Date/time
  soldAt: string
  processedBy: string

  // Recipe/Inventory link
  recipeId?: string // If menu item has recipe
  recipeWriteOffId?: string // Link to write-off operation

  // Sync status
  syncedToBackoffice: boolean
  syncedAt?: string

  // Department (for filtering)
  department: 'kitchen' | 'bar'
}
```

#### RecipeWriteOff (NEW)

```typescript
// Auto write-off based on sales
interface RecipeWriteOff extends BaseEntity {
  // Link to sale
  salesTransactionId: string
  menuItemId: string
  variantId: string
  recipeId?: string

  // Recipe data
  portionSize: number // Recipe portion size
  soldQuantity: number // Number of portions sold

  // Ingredients written off
  writeOffItems: RecipeWriteOffItem[]

  // Operation data
  department: Department
  operationType: 'auto_sales_writeoff'
  performedAt: string
  performedBy: string // 'system' or user

  // Storage operation link
  storageOperationId?: string // Link to StorageOperation
}

interface RecipeWriteOffItem {
  type: 'product' | 'preparation'
  itemId: string
  itemName: string
  quantityPerPortion: number
  totalQuantity: number // quantityPerPortion * soldQuantity
  unit: string
  costPerUnit: number
  totalCost: number

  // Batch tracking
  batchIds: string[] // Which batches were used
}
```

### 2. Stores Architecture

#### SalesStore (NEW)

```
src/stores/sales/
├── salesStore.ts           # Main store
├── services.ts             # CRUD operations
├── types.ts                # SalesTransaction types
├── composables/
│   ├── useSalesAnalytics.ts    # Analytics calculations
│   └── useSalesFilters.ts      # Filtering logic
└── index.ts
```

**Responsibilities:**

- Load sales transactions from POS data
- Sync with backoffice
- Provide analytics (revenue, popular items, etc.)
- Filter by date, menu item, payment method

#### RecipeWriteOffStore (NEW)

```
src/stores/sales/recipeWriteOff/
├── recipeWriteOffStore.ts  # Main store
├── services.ts             # Write-off engine
├── types.ts                # RecipeWriteOff types
├── composables/
│   ├── useWriteOffEngine.ts    # Core write-off logic
│   └── useDecomposition.ts     # Decomposition engine
└── index.ts
```

**Responsibilities:**

- Process sales → auto write-off
- Calculate ingredient quantities from recipe
- Update storage balances
- Create audit trail

### 3. Data Flow

#### Flow 1: POS Sales → Backoffice

```
User completes payment in POS
  ↓
paymentsStore.processSimplePayment()
  ↓
[NEW] salesStore.recordSalesTransaction(payment, billItems)
  ↓
Creates SalesTransaction records
  ↓
Triggers write-off for each item
```

#### Flow 2: Sales → Recipe Write-off

```
salesStore.recordSalesTransaction()
  ↓
For each billItem:
  ↓
recipeWriteOffStore.processItemWriteOff(billItem)
  ↓
1. Find MenuItemVariant
2. Get MenuComposition
3. For each composition:
   - If type='recipe': Get Recipe, calculate ingredients
   - If type='product': Write off directly
   - If type='preparation': Get Preparation, calculate ingredients
4. Calculate total quantities (quantity * soldPortions)
5. Select batches (FIFO)
6. Update storage balances
7. Create RecipeWriteOff record
8. Create StorageOperation (type='auto_sales_writeoff')
```

#### Flow 3: Backoffice Sales View

```
User opens Sales Analytics View
  ↓
salesStore.fetchSalesTransactions(filters)
  ↓
Display: revenue, items sold, popular dishes
  ↓
Click on item → Show write-off details
  ↓
recipeWriteOffStore.getWriteOffsByItem(itemId)
  ↓
Display: ingredients used, costs, batches
```

---

## 🎯 Sprint 2 Phases

### Phase 1: Data Models & Services (3-4 hours)

**Tasks:**

1. ✅ Create `src/stores/sales/types.ts`

   - Define `SalesTransaction` interface
   - Define analytics types

2. ✅ Create `src/stores/recipeWriteOff/types.ts`

   - Define `RecipeWriteOff` interface
   - Define `RecipeWriteOffItem` interface

3. ✅ Create `src/stores/sales/services.ts`

   - `SalesService.getAllTransactions()`
   - `SalesService.saveSalesTransaction()`
   - `SalesService.getSalesStatistics(filters)`

4. ✅ Create `src/stores/recipeWriteOff/services.ts`
   - `RecipeWriteOffService.getAllWriteOffs()`
   - `RecipeWriteOffService.saveWriteOff()`
   - `RecipeWriteOffService.getWriteOffsByItem()`

**Deliverables:**

- Types defined
- Services with localStorage persistence
- Unit tests (optional)

---

### Phase 2: Write-off Engine (4-5 hours)

**Tasks:**

1. ✅ Create `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts`

   - Core logic for recipe → ingredients calculation
   - Recursive decomposition
   - Product merging

2. ✅ Create `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts`

   - Initialize store
   - `processItemWriteOff(billItem)` - main method
   - Integration with storageStore
   - Integration with recipesStore
   - Integration with menuStore

3. ✅ Update `src/stores/pos/payments/paymentsStore.ts`

   - Add call to `salesStore.recordSalesTransaction()` after payment
   - Trigger write-off for each paid item

4. ✅ Integration testing
   - Test: Sell 1 dish → verify ingredients written off
   - Test: Sell 2 portions → verify quantities doubled
   - Test: Recipe with preparations → verify nested write-off
   - Test: Direct product → verify direct write-off

**Deliverables:**

- Working write-off engine
- Storage balances update automatically
- Audit trail in RecipeWriteOff records

**Critical Logic:**

```typescript
// Pseudo-code for write-off engine
async function processItemWriteOff(billItem: PosBillItem) {
  // 1. Get menu item variant
  const menuItem = menuStore.getMenuItem(billItem.menuItemId)
  const variant = menuItem.variants.find(v => v.id === billItem.variantId)

  // 2. Process composition
  const writeOffItems: RecipeWriteOffItem[] = []

  for (const comp of variant.composition) {
    if (comp.type === 'recipe') {
      // Get recipe and its ingredients
      const recipe = recipesStore.getRecipeById(comp.id)
      const ingredients = getRecipeIngredients(recipe)

      for (const ingredient of ingredients) {
        const qty = ingredient.quantity * comp.quantity * billItem.quantity
        writeOffItems.push({
          type: ingredient.type,
          itemId: ingredient.itemId,
          totalQuantity: qty
          // ...
        })
      }
    } else if (comp.type === 'product') {
      // Direct product write-off
      const qty = comp.quantity * billItem.quantity
      writeOffItems.push({
        type: 'product',
        itemId: comp.id,
        totalQuantity: qty
        // ...
      })
    } else if (comp.type === 'preparation') {
      // Get preparation and its ingredients
      const prep = recipesStore.getPreparationById(comp.id)
      const ingredients = getPreparationIngredients(prep)

      for (const ingredient of ingredients) {
        const qty = ingredient.quantity * comp.quantity * billItem.quantity
        writeOffItems.push({
          type: ingredient.type,
          itemId: ingredient.itemId,
          totalQuantity: qty
          // ...
        })
      }
    }
  }

  // 3. Group by itemId (merge duplicates)
  const groupedItems = groupWriteOffItems(writeOffItems)

  // 4. Write off from storage (FIFO)
  for (const item of groupedItems) {
    await storageStore.writeOffBatches(item.itemId, item.totalQuantity)
  }

  // 5. Create RecipeWriteOff record
  const writeOff = createRecipeWriteOff(billItem, groupedItems)
  await recipeWriteOffService.saveWriteOff(writeOff)

  // 6. Create StorageOperation for audit trail
  await storageStore.createWriteOff({
    operationType: 'auto_sales_writeoff',
    items: groupedItems,
    department: menuItem.department,
    reason: `Auto write-off: ${menuItem.name} (${variant.name})`,
    referenceId: writeOff.id
  })
}
```

---

### Phase 3: Sales Store & Analytics (2-3 hours)

**Tasks:**

1. ✅ Create `src/stores/sales/salesStore.ts`

   - Initialize store
   - `recordSalesTransaction(payment, billItems)`
   - `fetchSalesTransactions(filters)`
   - Computed: revenue, items sold, etc.

2. ✅ Create `src/stores/sales/composables/useSalesAnalytics.ts`

   - Revenue by date range
   - Most popular items
   - Revenue by payment method
   - Department breakdown (kitchen vs bar)

3. ✅ Integration with paymentsStore
   - Update `processSimplePayment()` to call sales recording

**Deliverables:**

- Sales data persisted in localStorage
- Analytics calculations work
- Data ready for UI

---

### Phase 4: Backoffice UI Views (3-4 hours)

**Tasks:**

1. ✅ Create `src/views/backoffice/sales/SalesAnalyticsView.vue`

   - Date range filter
   - Revenue summary cards
   - Sales by menu item table
   - Sales by payment method chart
   - Department breakdown

2. ✅ Create `src/views/backoffice/sales/SalesTransactionsView.vue`

   - List all sales transactions
   - Filters: date, menu item, payment method, department
   - Click item → show write-off details

3. ✅ Create `src/views/backoffice/inventory/WriteOffHistoryView.vue`

   - List all write-offs (manual + auto)
   - Filter by type: manual, auto_sales_writeoff
   - Show ingredients used, costs, batches
   - Link to original sale transaction

4. ✅ Update `src/router/index.ts`

   - Add `/sales/analytics` route
   - Add `/sales/transactions` route
   - Add `/inventory/write-offs` route

5. ✅ Update navigation menu
   - Add "Sales" section
   - Add "Write-off History" link

**Deliverables:**

- Working UI for sales analytics
- Working UI for transactions list
- Working UI for write-off history
- All views responsive and user-friendly

**View Screenshots (Mock):**

#### Sales Analytics View:

```
┌─────────────────────────────────────────────────────┐
│ Sales Analytics                      [Date Range]   │
├─────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│ │ Revenue  │ │ Orders   │ │ Items    │ │ Avg     ││
│ │ 50,000k  │ │ 120      │ │ 450      │ │ 416k    ││
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                     │
│ Top Selling Items                                   │
│ ┌─────────────────────────────────────────────────┐│
│ │ 1. Nasi Goreng       120 sold    12,000k  ↓ 10%││
│ │ 2. Mie Goreng        100 sold    10,000k  ↑ 5% ││
│ │ 3. Ayam Bakar         80 sold     8,000k  - 0% ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Revenue by Payment Method           Department     │
│ ┌────────────────┐ ┌────────────────────────────┐ │
│ │ Cash    60%    │ │ Kitchen  70%               │ │
│ │ Card    30%    │ │ Bar      30%               │ │
│ │ QR      10%    │ └────────────────────────────┘ │
│ └────────────────┘                                 │
└─────────────────────────────────────────────────────┘
```

#### Write-off History View:

```
┌─────────────────────────────────────────────────────┐
│ Write-off History                 [Filters]         │
├─────────────────────────────────────────────────────┤
│ Type: [All | Manual | Auto Sales]                  │
│ Date: [Last 7 days]                                 │
│ Department: [All | Kitchen | Bar]                   │
├─────────────────────────────────────────────────────┤
│ Date       | Type          | Items | Cost    | By  │
│────────────┼───────────────┼───────┼─────────┼─────│
│ 2025-11-07 │ Auto: Nasi    │  5    │  5,000k │ Sys │
│            │ Goreng        │       │         │ tem │
│ 2025-11-07 │ Manual:       │  10   │ 10,000k │ Ali │
│            │ Spoilage      │       │         │     │
│ 2025-11-06 │ Auto: Mie     │  3    │  3,000k │ Sys │
│            │ Goreng        │       │         │ tem │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Unit Tests (Optional, but recommended):

- [ ] `useWriteOffEngine`: Calculate quantities correctly
- [ ] `useWriteOffEngine`: Handle nested recipes (recipe → preparation → product)
- [ ] `SalesService`: CRUD operations work
- [ ] `RecipeWriteOffService`: CRUD operations work

### Integration Tests (REQUIRED):

- [ ] Sell 1 dish → verify write-off created
- [ ] Sell 2 portions → verify quantities doubled
- [ ] Sell dish with recipe → verify ingredients written off
- [ ] Sell dish with preparation → verify nested ingredients written off
- [ ] Sell dish with direct product → verify product written off
- [ ] Check storage balances updated correctly
- [ ] Check StorageOperation created for audit trail
- [ ] Check RecipeWriteOff record persisted
- [ ] Check SalesTransaction record persisted

### UI Tests (Manual):

- [ ] Sales Analytics View shows correct data
- [ ] Filters work in Sales Transactions View
- [ ] Write-off History View shows all write-offs
- [ ] Click write-off → shows ingredient details
- [ ] Date range filter updates charts
- [ ] Export to CSV works (bonus feature)

---

## 📊 Key Metrics

### Performance:

- Write-off processing time: **< 100ms** per item
- Storage balance update: **< 50ms**
- Analytics calculation: **< 200ms**

### Data Integrity:

- All sales must create SalesTransaction
- All sales with recipes must create RecipeWriteOff
- All write-offs must update storage balances
- All operations must have audit trail

### User Experience:

- Auto write-off happens silently (no UI blocking)
- Analytics refresh on data change (reactive)
- Filters apply instantly (< 100ms)

---

## 🚀 Deployment Plan

### Database Migration:

- No migration needed (localStorage)
- New collections will be created automatically

### Initialization:

1. Add `salesStore` to `appInitializer.ts` (backoffice roles only)
2. Add `recipeWriteOffStore` to `appInitializer.ts` (backoffice roles only)
3. Update POS payment flow to trigger sales recording

### Rollback Plan:

- If write-off engine fails → disable auto write-off
- Manual write-offs still work via existing UI
- Sales data still recorded (no data loss)

---

## 📝 Future Enhancements (Sprint 3+)

### Predicted Stock Analysis:

- Calculate: "How many portions can I make with current stock?"
- Alert: "Low stock for popular item"
- Suggestion: "Order ingredients for next week"

### Cost vs Revenue Deep Dive:

- Profit margin per dish
- Identify most/least profitable items
- Price optimization suggestions

### Waste Tracking:

- Track spoilage vs sales write-off
- Calculate waste percentage
- Cost of waste per month

### Multi-location Support:

- Sync between multiple POS terminals
- Central backoffice for all locations
- Location-specific analytics

---

## 📚 Related Documents

- `Sprint1_Payment_Implementation_Summary.md` - Payment architecture
- `Sprint1_Extended_Implementation.md` - Shift management integration
- `Payment_Architecture_Final.md` - Original payment spec
- `TZ_*.md` - Technical specifications

---

## 👥 Team Notes

**Estimated Effort:**

- Phase 1 (Data Models): 3-4 hours
- Phase 2 (Write-off Engine): 4-5 hours
- Phase 3 (Sales Store): 2-3 hours
- Phase 4 (UI Views): 3-4 hours
- **Total: 12-16 hours**

**Risks:**

1. **Performance**: Write-off for complex recipes (many ingredients) might be slow
   - Mitigation: Batch updates, debounce
2. **Data Integrity**: Race conditions if multiple sales at once
   - Mitigation: Queue write-offs, process sequentially
3. **Recipe Changes**: Recipe updated after sale → historical write-off data invalid
   - Mitigation: Store ingredient data in RecipeWriteOff (snapshot)

**Success Criteria:**

- ✅ Backoffice can see all sales from POS
- ✅ Storage balances update automatically when selling
- ✅ Analytics show revenue, popular items, etc.
- ✅ Write-off history shows all operations
- ✅ Performance targets met
- ✅ No data loss or corruption

---

**Next Steps:**

1. Review this plan with team
2. Clarify questions/concerns
3. Start Phase 1 implementation
4. Regular check-ins after each phase

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
**Status**: 🔄 READY FOR REVIEW
