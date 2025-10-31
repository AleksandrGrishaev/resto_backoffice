# Warehouse Architecture Refactoring Plan

## 📋 Problem Statement

### Current Issues

We're mixing three different concepts of "department":

1. **Who created the request** - Kitchen staff or Bar staff (requester department)
2. **Where the product is used** - Kitchen, Bar, or both (usage department)
3. **Where goods are physically stored** - warehouse location

This creates confusion:

```typescript
// ❌ CURRENT PROBLEM
StorageBatch {
  department: 'kitchen'  // What does this mean?
  // - Physical location?
  // - Who ordered it?
  // - Where it's used?
}

StorageBalance {
  itemId: 'prod-milk',
  department: 'kitchen',  // Milk shows 15L in Kitchen
  totalQuantity: 15000
}

StorageBalance {
  itemId: 'prod-milk',
  department: 'bar',      // AND 15L in Bar
  totalQuantity: 15000    // = Looks like 30L total!
}
```

**Issues:**

- Milk shows 15L in Kitchen tab AND 15L in Bar tab (looks like 30L total)
- Unclear who actually used the product
- Unclear physical location of goods
- Cannot easily add new warehouses in the future

---

## 🎯 Solution

**One physical warehouse "Winter" with smart UI filtering.**

### Key Principle

```
Physical Reality:
  Warehouse "Winter": [Milk 15L, Flour 50kg, Whiskey 10 bottles]

UI Display:
  Kitchen Tab: [Milk 15L, Flour 50kg]  ← filter by Product.usedInDepartments
  Bar Tab: [Milk 15L, Whiskey 10 bottles]  ← filter by Product.usedInDepartments

Same milk visible in two tabs = one batch, two views
```

### Why Add Warehouse Now?

**Architecture extensibility:**

- Now: one warehouse "Winter"
- Future: easily add "Kitchen Prep", "Bar Stock", "Cold Room"
- No need to restructure data
- Minimal changes to add new warehouses

---

## 🏗️ Architecture Changes

### Data Structure

```typescript
// ✅ NEW: Physical warehouse
Warehouse {
  id: 'warehouse-winter'
  name: 'Winter'
  type: 'main'
}

// ✅ UPDATED: Batch knows its physical location
StorageBatch {
  warehouseId: 'warehouse-winter'  // Physical location
  // ❌ NO department field
}

// ✅ UPDATED: Balance has no department
StorageBalance {
  itemId: 'prod-milk'
  totalQuantity: 15000  // ONE balance, not per department
  // ❌ NO department field
  batches: [...]
}

// ✅ Product defines where it's USED
Product {
  id: 'prod-milk'
  usedInDepartments: ['kitchen', 'bar']  // UI filter
}

// ✅ Operations keep department for reporting
WriteOff {
  department: 'kitchen'  // WHO wrote it off (for KPI)
}
```

### Key Concepts

| Concept              | Purpose                    | Where Used                                         |
| -------------------- | -------------------------- | -------------------------------------------------- |
| **Warehouse**        | Physical storage location  | `StorageBatch.warehouseId`                         |
| **Department**       | UI filter + responsibility | `Product.usedInDepartments`, `WriteOff.department` |
| **All tab**          | Full warehouse truth       | New UI tab showing everything                      |
| **Kitchen/Bar tabs** | Convenient views           | Filtered by `Product.usedInDepartments`            |

---

## 🚀 Implementation Plan

### PHASE 1: Types & Interfaces (20 min)

#### 1.1 Add Warehouse Interface

```typescript
// src/stores/storage/types.ts

export interface Warehouse extends BaseEntity {
  id: string
  name: string // "Winter"
  code: string // "WINTER-MAIN"
  type: 'main' | 'production' | 'point_of_sale'
  location?: string
  isActive: boolean
  notes?: string
}
```

#### 1.2 Update StorageBatch - Remove department

```typescript
// src/stores/storage/types.ts

export interface StorageBatch extends BaseEntity {
  batchNumber: string
  itemId: string
  itemType: 'product'

  warehouseId: string // ✅ Physical location

  initialQuantity: number
  currentQuantity: number
  unit: string
  costPerUnit: number
  totalValue: number
  receiptDate: string
  expiryDate?: string
  sourceType: BatchSourceType
  status: BatchStatus
  isActive: boolean

  // Transit fields
  purchaseOrderId?: string
  supplierId?: string
  supplierName?: string
  plannedDeliveryDate?: string
  actualDeliveryDate?: string
}
```

#### 1.3 Update StorageBalance - Remove department

```typescript
// src/stores/storage/types.ts

export interface StorageBalance {
  itemId: string
  itemType: 'product'
  itemName: string
  // ❌ NO department field
  totalQuantity: number
  unit: string
  totalValue: number
  averageCost: number
  latestCost: number
  costTrend: 'up' | 'down' | 'stable'
  batches: StorageBatch[]
  oldestBatchDate: string
  newestBatchDate: string
  hasExpired: boolean
  hasNearExpiry: boolean
  belowMinStock: boolean
  lastCalculated: string
}
```

