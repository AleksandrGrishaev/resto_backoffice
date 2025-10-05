# 📋 Technical Specification: Department Flow Implementation

## 🎯 Project Overview

**Goal:** Implement proper department tracking (kitchen/bar) throughout the entire procurement and storage chain, ensuring products are correctly attributed to their responsible departments.

**Scope:** Two-phase implementation

- **Phase 2 (First):** Add `usedInDepartments` to Product entities
- **Phase 1 (Second):** Implement department flow through Request → Order → Transit → Storage chain
- **Phase 3 (Future/TODO):** Full warehouse management system with physical locations

**Non-Goals:**

- ❌ Backward compatibility (new application)
- ❌ Data migration scripts (will be handled during initial setup)
- ❌ Physical warehouse locations (deferred to Phase 3)

---

# 🔄 Implementation Order: Phase 2 → Phase 1

## Why This Order?

**Phase 2 First (Product departments):**

- Establishes the foundation: which products are used where
- Enables validation at Request creation
- Prevents invalid department assignments
- No complex "guessing" logic needed

**Phase 1 Second (Department flow):**

- Simply propagates department from validated Request
- No edge cases with mixed departments
- Clear data lineage: Request.department → OrderItem.department → TransitBatch.department

---

# 📦 PHASE 2: Product Department Attribution (DO FIRST)

## 2.1 Overview

**Objective:** Mark each product with the departments where it's used (kitchen, bar, or both).

**Benefits:**

- ✅ Clear product categorization by usage
- ✅ Filter products in Request/Order forms
- ✅ Prevent creating requests for wrong products
- ✅ Better inventory analytics by department

## 2.2 Data Model Changes

### 2.2.1 Update Product Interface

**File:** `src/stores/products/types.ts`

```typescript
export type Department = 'kitchen' | 'bar'

export interface Product extends BaseEntity {
  name: string
  category: ProductCategory
  unit: MeasurementUnit
  canBeSold: boolean
  isActive: boolean

  // ✅ NEW REQUIRED FIELD
  usedInDepartments: Department[] // ['kitchen'] | ['bar'] | ['kitchen', 'bar']

  // ... existing fields (price, minStock, etc.)
}
```

**Validation Rules:**

- Array must contain at least 1 department
- Array can contain both departments for shared products (e.g., milk)
- No duplicates in array

---

### 2.2.2 Update DTOs

**File:** `src/stores/products/types.ts`

```typescript
export interface CreateProductDto {
  name: string
  category: ProductCategory
  unit: MeasurementUnit
  usedInDepartments: Department[] // ✅ REQUIRED
  canBeSold?: boolean
  isActive?: boolean
  // ... other fields
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  // usedInDepartments can be updated
}
```

---

### 2.2.3 Update Default Product

**File:** `src/stores/products/types.ts`

```typescript
export const DEFAULT_PRODUCT: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  category: 'other',
  unit: 'piece',
  usedInDepartments: ['kitchen'], // ✅ DEFAULT
  canBeSold: true,
  isActive: true
  // ... other defaults
}
```

---

## 2.3 UI Implementation

### 2.3.1 Product Form Dialog

**File:** `src/views/products/components/ProductFormDialog.vue`

**Add Department Selector:**

```vue
<template>
  <v-dialog v-model="dialog" max-width="800px" persistent>
    <v-card>
      <v-card-title>
        {{ isEditMode ? 'Edit Product' : 'Create New Product' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" v-model="isFormValid">
          <!-- Existing fields: name, category, unit -->

          <!-- ✅ NEW FIELD: Department Selection -->
          <v-select
            v-model="formData.usedInDepartments"
            :items="departmentOptions"
            label="Used in Departments *"
            multiple
            chips
            closable-chips
            variant="outlined"
            density="comfortable"
            :rules="[v => (v && v.length > 0) || 'Select at least one department']"
            hint="Select where this product is used"
            persistent-hint
            class="mb-4"
          >
            <template #chip="{ item, props }">
              <v-chip
                v-bind="props"
                :color="getDepartmentColor(item.value)"
                :prepend-icon="getDepartmentIcon(item.value)"
              >
                {{ item.title }}
              </v-chip>
            </template>
          </v-select>

          <!-- Rest of the form -->
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false">Cancel</v-btn>
        <v-btn color="primary" :disabled="!isFormValid" @click="handleSubmit">
          {{ isEditMode ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Department } from '@/stores/products/types'

const departmentOptions = [
  {
    value: 'kitchen' as Department,
    title: 'Kitchen'
  },
  {
    value: 'bar' as Department,
    title: 'Bar'
  }
]

function getDepartmentColor(dept: Department): string {
  return dept === 'kitchen' ? 'success' : 'primary'
}

function getDepartmentIcon(dept: Department): string {
  return dept === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'
}

// ... rest of component logic
</script>
```

---

