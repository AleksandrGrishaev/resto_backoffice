# Sprint 2: Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              POS SYSTEM                                 │
│                         (Offline-first, LocalStorage)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User selects menu item → Creates Order → Processes Payment            │
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │
│  │ PosOrder     │──→│ PosBill      │──→│ PosBillItem  │              │
│  │              │   │              │   │              │              │
│  │ - orderNo    │   │ - billNo     │   │ - menuItemId │              │
│  │ - type       │   │ - items[]    │   │ - variantId  │              │
│  │ - status     │   │ - total      │   │ - quantity   │              │
│  │ - bills[]    │   │              │   │ - unitPrice  │              │
│  └──────────────┘   └──────────────┘   └──────────────┘              │
│         │                                       │                       │
│         │                                       │                       │
│         ▼                                       │                       │
│  ┌──────────────┐                              │                       │
│  │ PosPayment   │                              │                       │
│  │              │                              │                       │
│  │ - paymentNo  │                              │                       │
│  │ - amount     │                              │                       │
│  │ - method     │                              │                       │
│  │ - itemIds[]  │◄─────────────────────────────┘                       │
│  │ - shiftId    │                                                      │
│  └──────────────┘                                                      │
│         │                                                               │
│         │ ✨ NEW: Sprint 2 Integration Point                            │
│         │                                                               │
└─────────┼───────────────────────────────────────────────────────────────┘
          │
          │ Trigger on payment success
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       SALES RECORDING LAYER (NEW)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  salesStore.recordSalesTransaction(payment, billItems)                  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ For each PosBillItem:                                          │   │
│  │                                                                │   │
│  │  1. Create SalesTransaction record                            │   │
│  │  2. Trigger RecipeWriteOff process ──────────────────┐        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                          │              │
└──────────────────────────────────────────────────────────┼──────────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    WRITE-OFF ENGINE (NEW)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  recipeWriteOffStore.processItemWriteOff(billItem)                      │
│                                                                         │
│  Step 1: Resolve Menu Item                                             │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ menuStore.getMenuItem(menuItemId)                                │ │
│  │    → Find variant by variantId                                   │ │
│  │    → Get variant.composition[]                                   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                           │                                             │
│                           ▼                                             │
│  Step 2: Process Composition                                           │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ For each MenuComposition:                                        │ │
│  │                                                                  │ │
│  │  IF type = 'recipe':                                            │ │
│  │    → recipesStore.getRecipeById(id)                             │ │
│  │    → Extract recipe.components[] (products + preparations)      │ │
│  │    → Calculate: quantity * soldPortions                         │ │
│  │                                                                  │ │
│  │  IF type = 'preparation':                                       │ │
│  │    → recipesStore.getPreparationById(id)                        │ │
│  │    → Extract preparation.recipe[] (products)                    │ │
│  │    → Calculate: quantity * soldPortions                         │ │
│  │                                                                  │ │
│  │  IF type = 'product':                                           │ │
│  │    → Direct write-off                                           │ │
│  │    → Calculate: quantity * soldPortions                         │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                           │                                             │
│                           ▼                                             │
│  Step 3: Group Ingredients                                             │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Merge duplicate items (same itemId)                             │ │
│  │ Calculate total quantities                                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                           │                                             │
│                           ▼                                             │
│  Step 4: Write Off from Storage                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ storageStore.writeOffBatches(itemId, quantity)                   │ │
│  │                                                                  │ │
│  │  → Select batches (FIFO)                                        │ │
│  │  → Update batch.currentQuantity                                 │ │
│  │  → Update StorageBalance                                        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                           │                                             │
│                           ▼                                             │
│  Step 5: Create Audit Records                                          │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ 1. Create RecipeWriteOff record                                  │ │
│  │    → salesTransactionId, recipeId, writeOffItems[]              │ │
│  │                                                                  │ │
│  │ 2. Create StorageOperation record                                │ │
│  │    → operationType: 'auto_sales_writeoff'                       │ │
│  │    → items, department, reason, referenceId                     │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKOFFICE VIEWS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Sales Analytics View                                                │
│     ┌────────────────────────────────────────────────────────────┐    │
│     │ - Revenue summary (total, by date, by method)              │    │
│     │ - Top selling items                                        │    │
│     │ - Department breakdown (kitchen vs bar)                    │    │
│     │ - Charts and graphs                                        │    │
│     └────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  2. Sales Transactions View                                             │
│     ┌────────────────────────────────────────────────────────────┐    │
│     │ - List all sales transactions                              │    │
│     │ - Filters: date, item, payment method                      │    │
│     │ - Click item → show write-off details                      │    │
│     └────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  3. Write-off History View                                              │
│     ┌────────────────────────────────────────────────────────────┐    │
│     │ - List all write-offs (manual + auto)                      │    │
│     │ - Filter by type, date, department                         │    │
│     │ - Show ingredients, costs, batches used                    │    │
│     │ - Link to original sale                                    │    │
│     └────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Example: Selling "Nasi Goreng with Chicken"