#### 1.4 Keep department ONLY in operations

```typescript
// ✅ Department needed for reporting - WHO wrote off, WHO counted

export interface CreateWriteOffData {
  department: StorageDepartment // Who wrote it off
  items: WriteOffItem[]
  reason: WriteOffReason
  affectsKPI: boolean
}

export interface CreateInventoryData {
  department: StorageDepartment // What we're counting (optional)
  responsiblePerson: string
}
```

**Checklist:**

- [ ] Add `Warehouse` interface
- [ ] Add `warehouseId` to `StorageBatch`, remove `department`
- [ ] Remove `department` from `StorageBalance`
- [ ] Keep `department` in `WriteOff` and `Inventory` for reporting

---

### PHASE 2: Service Layer (30 min)

#### 2.1 Add Warehouse Methods

```typescript
// src/stores/storage/storageService.ts

class StorageService {
  private warehouses: Warehouse[] = []

  constructor() {
    this.warehouses = [
      {
        id: 'warehouse-winter',
        name: 'Winter',
        code: 'WINTER-MAIN',
        type: 'main',
        isActive: true,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }
    ]
  }

  getDefaultWarehouse(): Warehouse {
    return this.warehouses.find(w => w.type === 'main' && w.isActive) || this.warehouses[0]
  }

  getWarehouse(id: string): Warehouse | undefined {
    return this.warehouses.find(w => w.id === id)
  }

  getAllWarehouses(): Warehouse[] {
    return this.warehouses.filter(w => w.isActive)
  }
}
```

#### 2.2 Update getBalances - No department parameter

```typescript
// src/stores/storage/storageService.ts

async getBalances(): Promise<StorageBalance[]> {
  if (!this.initialized) {
    throw new Error('StorageService not initialized')
  }

  if (this.balances.length === 0) {
    await this.recalculateAllBalances()
  }

  return [...this.balances] // Return ALL balances
}

async getTransitBatches(): Promise<StorageBatch[]> {
  if (!this.initialized) {
    throw new Error('StorageService not initialized')
  }

  return [...this.transitBatches] // Return ALL transit batches
}
```

#### 2.3 Update createTransitBatch with warehouseId

```typescript
// src/stores/storage/storageService.ts

async createTransitBatches(data: CreateTransitBatchData[]): Promise<StorageBatch[]> {
  const defaultWarehouse = this.getDefaultWarehouse()

  const batches = data.map(item => ({
    id: generateId('batch'),
    batchNumber: this.generateBatchNumber(item.itemId),
    itemId: item.itemId,
    itemType: 'product' as const,
    warehouseId: item.warehouseId || defaultWarehouse.id, // ✅ warehouse
    initialQuantity: item.quantity,
    currentQuantity: item.quantity,
    unit: item.unit,
    costPerUnit: item.estimatedCostPerUnit,
    totalValue: item.quantity * item.estimatedCostPerUnit,
    receiptDate: new Date().toISOString(),
    sourceType: 'purchase' as const,
    status: 'in_transit' as const,
    isActive: false,
    purchaseOrderId: item.purchaseOrderId,
    supplierId: item.supplierId,
    supplierName: item.supplierName,
    plannedDeliveryDate: item.plannedDeliveryDate,
    notes: item.notes,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }))

  this.transitBatches.push(...batches)
  return batches
}
```

#### 2.4 Update recalculateAllBalances

```typescript
// src/stores/storage/storageService.ts

async recalculateAllBalances(): Promise<void> {
  const newBalances: StorageBalance[] = []

  // ✅ Group by product AND warehouse (not department!)
  const grouped = this.groupBatchesByProductAndWarehouse()

  for (const [key, batches] of Object.entries(grouped)) {
    const [itemId, warehouseId] = key.split('::')

    const product = productsStore.products.find(p => p.id === itemId)
    if (!product) continue

    const balance = await this.calculateBalanceFromBatches(
      itemId,
      batches,
      product
    )

    if (balance) {
      newBalances.push(balance)
    }
  }

  this.balances = newBalances
}

private groupBatchesByProductAndWarehouse(): Record<string, StorageBatch[]> {
  const grouped: Record<string, StorageBatch[]> = {}

  for (const batch of this.activeBatches) {
    if (batch.status === 'active' && batch.currentQuantity > 0) {
      const key = `${batch.itemId}::${batch.warehouseId}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(batch)
    }
  }

  return grouped
}
```

**Checklist:**

- [ ] Implement `getDefaultWarehouse()`, `getWarehouse()`, `getAllWarehouses()`
- [ ] Remove `department` parameter from `getBalances()` and `getTransitBatches()`
- [ ] Update `createTransitBatch()` to use `warehouseId`
- [ ] Update `groupBatchesByProductAndWarehouse()` - group by warehouse, not department
- [ ] Update `recalculateAllBalances()` to work without department

---

### PHASE 3: Mock Data (30 min)

#### 3.1 Add Warehouse Constant

```typescript
// src/stores/shared/storageDefinitions.ts