### 2.3.2 Products Table - Add Department Column

**File:** `src/views/products/components/ProductsTable.vue`

**Update Headers:**

```typescript
const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Unit', key: 'unit', sortable: true },
  { title: 'Departments', key: 'usedInDepartments', sortable: false }, // ✅ NEW
  { title: 'Price', key: 'price', sortable: true },
  { title: 'Status', key: 'isActive', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]
```

**Add Column Template:**

```vue
<template>
  <v-data-table :headers="headers" :items="filteredProducts" :loading="loading">
    <!-- ... existing columns -->

    <!-- ✅ NEW: Department Badges Column -->
    <template #item.usedInDepartments="{ item }">
      <div class="d-flex gap-1">
        <v-chip
          v-for="dept in item.usedInDepartments"
          :key="dept"
          size="small"
          :color="getDepartmentColor(dept)"
          :prepend-icon="getDepartmentIcon(dept)"
        >
          {{ dept === 'kitchen' ? 'Kitchen' : 'Bar' }}
        </v-chip>
      </div>
    </template>

    <!-- ... other columns -->
  </v-data-table>
</template>

<script setup lang="ts">
function getDepartmentColor(dept: Department): string {
  return dept === 'kitchen' ? 'success' : 'primary'
}

function getDepartmentIcon(dept: Department): string {
  return dept === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'
}
</script>
```

---

### 2.3.3 Add Department Filter to Products Table

**File:** `src/views/products/components/ProductsTable.vue`

```vue
<template>
  <div>
    <!-- Filters Bar -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field
          v-model="search"
          label="Search products..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
        />
      </v-col>

      <!-- ✅ NEW: Department Filter -->
      <v-col cols="12" md="3">
        <v-select
          v-model="departmentFilter"
          :items="departmentFilterOptions"
          label="Filter by Department"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
        />
      </v-col>

      <!-- Existing filters: category, status -->
    </v-row>

    <!-- Table -->
    <v-data-table ... />
  </div>
</template>

<script setup lang="ts">
const departmentFilter = ref<Department | 'all'>('all')

const departmentFilterOptions = [
  { value: 'all', title: 'All Departments' },
  { value: 'kitchen', title: 'Kitchen Only' },
  { value: 'bar', title: 'Bar Only' }
]

const filteredProducts = computed(() => {
  let result = productsStore.products

  // Search filter
  if (search.value) {
    result = result.filter(p => p.name.toLowerCase().includes(search.value.toLowerCase()))
  }

  // ✅ Department filter
  if (departmentFilter.value !== 'all') {
    result = result.filter(p => p.usedInDepartments.includes(departmentFilter.value as Department))
  }

  // Other filters (category, status, etc.)

  return result
})
</script>
```

---

### 2.3.4 Filter Products in Request Form by Department

**File:** `src/views/procurement/components/RequestFormDialog.vue`

**Show only relevant products:**

```vue
<template>
  <v-dialog v-model="dialog">
    <v-card>
      <v-card-title>Create Procurement Request</v-card-title>

      <v-card-text>
        <v-form>
          <!-- Department Selection -->
          <v-select
            v-model="formData.department"
            :items="[
              { value: 'kitchen', title: 'Kitchen' },
              { value: 'bar', title: 'Bar' }
            ]"
            label="Department *"
            :rules="[v => !!v || 'Required']"
          />

          <!-- Product Selection - FILTERED BY DEPARTMENT -->
          <v-autocomplete
            v-model="selectedProductId"
            :items="availableProducts"
            item-title="name"
            item-value="id"
            label="Select Product"
            :hint="`Showing products used in ${formData.department}`"
            persistent-hint
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #append>
                  <div class="d-flex gap-1">
                    <v-chip
                      v-for="dept in item.usedInDepartments"
                      :key="dept"
                      size="x-small"
                      :color="getDepartmentColor(dept)"
                    >
                      {{ dept === 'kitchen' ? 'K' : 'B' }}
                    </v-chip>
                  </div>
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore } from '@/stores/products'

const productsStore = useProductsStore()

// ✅ Filter products by selected department
const availableProducts = computed(() => {
  const dept = formData.value.department
  if (!dept) return []

  return productsStore.products.filter(
    product => product.isActive && product.usedInDepartments.includes(dept) // ✅ FILTER
  )
})
</script>
```

---

## 2.4 Backend/Service Updates

### 2.4.1 Update productsService

**File:** `src/stores/products/productsService.ts`