### Step-by-Step Execution:

```
1. POS: User creates order
   ┌─────────────────────────────────────────┐
   │ Order #123                              │
   │ Type: dine_in                           │
   │ Table: 5                                │
   │                                         │
   │ Bill #1:                                │
   │   - Nasi Goreng (Chicken) x1  50,000   │
   │   - Teh Manis x1              10,000   │
   │                                         │
   │ Total: 60,000                           │
   └─────────────────────────────────────────┘

2. POS: User processes payment
   ┌─────────────────────────────────────────┐
   │ Payment #PAY-20251107-001               │
   │ Method: Cash                            │
   │ Amount: 60,000                          │
   │ Received: 100,000                       │
   │ Change: 40,000                          │
   │                                         │
   │ Items: [item1_id, item2_id]             │
   └─────────────────────────────────────────┘

3. NEW: Sales Recording (Sprint 2)
   ┌─────────────────────────────────────────┐
   │ SalesTransaction #1                     │
   │ - menuItemId: nasi_goreng               │
   │ - variantId: with_chicken               │
   │ - quantity: 1                           │
   │ - unitPrice: 50,000                     │
   │ - paymentMethod: cash                   │
   │ - soldAt: 2025-11-07 12:30              │
   │                                         │
   │ → Trigger write-off                     │
   └─────────────────────────────────────────┘

4. NEW: Resolve Menu Composition
   ┌─────────────────────────────────────────┐
   │ MenuItem: "Nasi Goreng"                 │
   │ Variant: "with Chicken"                 │
   │                                         │
   │ Composition:                            │
   │ 1. type: recipe                         │
   │    id: recipe_nasi_goreng               │
   │    quantity: 1                          │
   │    unit: portion                        │
   │                                         │
   │ 2. type: product                        │
   │    id: chicken_breast                   │
   │    quantity: 150                        │
   │    unit: gram                           │
   └─────────────────────────────────────────┘

5. NEW: Process Recipe Write-off
   ┌─────────────────────────────────────────┐
   │ Recipe: "Nasi Goreng" (1 portion)       │
   │                                         │
   │ Ingredients:                            │
   │ - Rice (cooked)       250g              │
   │ - Garlic              10g               │
   │ - Onion               20g               │
   │ - Soy Sauce           15ml              │
   │ - Oil                 20ml              │
   │ - Egg                 1 piece           │
   │                                         │
   │ + Extra from variant:                   │
   │ - Chicken breast      150g              │
   │                                         │
   │ Total Items to Write Off: 7             │
   └─────────────────────────────────────────┘

6. NEW: Storage Write-off (FIFO)
   ┌─────────────────────────────────────────┐
   │ Write off Rice:                         │
   │ - Find batches (FIFO)                   │
   │   Batch #B001: 10kg → 9.75kg            │
   │ - Update balance                        │
   │   Rice: 50kg → 49.75kg                  │
   │                                         │
   │ Write off Chicken:                      │
   │ - Find batches (FIFO)                   │
   │   Batch #B005: 5kg → 4.85kg             │
   │ - Update balance                        │
   │   Chicken: 20kg → 19.85kg               │
   │                                         │
   │ ... (repeat for all 7 items)            │
   └─────────────────────────────────────────┘

7. NEW: Create Audit Records
   ┌─────────────────────────────────────────┐
   │ RecipeWriteOff #RWO-001                 │
   │ - salesTransactionId: ST-001            │
   │ - recipeId: recipe_nasi_goreng          │
   │ - soldQuantity: 1                       │
   │                                         │
   │ writeOffItems:                          │
   │ 1. Rice         250g    2,500           │
   │ 2. Garlic       10g       100           │
   │ 3. Onion        20g       200           │
   │ 4. Soy Sauce    15ml      150           │
   │ 5. Oil          20ml      200           │
   │ 6. Egg          1pc       500           │
   │ 7. Chicken      150g    5,000           │
   │                                         │
   │ Total Cost: 8,650                       │
   │ Sale Price: 50,000                      │
   │ Profit: 41,350                          │
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ StorageOperation #SO-123                │
   │ - operationType: auto_sales_writeoff    │
   │ - department: kitchen                   │
   │ - reason: "Auto: Nasi Goreng (Chicken)" │
   │ - referenceId: RWO-001                  │
   │ - performedBy: system                   │
   │ - items: [7 items...]                   │
   └─────────────────────────────────────────┘

8. Backoffice: View Analytics
   ┌─────────────────────────────────────────┐
   │ Sales Analytics (Today)                 │
   │                                         │
   │ Revenue: 60,000                         │
   │ Orders: 1                               │
   │ Items Sold: 2                           │
   │                                         │
   │ Top Items:                              │
   │ 1. Nasi Goreng (Chicken)  1  50,000    │
   │ 2. Teh Manis              1  10,000    │
   │                                         │
   │ Cost of Sales: 8,650                    │
   │ Profit: 51,350                          │
   │ Margin: 85.6%                           │
   └─────────────────────────────────────────┘
```