const DEFAULT_WAREHOUSE_ID = 'warehouse-winter'
```

#### 3.2 Update generateProductBatches

```typescript
// src/stores/shared/storageDefinitions.ts

function generateProductBatches(
  productId: string,
  warehouseId: string, // ✅ Use warehouseId instead of department
  targetTotalQuantity: number
): StorageBatch[] {
  const product = getProductDefinition(productId)
  if (!product) return []

  const batches: StorageBatch[] = []
  let remainingQuantity = Math.round(targetTotalQuantity)
  const batchCount = Math.min(3, Math.ceil(Math.random() * 2) + 1)

  for (let i = 0; i < batchCount && remainingQuantity > 0; i++) {
    const isLastBatch = i === batchCount - 1
    let batchQuantity: number

    if (isLastBatch) {
      batchQuantity = remainingQuantity
    } else {
      const minBatch = Math.round(remainingQuantity * 0.2)
      const maxBatch = Math.round(remainingQuantity * 0.6)
      batchQuantity = Math.round(Math.random() * (maxBatch - minBatch) + minBatch)
    }

    const daysAgo = Math.floor(Math.random() * 30)
    const receiptDate = TimeUtils.getDateDaysAgo(daysAgo)

    let expiryDate: string | undefined
    if (product.shelfLifeDays && product.shelfLifeDays > 0) {
      expiryDate = TimeUtils.addDaysToDate(receiptDate, product.shelfLifeDays)
    }

    batches.push({
      id: `batch-${productId}-${warehouseId}-${i + 1}`, // ✅ warehouse in ID
      batchNumber: generateBatchNumber(productId, receiptDate),
      itemId: productId,
      itemType: 'product',
      warehouseId, // ✅ Use warehouseId
      initialQuantity: batchQuantity,
      currentQuantity: batchQuantity,
      unit: product.baseUnit,
      costPerUnit: product.baseCostPerUnit,
      totalValue: calculateTotalValue(batchQuantity, product.baseCostPerUnit),
      receiptDate,
      expiryDate,
      sourceType: 'purchase',
      status: expiryDate && new Date(expiryDate) < new Date() ? 'expired' : 'active',
      isActive: true,
      createdAt: receiptDate,
      updatedAt: receiptDate
    })

    remainingQuantity -= batchQuantity
  }

  return batches
}
```

#### 3.3 CRITICAL: generateStorageWorkflowData - ONE balance per product

```typescript
// src/stores/shared/storageDefinitions.ts

function generateStorageWorkflowData(): CoreStorageWorkflow {
  const balances: StorageBalance[] = []
  const allBatches: StorageBatch[] = []

  // ✅ ONE balance per product (not per department!)
  CORE_PRODUCTS.forEach(product => {
    const balance = generateProductBalance(product.id, DEFAULT_WAREHOUSE_ID)
    if (balance) {
      balances.push(balance)
      allBatches.push(...balance.batches)
    }
  })

  const transitBatches = generateTransitTestBatches()
  allBatches.push(...transitBatches)

  const operations = generateStorageOperations()

  return { balances, batches: allBatches, operations }
}
```

#### 3.4 Update generateProductBalance

```typescript
// src/stores/shared/storageDefinitions.ts

function generateProductBalance(
  productId: string,
  warehouseId: string // ✅ warehouse instead of department
): StorageBalance | null {
  const product = getProductDefinition(productId)
  if (!product) return null

  const targetStock = calculateTargetStock(product)
  const batches = generateProductBatches(productId, warehouseId, targetStock)

  const totalQuantity = batches.reduce((sum, b) => sum + b.currentQuantity, 0)
  const totalValue = batches.reduce((sum, b) => sum + b.totalValue, 0)
  const averageCost = totalQuantity > 0 ? Math.round(totalValue / totalQuantity) : 0

  return {
    itemId: productId,
    itemType: 'product',
    itemName: product.name,
    // ❌ NO department
    totalQuantity,
    unit: product.baseUnit,
    totalValue,
    averageCost,
    latestCost: batches[batches.length - 1]?.costPerUnit || averageCost,
    costTrend: 'stable',
    batches,
    oldestBatchDate: batches[0]?.receiptDate || new Date().toISOString(),
    newestBatchDate: batches[batches.length - 1]?.receiptDate || new Date().toISOString(),
    hasExpired: batches.some(b => b.status === 'expired'),
    hasNearExpiry: batches.some(b => isNearExpiry(b.expiryDate)),
    belowMinStock: totalQuantity < (product.minStock || 0),
    lastCalculated: new Date().toISOString()
  }
}
```

#### 3.5 Update generateTransitTestBatches

```typescript
// src/stores/shared/storageDefinitions.ts