```typescript
async createProduct(data: CreateProductDto): Promise<Product> {
  // Validation
  if (!data.usedInDepartments || data.usedInDepartments.length === 0) {
    throw new Error('Product must be used in at least one department')
  }

  const newProduct: Product = {
    id: IdUtils.generate('product'),
    name: data.name,
    category: data.category,
    unit: data.unit,
    usedInDepartments: data.usedInDepartments, // ✅ SAVE
    canBeSold: data.canBeSold ?? true,
    isActive: data.isActive ?? true,
    createdAt: TimeUtils.now(),
    updatedAt: TimeUtils.now()
  }

  this.products.push(newProduct)
  return newProduct
}

async updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
  const product = this.products.find(p => p.id === id)
  if (!product) throw new Error('Product not found')

  // Validation if usedInDepartments is being updated
  if (data.usedInDepartments && data.usedInDepartments.length === 0) {
    throw new Error('Product must be used in at least one department')
  }

  Object.assign(product, {
    ...data,
    updatedAt: TimeUtils.now()
  })

  return product
}
```

---

### 2.4.2 Update Mock Data

**File:** `src/stores/shared/productDefinitions.ts`

```typescript
export interface CoreProductDefinition {
  id: string
  name: string
  category: ProductCategory
  baseUnit: MeasurementUnit
  purchaseUnit: string
  usedInDepartments: Department[] // ✅ ADD TO INTERFACE
  // ... other fields
}

export const CORE_PRODUCTS: CoreProductDefinition[] = [
  {
    id: 'prod-milk',
    name: 'Fresh Milk',
    category: 'dairy',
    baseUnit: 'ml',
    purchaseUnit: 'liter',
    usedInDepartments: ['kitchen', 'bar'], // ✅ Both departments
    purchaseToBaseRatio: 1000,
    baseCostPerUnit: 0.015,
    purchaseCost: 15
    // ...
  },
  {
    id: 'prod-beef',
    name: 'Beef Tenderloin',
    category: 'meat',
    baseUnit: 'gram',
    purchaseUnit: 'kg',
    usedInDepartments: ['kitchen'], // ✅ Kitchen only
    purchaseToBaseRatio: 1000,
    baseCostPerUnit: 0.15,
    purchaseCost: 150
    // ...
  },
  {
    id: 'prod-vodka',
    name: 'Vodka Premium',
    category: 'alcohol',
    baseUnit: 'ml',
    purchaseUnit: 'liter',
    usedInDepartments: ['bar'], // ✅ Bar only
    purchaseToBaseRatio: 1000,
    baseCostPerUnit: 0.05,
    purchaseCost: 50
    // ...
  }
  // ✅ UPDATE ALL PRODUCTS with appropriate departments
]
```

**Department Assignment Logic:**

- **Kitchen only:** meat, vegetables, grains, spices
- **Bar only:** alcohol, soft drinks, mixers
- **Both departments:** dairy, sauces, condiments

---

## 2.5 Testing Phase 2

### Test Scenario 1: Create Product with Departments

**Steps:**

1. Open Products view
2. Click "Create Product"
3. Fill form:
   - Name: "Coffee Beans"
   - Category: beverages
   - Departments: Select "Bar" only
4. Save

**Expected:**

- ✅ Product created successfully
- ✅ Shows badge "Bar" in table
- ✅ `usedInDepartments: ['bar']` saved

---

### Test Scenario 2: Create Shared Product

**Steps:**

1. Create product "Fresh Cream"
2. Category: dairy
3. Departments: Select both "Kitchen" AND "Bar"
4. Save

**Expected:**

- ✅ Product created
- ✅ Shows both badges "Kitchen" + "Bar"
- ✅ `usedInDepartments: ['kitchen', 'bar']` saved

---

### Test Scenario 3: Filter Products by Department

**Steps:**

1. Open Products table
2. Apply filter "Bar Only"

**Expected:**

- ✅ Shows Coffee Beans
- ✅ Shows Fresh Cream (has both)
- ✅ Does NOT show Beef (kitchen only)

---

### Test Scenario 4: Request Form Filtering

**Steps:**

1. Create new Procurement Request
2. Select Department: "Kitchen"
3. Open product selector

**Expected:**

- ✅ Shows Beef (kitchen only)
- ✅ Shows Fresh Cream (both)
- ✅ Does NOT show Coffee Beans (bar only)

4. Change Department to "Bar"
5. Open product selector again

**Expected:**

- ✅ Shows Coffee Beans (bar only)
- ✅ Shows Fresh Cream (both)
- ✅ Does NOT show Beef (kitchen only)

---

### Test Scenario 5: Validation

**Steps:**

1. Create product
2. Try to save WITHOUT selecting any department

**Expected:**

- ❌ Form validation error: "Select at least one department"
- ❌ Cannot save

---

## 2.6 Acceptance Criteria - Phase 2

- [ ] `Product.usedInDepartments` field exists and is required
- [ ] Product form has department multi-selector
- [ ] Products table shows department badges
- [ ] Products table has department filter
- [ ] Request form filters products by department
- [ ] Mock data updated with departments
- [ ] Validation prevents saving without departments
- [ ] All 5 test scenarios pass

---