---

## Database Schema (localStorage)

```typescript
// Sales Collection
localStorage.setItem(
  'sales_transactions',
  JSON.stringify([
    {
      id: 'ST-001',
      paymentId: 'PAY-20251107-001',
      orderId: 'ORD-123',
      billId: 'BILL-1',
      itemId: 'ITEM-1',
      menuItemId: 'nasi_goreng',
      menuItemName: 'Nasi Goreng',
      variantId: 'with_chicken',
      variantName: 'with Chicken',
      quantity: 1,
      unitPrice: 50000,
      totalPrice: 50000,
      paymentMethod: 'cash',
      soldAt: '2025-11-07T12:30:00.000Z',
      processedBy: 'Cashier 1',
      recipeId: 'recipe_nasi_goreng',
      recipeWriteOffId: 'RWO-001',
      department: 'kitchen',
      createdAt: '2025-11-07T12:30:00.000Z',
      updatedAt: '2025-11-07T12:30:00.000Z'
    }
    // ... more transactions
  ])
)

// Recipe Write-offs Collection
localStorage.setItem(
  'recipe_writeoffs',
  JSON.stringify([
    {
      id: 'RWO-001',
      salesTransactionId: 'ST-001',
      menuItemId: 'nasi_goreng',
      variantId: 'with_chicken',
      recipeId: 'recipe_nasi_goreng',
      portionSize: 1,
      soldQuantity: 1,
      writeOffItems: [
        {
          type: 'product',
          itemId: 'rice',
          itemName: 'Rice',
          quantityPerPortion: 250,
          totalQuantity: 250,
          unit: 'gram',
          costPerUnit: 10,
          totalCost: 2500,
          batchIds: ['B001']
        }
        // ... more items
      ],
      department: 'kitchen',
      operationType: 'auto_sales_writeoff',
      performedAt: '2025-11-07T12:30:00.000Z',
      performedBy: 'system',
      storageOperationId: 'SO-123',
      createdAt: '2025-11-07T12:30:00.000Z',
      updatedAt: '2025-11-07T12:30:00.000Z'
    }
    // ... more write-offs
  ])
)
```

---

## Key Integration Points

### 1. POS → Sales Recording

**File**: `src/stores/pos/payments/paymentsStore.ts`

```typescript
async function processSimplePayment(...) {
  // ... existing code

  // ✨ NEW: Record sales transaction
  await salesStore.recordSalesTransaction(payment, billItems)

  return { success: true, data: payment }
}
```

### 2. Sales → Write-off Trigger

**File**: `src/stores/sales/salesStore.ts`

```typescript
async function recordSalesTransaction(payment, billItems) {
  for (const item of billItems) {
    // Create sales transaction
    const transaction = createSalesTransaction(payment, item)
    await salesService.saveSalesTransaction(transaction)

    // ✨ NEW: Trigger write-off
    await recipeWriteOffStore.processItemWriteOff(item)
  }
}
```

### 3. Write-off → Storage Update

**File**: `src/stores/recipeWriteOff/recipeWriteOffStore.ts`

```typescript
async function processItemWriteOff(billItem) {
  // Resolve composition
  const writeOffItems = await resolveComposition(billItem)

  // ✨ Write off from storage
  for (const item of writeOffItems) {
    await storageStore.writeOffBatches(item.itemId, item.totalQuantity)
  }

  // Create audit records
  await createWriteOffRecords(billItem, writeOffItems)
}
```

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