function generateTransitTestBatches(): StorageBatch[] {
  const transitBatches: StorageBatch[] = []
  const futureDelivery = TimeUtils.addDaysToDate(new Date().toISOString(), 2)

  transitBatches.push({
    id: 'transit-po-using-credit-prod-milk-2',
    batchNumber: generateTransitBatchNumber('po-using-credit', 2),
    itemId: 'prod-milk',
    itemType: 'product',
    warehouseId: DEFAULT_WAREHOUSE_ID, // ✅ warehouse
    initialQuantity: 15000,
    currentQuantity: 15000,
    unit: 'ml',
    costPerUnit: 15,
    totalValue: 225000,
    receiptDate: futureDelivery,
    sourceType: 'purchase',
    status: 'in_transit',
    isActive: false,
    purchaseOrderId: 'po-using-credit',
    supplierId: 'sup-premium-meat-co',
    supplierName: 'Premium Meat Company',
    plannedDeliveryDate: futureDelivery,
    createdAt: futureDelivery,
    updatedAt: futureDelivery
  })

  // ... other transit batches similarly

  return transitBatches
}
```

**Checklist:**

- [ ] Add `DEFAULT_WAREHOUSE_ID` constant
- [ ] Update `generateProductBatches()` to use `warehouseId`
- [ ] Update `generateStorageWorkflowData()` - ONE balance per product
- [ ] Update `generateProductBalance()` signature
- [ ] Update `generateTransitTestBatches()` with `warehouseId`

---

### PHASE 4: StorageStore Refactoring (30 min)

#### 4.1 Remove department filter from computed

```typescript
// src/stores/storage/storageStore.ts

const filteredBalances = computed(() => {
  let balances = [...state.value.balances]

  // ❌ REMOVE department filter block
  // if (state.value.filters.department !== 'all') {
  //   balances = balances.filter(b => b.department === state.value.filters.department)
  // }

  // Other filters remain
  if (state.value.filters.search) {
    const search = state.value.filters.search.toLowerCase()
    balances = balances.filter(b => b.itemName.toLowerCase().includes(search))
  }

  if (state.value.filters.showExpired) {
    balances = balances.filter(b => b.hasExpired)
  }

  if (state.value.filters.showBelowMinStock) {
    balances = balances.filter(b => b.belowMinStock)
  }

  if (state.value.filters.showNearExpiry) {
    balances = balances.filter(b => b.hasNearExpiry)
  }

  return balances
})
```

#### 4.2 Update fetchBalances - No parameter

```typescript
// src/stores/storage/storageStore.ts

async function fetchBalances() {
  // ❌ NO department parameter
  state.value.loading.balances = true
  state.value.error = null

  try {
    const [balances, activeBatches, transitBatches] = await Promise.all([
      service.getBalances(), // ✅ No parameter
      service.getActiveBatches(),
      service.getTransitBatches()
    ])

    state.value.balances = balances
    state.value.activeBatches = activeBatches
    state.value.transitBatches = transitBatches
  } catch (error) {
    state.value.error = 'Failed to load storage data'
    throw error
  } finally {
    state.value.loading.balances = false
  }
}
```

#### 4.3 Add warehouse getters

```typescript
// src/stores/storage/storageStore.ts

function getWarehouse(id: string): Warehouse | undefined {
  return service.getWarehouse(id)
}

function getDefaultWarehouse(): Warehouse {
  return service.getDefaultWarehouse()
}

function getAllWarehouses(): Warehouse[] {
  return service.getAllWarehouses()
}

return {
  // ... existing returns
  getWarehouse,
  getDefaultWarehouse,
  getAllWarehouses
}
```

**Checklist:**

- [ ] Remove `department` filter from `filteredBalances` computed
- [ ] Update `fetchBalances()` - remove department parameter
- [ ] Add warehouse getter methods to store
- [ ] Export warehouse getters in return statement

---

### PHASE 5: UI Components (1.5 hours)

#### 5.1 Add "All" Tab in StorageView

```vue
<!-- src/views/storage/StorageView.vue -->