# ⚡️ PHASE 1: Department Flow Through Chain (DO SECOND)

## 1.1 Overview

**Objective:** Ensure department flows correctly from Request → Order → Transit → Storage.

**Data Flow:**

```
ProcurementRequest (department: 'kitchen')
  ↓
RequestItem (inherits from parent request)
  ↓
UnassignedItem (department in sources array)
  ↓
OrderItem (department: 'kitchen') ✅ POPULATE
  ↓
TransitBatch (department: 'kitchen') ✅ POPULATE
  ↓
StorageBatch (department: 'kitchen')
```

---

## 1.2 Data Model Changes

### 1.2.1 Verify OrderItem has department field

**File:** `src/stores/supplier_2/types.ts`

```typescript
export interface OrderItem {
  id: string
  itemId: string
  itemName: string
  orderedQuantity: number
  receivedQuantity?: number
  unit: string

  department: 'kitchen' | 'bar' // ✅ VERIFY EXISTS (already added)

  // Package info
  packageId?: string
  packageName?: string
  packageQuantity?: number
  packageUnit?: string

  // Pricing
  pricePerUnit: number
  packagePrice?: number
  totalPrice: number

  // ... other fields
}
```

---

### 1.2.2 Update CreateOrderItemData

**File:** `src/stores/supplier_2/types.ts`

```typescript
export interface CreateOrderItemData {
  itemId: string
  quantity: number
  packageId: string
  department: 'kitchen' | 'bar' // ✅ ADD
  pricePerUnit?: number
  packagePrice?: number
}
```

---

## 1.3 Implementation

### 1.3.1 Determine Department When Creating Order

**File:** `src/stores/supplier_2/composables/usePurchaseOrders.ts`

**Method:** `createOrderFromBasket()`

```typescript
async function createOrderFromBasket(basket: SupplierBasket): Promise<PurchaseOrder> {
  // Prepare order items
  const items: CreateOrderItemData[] = basket.items.map(unassignedItem => {
    // ✅ Determine department from sources
    const department = determineDepartmentForOrderItem(unassignedItem)

    return {
      itemId: unassignedItem.itemId,
      quantity: unassignedItem.totalQuantity,
      packageId: unassignedItem.packageId || unassignedItem.recommendedPackageId || '',
      department, // ✅ ADD DEPARTMENT
      pricePerUnit: unassignedItem.estimatedBaseCost,
      packagePrice: unassignedItem.estimatedPackagePrice
    }
  })

  // Create order
  const orderData: CreateOrderData = {
    supplierId: basket.supplierId,
    requestIds: basket.requestIds,
    items,
    expectedDeliveryDate: basket.expectedDeliveryDate,
    notes: basket.notes
  }

  const newOrder = await supplierStore.createOrder(orderData)
  return newOrder
}

// ✅ NEW HELPER FUNCTION
function determineDepartmentForOrderItem(item: UnassignedItem): 'kitchen' | 'bar' {
  // Strategy 1: If all sources from same department → use it
  const departments = item.sources.map(s => s.department)
  const uniqueDepartments = [...new Set(departments)]

  if (uniqueDepartments.length === 1) {
    return uniqueDepartments[0]
  }

  // Strategy 2: If mixed → use department with largest quantity
  const departmentQuantities = item.sources.reduce(
    (acc, source) => {
      acc[source.department] = (acc[source.department] || 0) + source.quantity
      return acc
    },
    {} as Record<'kitchen' | 'bar', number>
  )

  const maxDepartment = Object.entries(departmentQuantities).sort(([, a], [, b]) => b - a)[0][0] as
    | 'kitchen'
    | 'bar'

  // ⚠️ Log warning for mixed departments
  console.warn(
    `[OrderItem] Product "${item.itemName}" has mixed departments. ` +
      `Using "${maxDepartment}" (largest quantity).`,
    {
      product: item.itemName,
      departments: departmentQuantities,
      chosen: maxDepartment
    }
  )

  return maxDepartment
}
```

---

### 1.3.2 Save Department in supplierService

**File:** `src/stores/supplier_2/supplierService.ts`

**Method:** `createOrder()`

```typescript
async createOrder(data: CreateOrderData): Promise<PurchaseOrder> {

  // ... existing code to get supplier, validate, etc.

  const newOrder: PurchaseOrder = {
    id: `order-${Date.now()}`,
    orderNumber: this.generateOrderNumber(),
    supplierId: data.supplierId,
    supplierName: supplier.name,
    orderDate: new Date().toISOString(),
    expectedDeliveryDate: data.expectedDeliveryDate,

    // Map items
    items: data.items.map((itemData, index) => {
      const product = this.getProductById(itemData.itemId)

      const orderItem: OrderItem = {
        id: `order-item-${Date.now()}-${index}`,
        itemId: itemData.itemId,
        itemName: product?.name || 'Unknown',
        orderedQuantity: itemData.quantity,
        unit: product?.unit || 'piece',

        department: itemData.department, // ✅ SAVE DEPARTMENT

        packageId: itemData.packageId,
        pricePerUnit: itemData.pricePerUnit || 0,
        packagePrice: itemData.packagePrice,
        totalPrice: itemData.quantity * (itemData.pricePerUnit || 0),

        status: 'ordered',
        // ... other fields
      }

      return orderItem
    }),

    totalAmount: this.calculateOrderTotal(data.items),
    status: 'draft',
    // ... other fields
  }

  this.orders.unshift(newOrder)
  return newOrder
}
```