<template>
  <div class="storage-view">
    <!-- Department Tabs -->
    <v-tabs v-model="selectedDepartment" class="mb-4" color="primary">
      <v-tab value="all">
        <v-icon icon="mdi-warehouse" class="mr-2" />
        All Products
        <v-chip v-if="allItemCount > 0" size="small" class="ml-2" variant="tonal">
          {{ allItemCount }}
        </v-chip>
      </v-tab>

      <v-tab value="kitchen">
        <v-icon icon="mdi-silverware-fork-knife" class="mr-2" />
        Kitchen
        <v-chip v-if="kitchenItemCount > 0" size="small" class="ml-2" variant="tonal">
          {{ kitchenItemCount }}
        </v-chip>
      </v-tab>

      <v-tab value="bar">
        <v-icon icon="mdi-coffee" class="mr-2" />
        Bar
        <v-chip v-if="barItemCount > 0" size="small" class="ml-2" variant="tonal">
          {{ barItemCount }}
        </v-chip>
      </v-tab>
    </v-tabs>
  </div>
</template>

<script setup lang="ts">
import type { StorageDepartment } from '@/stores/storage'

const selectedDepartment = ref<StorageDepartment | 'all'>('all')

const allItemCount = computed(() => {
  return storageStore.state?.balances?.length || 0
})

const kitchenItemCount = computed(() => {
  return filteredBalancesByDepartment('kitchen').length
})

const barItemCount = computed(() => {
  return filteredBalancesByDepartment('bar').length
})
</script>
```

#### 5.2 Rewrite Filtering by Product.usedInDepartments

```vue
<!-- src/views/storage/StorageView.vue -->

<script setup lang="ts">
// ✅ NEW LOGIC: Filter by product.usedInDepartments
const filteredBalances = computed(() => {
  if (!isStoreReady.value || !storageStore.state?.balances) {
    return []
  }

  let balances = [...storageStore.state.balances]

  // ✅ Filter by department through product.usedInDepartments
  if (selectedDepartment.value !== 'all') {
    balances = balances.filter(balance => {
      const product = productsStore.products?.find(p => p.id === balance.itemId)
      if (!product) return false

      return product.usedInDepartments.includes(selectedDepartment.value)
    })
  }

  // Filter by zero stock
  if (!showZeroStock.value) {
    balances = balances.filter(b => b.totalQuantity > 0)
  }

  return balances
})

// ✅ Transit batches filtered similarly
const filteredTransitBatches = computed(() => {
  if (!storageStore?.transitBatches) return []

  let batches = [...storageStore.transitBatches]

  if (selectedDepartment.value !== 'all') {
    batches = batches.filter(batch => {
      const product = productsStore.products?.find(p => p.id === batch.itemId)
      if (!product) return false

      return product.usedInDepartments.includes(selectedDepartment.value)
    })
  }

  return batches
})

// Helper for filtering
function filteredBalancesByDepartment(dept: StorageDepartment): StorageBalance[] {
  if (!storageStore.state?.balances) return []

  return storageStore.state.balances.filter(balance => {
    const product = productsStore.products?.find(p => p.id === balance.itemId)
    if (!product) return false
    return product.usedInDepartments.includes(dept)
  })
}
</script>
```

#### 5.3 Add "Shared" Badge for Common Products

```vue
<!-- src/views/storage/components/StorageStockTable.vue -->

<script setup lang="ts">
function isSharedProduct(itemId: string): boolean {
  const product = productsStore.products?.find(p => p.id === itemId)
  return (product?.usedInDepartments?.length || 0) > 1
}
</script>

<template>
  <v-data-table :headers="headers" :items="sortedBalances">
    <!-- Product Name with Shared Badge -->
    <template #item.itemName="{ item }">
      <div class="d-flex align-center">
        <span class="font-weight-medium">{{ item.itemName }}</span>

        <v-chip
          v-if="isSharedProduct(item.itemId)"
          size="x-small"
          color="info"
          variant="tonal"
          class="ml-2"
        >
          <v-icon size="12" class="mr-1">mdi-share-variant</v-icon>
          Shared
          <v-tooltip activator="parent" location="top">
            Used in both Kitchen and Bar departments
          </v-tooltip>
        </v-chip>
      </div>
    </template>
  </v-data-table>
</template>
```

**Checklist:**

- [ ] Add "All" tab in StorageView
- [ ] Implement item counts for each tab
- [ ] Rewrite `filteredBalances` using `product.usedInDepartments`
- [ ] Rewrite `filteredTransitBatches` similarly
- [ ] Add "Shared" badge for products used in multiple departments

---

### PHASE 6: Purchase Orders Integration (30 min)

#### Update usePurchaseOrders

```typescript
// src/stores/supplier_2/composables/usePurchaseOrders.ts

async function sendOrder(id: string): Promise<PurchaseOrder> {
  const sentOrder = await updateOrder(id, {
    status: 'sent',
    sentDate: new Date().toISOString()
  })

  // ✅ Create transit batches with warehouseId
  const storageStore = useStorageStore()
  const defaultWarehouse = storageStore.getDefaultWarehouse()

  const transitBatchData = sentOrder.items.map(item => ({
    itemId: item.itemId,
    itemName: item.itemName,
    quantity: item.orderedQuantity,
    unit: item.unit,
    estimatedCostPerUnit: item.pricePerUnit,
    warehouseId: defaultWarehouse.id, // ✅ Assign warehouse
    purchaseOrderId: sentOrder.id,
    supplierId: sentOrder.supplierId,
    supplierName: sentOrder.supplierName,
    plannedDeliveryDate: sentOrder.expectedDeliveryDate || calculateDefaultDeliveryDate(),
    notes: `Transit from order ${sentOrder.orderNumber}`
  }))

  await storageStore.createTransitBatches(transitBatchData)

  return sentOrder
}
```

**Checklist:**

- [ ] Update `sendOrder()` to use `getDefaultWarehouse()`
- [ ] Ensure transit batches created with `warehouseId`
- [ ] Test Purchase Order → Transit flow

---

### PHASE 7: Final Testing (30 min)

#### Test Scenarios

**1. "All" Tab**

- [ ] Shows ALL products
- [ ] Milk displays ONCE with quantity 15L

**2. "Kitchen" Tab**

- [ ] Shows Milk (shared), Flour, Tomatoes
- [ ] Milk has "Shared" badge

**3. "Bar" Tab**

- [ ] Shows Milk (shared), Whiskey, Cola
- [ ] Same milk 15L with "Shared" badge

**4. Purchase Order → Transit**

- [ ] Sending order creates transit batch
- [ ] warehouseId = "warehouse-winter"

**5. Transit → Active**

- [ ] Receipt preserves warehouseId
- [ ] Status changes to 'active'

**6. Operations with Department**

- [ ] WriteOff saves department for KPI
- [ ] Inventory can filter by department

---

## 📊 User Experience

### Kitchen Tab

```
┌─────────────────────────────────────────────────┐
│ 📦 Product Storage - Kitchen                    │
├─────────────────────────────────────────────────┤
│ Product         | Stock  | Status               │
│ Milk [Shared]   | 15L    | OK                   │
│ Flour           | 50kg   | OK                   │
│ Tomatoes        | 10kg   | Low                  │
├─────────────────────────────────────────────────┤
│ In Transit                                      │
│ Potatoes        | 20kg   | Arriving Today       │
└─────────────────────────────────────────────────┘
```

### Bar Tab

```
┌─────────────────────────────────────────────────┐
│ 📦 Product Storage - Bar                        │
├─────────────────────────────────────────────────┤
│ Product         | Stock  | Status               │
│ Milk [Shared]   | 15L    | OK                   │
│ Whiskey         | 10 btl | OK                   │
│ Cola            | 24 btl | Low                  │
└─────────────────────────────────────────────────┘
```

**Note:** Same 15L of milk visible in both tabs with "Shared" badge

---

## 🔮 Future Expansion (Phase 3)

### Adding New Warehouses

When ready to add multiple warehouses, simply add new records:

```typescript
const WAREHOUSES = [
  {
    id: 'warehouse-winter',
    name: 'Winter',
    type: 'main'
  },
  {
    id: 'warehouse-kitchen-prep',
    name: 'Kitchen Prep',
    type: 'production'
  },
  {
    id: 'warehouse-bar-stock',
    name: 'Bar Stock',
    type: 'point_of_sale'
  },
  {
    id: 'warehouse-cold-room',
    name: 'Cold Room',
    type: 'main'
  }
]
```

### Receipt with Warehouse Selection

```vue
<v-select v-model="receiptData.warehouseId" :items="availableWarehouses" label="Warehouse">
  <template #item="{ item }">
    <v-list-item>
      <v-list-item-title>{{ item.name }}</v-list-item-title>
      <v-list-item-subtitle>{{ item.type }}</v-list-item-subtitle>
    </v-list-item>
  </template>