---

### 1.3.3 Pass Department to Transit Batch

**File:** `src/stores/supplier_2/composables/useReceipts.ts`

**Method:** `startReceipt()`

```typescript
async function startReceipt(orderId: string): Promise<void> {
  const order = getOrderById(orderId)
  if (!order) throw new Error('Order not found')

  // Create transit batches for each order item
  const transitBatches: StorageBatch[] = order.items.map(item => {
    const product = productsStore.getProductById(item.itemId)

    return {
      id: IdUtils.generate('transit-batch'),
      batchNumber: `TB-${order.orderNumber}-${item.itemId.slice(0, 4)}`,
      itemId: item.itemId,
      itemType: 'product',

      department: item.department, // ✅ TAKE FROM OrderItem

      initialQuantity: item.orderedQuantity,
      currentQuantity: item.orderedQuantity,
      unit: item.unit,
      costPerUnit: item.pricePerUnit,
      totalValue: item.totalPrice,

      receiptDate: TimeUtils.now(),
      status: 'in_transit',
      isActive: false,

      sourceType: 'purchase',
      purchaseOrderId: order.id,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      plannedDeliveryDate: order.expectedDeliveryDate,

      createdAt: TimeUtils.now(),
      updatedAt: TimeUtils.now()
    }
  })

  // Save transit batches to storage store
  await storageStore.createTransitBatches(transitBatches)

  // Update order status
  await updateOrder(orderId, { status: 'sent' })
}
```

---

### 1.3.4 Verify Transit Batch Filtering Works

**File:** `src/views/storage/components/StorageStockTable.vue`

**Computed property should already work:**

```typescript
const departmentTransitBatches = computed(() => {
  if (currentDepartment.value === 'all') {
    return storageStore.state.transitBatches
  }

  // ✅ Filter by department - should work now
  return storageStore.state.transitBatches.filter(
    batch => batch.department === currentDepartment.value
  )
})
```

---

## 1.4 Testing Phase 1

### Test Scenario 1: Single Department Request → Order

**Steps:**

1. Create Request in Kitchen
   - Add: Milk 10L, Beef 5kg
2. Group into order
3. Send order (create transit batches)
4. Open Storage → Kitchen tab

**Expected:**

- ✅ OrderItems have `department: 'kitchen'`
- ✅ Transit batches have `department: 'kitchen'`
- ✅ Transit batches visible in Kitchen tab
- ✅ Transit batches NOT visible in Bar tab

---

### Test Scenario 2: Multiple Requests Same Department

**Steps:**

1. Create Request #1 in Kitchen: Milk 5L
2. Create Request #2 in Kitchen: Milk 10L
3. Group both into one order
4. Check OrderItem for milk

**Expected:**

- ✅ OrderItem: Milk 15L, `department: 'kitchen'`
- ✅ No warning in console (single department)

---

### Test Scenario 3: Mixed Departments (Edge Case)

**Steps:**

1. Create Request #1 in Kitchen: Milk 10L
2. Create Request #2 in Bar: Milk 5L
3. Group both into one order
4. Check console

**Expected:**

- ✅ OrderItem: Milk 15L, `department: 'kitchen'` (larger qty)
- ⚠️ Warning in console about mixed departments

---

### Test Scenario 4: Complete Receipt → Active Batch

**Steps:**

1. Order sent → Transit batch created
2. Complete receipt
3. Convert to active batch
4. Check Storage balance

**Expected:**

- ✅ Active batch inherits department from transit
- ✅ Balance shows in correct department tab

---

## 1.5 Acceptance Criteria - Phase 1

- [ ] `OrderItem.department` populated when creating order
- [ ] `determineDepartmentForOrderItem()` helper works correctly
- [ ] Warning logged when mixed departments detected
- [ ] `TransitBatch.department` inherited from OrderItem
- [ ] Transit batches filter correctly by department in UI
- [ ] Active batches maintain department after conversion
- [ ] All 4 test scenarios pass

---

# 🏭 PHASE 3: Warehouse Management System (FUTURE/TODO)

## 3.1 Overview

**Objective:** Separate "zone of responsibility" (department) from "physical location" (warehouse).

**Concept:**

- **Department** = Business logic (who ordered, who pays, planning)
- **Warehouse** = Physical logistics (where stored, how moved)