</v-select>
```

**No data structure changes required!**

---

## 📈 Summary of Changes

### What We Changed

| Component                         | Before                                 | After                                        |
| --------------------------------- | -------------------------------------- | -------------------------------------------- |
| **StorageBatch**                  | `department: StorageDepartment`        | `warehouseId: string`                        |
| **StorageBalance**                | `department: StorageDepartment`        | NO department field                          |
| **Mock generation**               | 2 balances per product (kitchen + bar) | 1 balance per product                        |
| **generateProductBalance()**      | `(productId, department)`              | `(productId, warehouseId)`                   |
| **generateProductBatches()**      | `(productId, department, qty)`         | `(productId, warehouseId, qty)`              |
| **StorageService.getBalances()**  | `getBalances(department?)`             | `getBalances()` no parameter                 |
| **StorageStore.filteredBalances** | Filter by `b.department`               | NO department filter                         |
| **UI filtering**                  | In StorageStore                        | In components by `Product.usedInDepartments` |

### What We Added

- ✅ `Warehouse` entity with default "Winter" warehouse
- ✅ "All" tab showing complete warehouse inventory
- ✅ "Shared" badge for products used in multiple departments
- ✅ Warehouse methods: `getDefaultWarehouse()`, `getWarehouse()`, `getAllWarehouses()`

### What We Kept

- ✅ `department` in WriteOff (for KPI reporting)
- ✅ `department` in Inventory (for optional filtering)
- ✅ `Product.usedInDepartments` (defines UI visibility)

---

## ⏱️ Time Estimates

| Phase     | Task               | Duration    |
| --------- | ------------------ | ----------- |
| 1         | Types & Interfaces | 20 min      |
| 2         | Service Layer      | 30 min      |
| 3         | Mock Data          | 30 min      |
| 4         | StorageStore       | 30 min      |
| 5         | UI Components      | 1.5 hours   |
| 6         | Purchase Orders    | 30 min      |
| 7         | Testing            | 30 min      |
| **TOTAL** |                    | **4 hours** |

---

## ✅ Final Checklist

### Phase 1: Types (20 min)

- [ ] Add `Warehouse` interface
- [ ] Update `StorageBatch` - add `warehouseId`, remove `department`
- [ ] Update `StorageBalance` - remove `department`
- [ ] Keep `department` in WriteOff and Inventory

### Phase 2: Service (30 min)

- [ ] Implement warehouse methods
- [ ] Update `getBalances()` - no department parameter
- [ ] Update `createTransitBatch()` with warehouseId
- [ ] Update `groupBatchesByProductAndWarehouse()`
- [ ] Update `recalculateAllBalances()`

### Phase 3: Mock Data (30 min)

- [ ] Add `DEFAULT_WAREHOUSE_ID` constant
- [ ] Update `generateProductBatches()` with warehouseId
- [ ] Update `generateStorageWorkflowData()` - ONE balance per product
- [ ] Update `generateProductBalance()` signature
- [ ] Update `generateTransitTestBatches()` with warehouseId

### Phase 4: Store (30 min)

- [ ] Remove department filter from `filteredBalances`
- [ ] Update `fetchBalances()` - no parameter
- [ ] Add warehouse getters to store

### Phase 5: UI (1.5 hours)

- [ ] Add "All" tab with item counts
- [ ] Rewrite `filteredBalances` using `product.usedInDepartments`
- [ ] Rewrite `filteredTransitBatches` similarly
- [ ] Add "Shared" badge for common products
- [ ] Update tab switching logic

### Phase 6: Integration (30 min)

- [ ] Update Purchase Order → Transit flow
- [ ] Ensure warehouseId propagates correctly

### Phase 7: Testing (30 min)

- [ ] Test "All" tab shows everything
- [ ] Test Kitchen tab filters correctly
- [ ] Test Bar tab filters correctly
- [ ] Test Milk appears in both tabs (not duplicated)
- [ ] Test Purchase Order → Transit → Active flow
- [ ] Test WriteOff preserves department

---

## 🎯 Key Benefits

### Architecture

✅ **Scalable** - Easy to add new warehouses without changing data structure
✅ **Clear separation** - Physical location (warehouse) vs UI filter (department)
✅ **No duplication** - One batch, but visible in multiple views
✅ **Future-proof** - Ready for multi-warehouse Phase 3

### User Experience

✅ **Transparent** - "All" tab shows complete truth
✅ **Convenient** - Kitchen/Bar tabs show relevant items
✅ **Clear** - "Shared" badge indicates multi-department products
✅ **Accurate** - No confusion about total quantities

### Code Quality

✅ **Single source of truth** - One balance per product per warehouse
✅ **Simpler logic** - Filtering happens in UI, not in data layer
✅ **Type safety** - Strong TypeScript interfaces
✅ **Maintainable** - Clear separation of concerns

---

## 🚨 Critical Points

### DO NOT

❌ Filter balances by `balance.department` (field doesn't exist)
❌ Create multiple balances per product (one per department)
❌ Remove `department` from WriteOff/Inventory (needed for reporting)
❌ Add warehouse column to table (not in requirements)

### DO

✅ Filter balances by `product.usedInDepartments` in UI
✅ Create ONE balance per product per warehouse
✅ Keep `department` in operations for KPI tracking
✅ Use `warehouseId` in all batches
✅ Show "Shared" badge for multi-department products

---

## 🔍 Implementation Notes

### Why One Balance Per Product?

**Physical Reality:**

- There is ONE warehouse "Winter"
- Milk has ONE physical location
- There are 15L total in warehouse

**UI Reality:**

- Kitchen needs to see milk (they use it)
- Bar needs to see milk (they use it)
- Same 15L, two different views

**Data Structure:**

```typescript
// ✅ CORRECT: One balance
{
  itemId: 'prod-milk',
  totalQuantity: 15000,  // 15L total
  batches: [{ warehouseId: 'warehouse-winter', quantity: 15000 }]
}