**Example Use Cases:**

- Main central warehouse serving both departments
- Separate prep areas (Kitchen Prep, Bar Stock)
- Special storage (Cold Room, Dry Storage)
- Transfer between locations

---

## 3.2 Core Entities

### Warehouse

```typescript
export interface Warehouse extends BaseEntity {
  name: string // 'Main Storage', 'Kitchen Prep', 'Bar Counter'
  code: string // 'MAIN', 'KITCH-PREP', 'BAR-01'
  location: string // 'Building A, Floor 1'
  type: 'main' | 'production' | 'point_of_sale' | 'temporary'

  managedByDepartment?: Department // optional

  capacity?: {
    maxVolume?: number // m³
    maxWeight?: number // kg
    conditions?: ('ambient' | 'refrigerated' | 'frozen')[]
  }

  isActive: boolean
  sortOrder: number
  notes?: string
}
```

---

### StorageBatch with Warehouse

```typescript
export interface StorageBatch extends BaseEntity {
  // ... existing fields

  department: Department // WHO is responsible
  warehouseId: string // WHERE it's physically located
  warehouseName?: string // cached

  locationHistory?: Array<{
    warehouseId: string
    warehouseName: string
    movedAt: string
    movedBy: string
    reason?: string
  }>
}
```

---

### Warehouse Transfer

```typescript
export interface WarehouseTransfer extends BaseEntity {
  transferNumber: string // 'TRF-001'
  transferDate: string

  fromWarehouseId: string
  fromWarehouseName: string
  toWarehouseId: string
  toWarehouseName: string

  items: WarehouseTransferItem[]

  requestedBy: string
  requestedByDepartment: Department
  performedBy?: string

  status: 'draft' | 'in_progress' | 'completed' | 'cancelled'
  reason: 'production_need' | 'rebalancing' | 'expiry_prevention' | 'other'

  totalValue: number
  notes?: string

  requestedAt: string
  completedAt?: string
}

export interface WarehouseTransferItem {
  id: string
  batchId: string
  itemId: string
  itemName: string
  itemType: 'product'

  quantity: number
  unit: string
  costPerUnit: number
  totalValue: number

  actualQuantity?: number // may differ
  notes?: string
}
```

---

## 3.3 Key Operations

### Receipt → Warehouse Assignment

```typescript
async function convertTransitToActive(
  transitBatch: StorageBatch,
  actualQuantity: number,
  targetWarehouseId: string // ✅ NEW PARAMETER
): Promise<StorageBatch> {
  return {
    ...transitBatch,
    status: 'active',
    isActive: true,
    currentQuantity: actualQuantity,
    warehouseId: targetWarehouseId, // ✅ ASSIGN WAREHOUSE
    actualDeliveryDate: TimeUtils.now(),
    locationHistory: [
      {
        warehouseId: targetWarehouseId,
        warehouseName: getWarehouseName(targetWarehouseId),
        movedAt: TimeUtils.now(),
        movedBy: currentUser,
        reason: 'Initial receipt'
      }
    ]
  }
}
```

---

### Create Transfer Between Warehouses

```typescript
async function createWarehouseTransfer(
  data: CreateWarehouseTransferData
): Promise<WarehouseTransfer> {
  // Validate batches exist in source warehouse
  for (const item of data.items) {
    const batch = await getBatchById(item.batchId)
    if (batch.warehouseId !== data.fromWarehouseId) {
      throw new Error(`Batch not in source warehouse`)
    }
    if (batch.currentQuantity < item.quantity) {
      throw new Error(`Insufficient quantity`)
    }
  }

  // Create transfer document
  const transfer: WarehouseTransfer = {
    id: IdUtils.generate('transfer'),
    transferNumber: generateTransferNumber(),
    transferDate: TimeUtils.now(),
    fromWarehouseId: data.fromWarehouseId,
    toWarehouseId: data.toWarehouseId,
    items: data.items.map(createTransferItem),
    status: 'draft'
    // ... other fields
  }

  return transfer
}
```

---

### Complete Transfer (Move Batches)

```typescript
async function completeWarehouseTransfer(transferId: string, performedBy: string): Promise<void> {
  const transfer = await getTransferById(transferId)

  for (const item of transfer.items) {
    const batch = await getBatchById(item.batchId)

    // Partial transfer → split batch
    if (item.quantity < batch.currentQuantity) {
      await splitAndMoveBatch(batch, item.quantity, transfer.toWarehouseId)
    }
    // Full transfer → move entire batch
    else {
      await moveBatchToWarehouse(batch, transfer.toWarehouseId, performedBy)
    }
  }

  transfer.status = 'completed'
  transfer.performedBy = performedBy
  transfer.completedAt = TimeUtils.now()
}
```

---

### Split Batch (Partial Transfer)

```typescript
async function splitAndMoveBatch(
  originalBatch: StorageBatch,
  quantityToMove: number,
  toWarehouseId: string
): Promise<void> {
  // Create new batch for moved quantity
  const newBatch: StorageBatch = {
    ...originalBatch,
    id: IdUtils.generate('batch'),
    batchNumber: `${originalBatch.batchNumber}-SPLIT`,
    initialQuantity: quantityToMove,
    currentQuantity: quantityToMove,
    totalValue: quantityToMove * originalBatch.costPerUnit,
    warehouseId: toWarehouseId,
    locationHistory: [
      {
        warehouseId: toWarehouseId,
        warehouseName: getWarehouseName(toWarehouseId),
        movedAt: TimeUtils.now(),
        movedBy: currentUser,
        reason: 'Transfer (split)'
      }
    ]
  }

  // Reduce original batch
  originalBatch.currentQuantity -= quantityToMove
  originalBatch.totalValue = originalBatch.currentQuantity * originalBatch.costPerUnit

  await saveBatch(newBatch)
  await updateBatch(originalBatch)
}
```

---

## 3.4 UI Components

### Main Warehouse View

```vue
<!-- src/views/warehouse/WarehouseManagementView.vue -->

<template>
  <div class="warehouse-management">
    <v-tabs v-model="activeTab">
      <v-tab value="overview">Warehouses</v-tab>
      <v-tab value="transfers">Transfers</v-tab>
      <v-tab value="stock">Stock by Location</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="overview">
        <WarehousesTable />
      </v-window-item>

      <v-window-item value="transfers">
        <WarehouseTransfersTable />
      </v-window-item>

      <v-window-item value="stock">
        <StockByLocationView />
      </v-window-item>
    </v-window>
  </div>
</template>
```

---

### Transfer Dialog

```vue
<!-- src/views/warehouse/components/WarehouseTransferDialog.vue -->

<template>
  <v-dialog v-model="dialog" max-width="900px">
    <v-card>
      <v-card-title>Create Warehouse Transfer</v-card-title>

      <v-card-text>
        <v-form ref="formRef">
          <!-- Source Warehouse -->
          <v-select
            v-model="formData.fromWarehouseId"
            :items="availableWarehouses"
            label="From Warehouse *"
            @update:model-value="loadAvailableBatches"
          />

          <!-- Destination Warehouse -->
          <v-select
            v-model="formData.toWarehouseId"
            :items="destinationWarehouses"
            label="To Warehouse *"
            :rules="[v => v !== formData.fromWarehouseId || 'Must differ']"
          />

          <!-- Reason -->
          <v-select v-model="formData.reason" :items="transferReasons" label="Reason *" />

          <!-- Items to Transfer -->
          <v-card variant="outlined" class="mt-4">
            <v-card-title>Items to Transfer</v-card-title>
            <v-card-text>
              <!-- Add Item Button -->
              <v-btn @click="showAddItemDialog = true" :disabled="!formData.fromWarehouseId">
                Add Item
              </v-btn>

              <!-- Items List -->
              <v-list>
                <v-list-item v-for="(item, idx) in formData.items" :key="idx">
                  <v-list-item-title>
                    {{ item.itemName }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Batch: {{ item.batchNumber }} | Qty: {{ item.quantity }} {{ item.unit }}
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn icon="mdi-delete" size="small" variant="text" @click="removeItem(idx)" />
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="handleSubmit" :disabled="!isValid">Create Transfer</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

---

### Stock by Location View

```vue
<!-- src/views/warehouse/components/StockByLocationView.vue -->

<template>
  <div>
    <!-- Warehouse Selector -->
    <v-select
      v-model="selectedWarehouseId"
      :items="warehouses"
      label="Select Warehouse"
      item-title="name"
      item-value="id"
    />

    <!-- Stock Table for Selected Warehouse -->
    <v-data-table :headers="headers" :items="warehouseStock" :loading="loading">
      <template #item.department="{ item }">
        <v-chip :color="getDepartmentColor(item.department)" size="small">
          {{ item.department }}
        </v-chip>
      </template>

      <template #item.quantity="{ item }">
        {{ formatQuantity(item.quantity, item.unit) }}
      </template>

      <template #item.value="{ item }">
        {{ formatCurrency(item.value) }}
      </template>

      <template #item.actions="{ item }">
        <v-btn icon="mdi-swap-horizontal" size="small" @click="openTransferDialog(item)">
          <v-icon>mdi-swap-horizontal</v-icon>
          <v-tooltip activator="parent">Transfer</v-tooltip>
        </v-btn>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