// Product definition determines visibility
{
  id: 'prod-milk',
  usedInDepartments: ['kitchen', 'bar']  // Visible in both tabs
}
```

### Why Keep Department in Operations?

Operations need `department` for accountability and reporting:

**WriteOff:**

```typescript
{
  department: 'kitchen',  // Kitchen staff wrote it off
  reason: 'expired',
  affectsKPI: true  // Impacts kitchen KPI
}
```

**Inventory:**

```typescript
{
  department: 'bar',  // Bar is doing inventory
  responsiblePerson: 'John the Bartender'
}
```

This enables reports like:

- "Kitchen writeoffs this month"
- "Bar inventory accuracy"
- "Department cost tracking"

---

## 📝 Code Migration Checklist

### Files to Update

#### Type Definitions

- [ ] `src/stores/storage/types.ts`
  - Add `Warehouse` interface
  - Update `StorageBatch` (add warehouseId, remove department)
  - Update `StorageBalance` (remove department)

#### Service Layer

- [ ] `src/stores/storage/storageService.ts`
  - Add warehouse methods
  - Update `getBalances()` signature
  - Update `createTransitBatch()`
  - Update `groupBatchesByProductAndWarehouse()`
  - Update `recalculateAllBalances()`

#### Mock Data

- [ ] `src/stores/shared/storageDefinitions.ts`
  - Add `DEFAULT_WAREHOUSE_ID`
  - Update `generateProductBatches()`
  - Update `generateStorageWorkflowData()`
  - Update `generateProductBalance()`
  - Update `generateTransitTestBatches()`

#### Store

- [ ] `src/stores/storage/storageStore.ts`
  - Update `filteredBalances` computed
  - Update `fetchBalances()` signature
  - Add warehouse getter methods

#### UI Components

- [ ] `src/views/storage/StorageView.vue`

  - Add "All" tab
  - Update `filteredBalances` computed
  - Update `filteredTransitBatches` computed
  - Add tab item counts

- [ ] `src/views/storage/components/StorageStockTable.vue`
  - Add `isSharedProduct()` helper
  - Add "Shared" badge template

#### Integration

- [ ] `src/stores/supplier_2/composables/usePurchaseOrders.ts`
  - Update `sendOrder()` to use `getDefaultWarehouse()`

---

## 🎓 Learning Points

### Architecture Patterns

**Separation of Concerns:**

- Physical storage (`warehouseId`) = data layer
- UI filtering (`department`) = presentation layer
- Operations (`department`) = business logic layer

**Single Source of Truth:**

- ONE balance per product per warehouse
- UI creates different views of same data
- No data duplication

**Extensibility:**

- Easy to add new warehouses
- No breaking changes needed
- Future-proof design

### Vue/Pinia Patterns

**Computed Properties:**

```typescript
// Filter in component, not in store
const filteredBalances = computed(() => {
  return storageStore.balances.filter(balance => {
    const product = productsStore.products.find(p => p.id === balance.itemId)
    return product?.usedInDepartments.includes(selectedDepartment.value)
  })
})
```

**Store Composition:**

```typescript
// Use multiple stores together
const storageStore = useStorageStore()
const productsStore = useProductsStore()

// Cross-store data enrichment
const enrichedBalance = computed(() => {
  const balance = storageStore.balances[0]
  const product = productsStore.products.find(p => p.id === balance.itemId)
  return { ...balance, product }
})
```

---

## 🏁 Success Criteria

### Functional Requirements

✅ Milk shows 15L in Kitchen tab (not 30L)
✅ Milk shows 15L in Bar tab (same 15L)
✅ "All" tab shows complete inventory
✅ "Shared" badge appears on multi-department products
✅ Purchase Order creates transit with warehouse
✅ Receipt converts transit to active with warehouse
✅ WriteOff preserves department for KPI

### Technical Requirements

✅ No `department` field in `StorageBatch`
✅ No `department` field in `StorageBalance`
✅ `warehouseId` in all batches
✅ ONE balance per product per warehouse
✅ Filtering by `Product.usedInDepartments` in UI
✅ All tests pass

### Code Quality

✅ Type-safe interfaces
✅ Clear separation of concerns
✅ No code duplication
✅ Maintainable structure
✅ Well-documented changes

---

## 🎉 Ready to Implement!

This refactoring transforms the storage system from a department-based structure to a warehouse-based architecture, while maintaining convenient department views in the UI.

The key insight: **Physical storage location and UI filtering are separate concerns**. By separating them, we gain:

- Clarity (no confusion about quantities)
- Extensibility (easy to add warehouses)
- Simplicity (less duplicated data)
- Flexibility (multiple views of same data)

Total implementation time: **~4 hours** for a complete, tested solution.