const warehouseStock = computed(() => {
  if (!selectedWarehouseId.value) return []

  return storageStore.state.activeBatches
    .filter(batch => batch.warehouseId === selectedWarehouseId.value)
    .map(batch => ({
      itemId: batch.itemId,
      itemName: getProductName(batch.itemId),
      department: batch.department,
      quantity: batch.currentQuantity,
      unit: batch.unit,
      value: batch.totalValue,
      batchCount: 1
    }))
})
</script>
```

---

## 3.5 Use Cases

### Use Case 1: Centralized Storage

**Scenario:** Restaurant has one main warehouse, distributes to kitchen/bar as needed.

**Setup:**

- Main Warehouse (managed by: none - shared)
- Kitchen Prep Area (managed by: kitchen)
- Bar Stock Area (managed by: bar)

**Flow:**

1. Receipt arrives → assign to Main Warehouse
2. Kitchen needs milk → transfer from Main to Kitchen Prep
3. Bar needs milk → transfer from Main to Bar Stock
4. Inventory counts by location, but costs tracked by department

---

### Use Case 2: Separate Department Warehouses

**Scenario:** Kitchen and Bar have completely separate storage.

**Setup:**

- Kitchen Warehouse (managed by: kitchen)
- Bar Warehouse (managed by: bar)

**Flow:**

1. Kitchen order arrives → directly to Kitchen Warehouse
2. Bar order arrives → directly to Bar Warehouse
3. Rare cross-transfers require approval

---

### Use Case 3: Temperature-Controlled Storage

**Scenario:** Need to track items by storage conditions.

**Setup:**

- Dry Storage (ambient)
- Cold Room (refrigerated)
- Freezer (frozen)

**Flow:**

1. Receipt: milk → Cold Room
2. Receipt: frozen beef → Freezer
3. Receipt: rice → Dry Storage
4. Can query "what's expiring in Cold Room?"

---

## 3.6 Implementation Priority (When to Build)

**Build Phase 3 when you need:**

- ✅ Multiple physical storage locations
- ✅ Track items by storage conditions
- ✅ Inter-location transfers
- ✅ Location-based inventory counts
- ✅ Separate prep areas from main storage

**DON'T build Phase 3 if:**

- ❌ Single storage location
- ❌ No transfer operations needed
- ❌ Department separation is sufficient

**Current assessment:** Phase 3 can be deferred. Phases 1-2 provide sufficient functionality for most restaurant operations.

---

# 📊 Implementation Summary

## Timeline Estimate

| Phase                | Estimated Time | Complexity |
| -------------------- | -------------- | ---------- |
| Phase 2 (Products)   | 3-4 hours      | Medium     |
| Phase 1 (Flow)       | 2-3 hours      | Low-Medium |
| Phase 3 (Warehouses) | 10-15 hours    | High       |

## Recommended Approach

1. **Start:** Phase 2 (Products department attribution)

   - Foundation for everything else
   - Enables validation
   - Quick wins visible in UI

2. **Next:** Phase 1 (Department flow)

   - Simple propagation logic
   - Builds on Phase 2
   - Completes the core feature

3. **Future:** Phase 3 (Warehouse management)
   - Only if business needs it
   - Separate epic/project
   - Can be built incrementally

---

# ✅ Definition of Done

## Phase 2 Complete When:

- [ ] `Product.usedInDepartments` field exists
- [ ] Product form updated and working
- [ ] Products table shows department badges
- [ ] Department filter works
- [ ] Request form filters products correctly
- [ ] Mock data updated
- [ ] All Phase 2 tests pass

## Phase 1 Complete When:

- [ ] `OrderItem.department` populated correctly
- [ ] Transit batches have correct department
- [ ] Department filtering works in Storage view
- [ ] Helper functions implemented
- [ ] Edge cases handled (mixed departments)
- [ ] All Phase 1 tests pass

## Phase 3 Complete When:

- Deferred - create separate specification when needed

---

# 🔧 Technical Notes

## No Backward Compatibility Needed

- Fresh application - no existing data
- Can change schemas freely
- No migration scripts required
- Use TypeScript strict mode

## Code Quality Standards

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use composables pattern for business logic
- Extract reusable utilities

## Testing Strategy

- Manual testing via UI (scenarios provided)
- Console logging for debugging
- Validation at form level
- Type safety via TypeScript

---

# 📚 Related Documentation

- Architecture: `src/About/Base/ArchitecturApp.md`
- Product Types: `src/stores/products/types.ts`
- Supplier Types: `src/stores/supplier_2/types.ts`
- Storage Types: `src/stores/storage/types.ts`
- Menu Types: `src/stores/menu/types.ts`

---

# 🎯 Success Metrics

After implementation, you should be able to:

1. ✅ Create products with department attribution
2. ✅ Filter products by department in all views
3. ✅ Create requests only with valid products for department
4. ✅ Track department through entire procurement chain
5. ✅ View transit/active batches filtered by department
6. ✅ Generate reports by department
7. ✅ Prevent data inconsistencies with validation

---

**END OF SPECIFICATION**

Ready to implement Phase 2 → Phase 1 in that order.
