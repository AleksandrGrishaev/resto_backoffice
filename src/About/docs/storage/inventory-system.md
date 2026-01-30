# Storage & Inventory System Architecture

**Last Updated:** 2026-01-30
**Author:** Development Team
**Status:** Active
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Batch System](#batch-system)
4. [Write-off System](#write-off-system)
5. [FIFO Cost Allocation](#fifo-cost-allocation)
6. [Negative Inventory](#negative-inventory)
7. [Inventory Counts](#inventory-counts)
8. [Preparations Inventory](#preparations-inventory)
9. [Integration Points](#integration-points)
10. [Database Schema](#database-schema)
11. [Code Examples](#code-examples)
12. [Common Scenarios](#common-scenarios)
13. [Best Practices](#best-practices)
14. [Troubleshooting](#troubleshooting)

---

## Overview

Kitchen App использует **комплексную систему управления запасами** с двумя параллельными подсистемами:

1. **Product Storage** - Склад сырых продуктов (ингредиентов)
2. **Preparation Storage** - Склад полуфабрикатов (preparations)

### Key Insight

**Система основана на батчах (партиях):**

- Каждое поступление товара создаёт новый batch
- Списание происходит по методу FIFO (First In, First Out)
- Поддержка негативных батчей для продажи "в долг"
- Инвентаризация автоматически корректирует остатки

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT STORAGE                          │
├─────────────────────────────────────────────────────────────┤
│ Storage Batches → Balance Calculation → Write-off → FIFO   │
│     ↑ receipt        ↓ computed           ↓           ↓    │
│ Purchase Orders   StorageBalance      Operations   Costs   │
└─────────────────────────────────────────────────────────────┘
                              ↓ used in
┌─────────────────────────────────────────────────────────────┐
│                  PREPARATION STORAGE                        │
├─────────────────────────────────────────────────────────────┤
│ Prep Batches → Balance Calculation → Write-off → FIFO      │
│    ↑ production       ↓ computed        ↓          ↓       │
│ Kitchen/Bar       PrepBalance      Operations    Costs     │
└─────────────────────────────────────────────────────────────┘
                              ↓ consumed by
┌─────────────────────────────────────────────────────────────┐
│                     POS SYSTEM                              │
├─────────────────────────────────────────────────────────────┤
│ Order → Decomposition → sales_consumption Write-off        │
│   ↓         ↓                    ↓                         │
│ Menu    Products/Preps      Batch Deduction                │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Entity Types

#### StorageBatch (Product Inventory)

**Роль:** Партия товара на складе

```typescript
interface StorageBatch {
  id: string
  batchNumber: string // "RCP-20260130-001" или "NEG-1706612400000"
  itemId: string // Product UUID
  itemType: 'product'

  // Quantities
  initialQuantity: number // Начальное количество
  currentQuantity: number // Текущий остаток (может быть отрицательным!)
  unit: string // 'gram' | 'ml' | 'piece'

  // Costs
  costPerUnit: number // Цена за единицу
  totalValue: number // currentQuantity * costPerUnit

  // Dates
  receiptDate: string // Дата поступления
  expiryDate?: string // Срок годности

  // Classification
  sourceType: 'purchase' | 'correction' | 'opening_balance' | 'inventory_adjustment'
  status: 'active' | 'expired' | 'consumed' | 'in_transit'
  warehouseId: string // Склад

  // Negative inventory fields
  isNegative?: boolean // Негативный батч (продали больше чем было)
  sourceBatchId?: string // Ссылка на последний положительный батч
  negativeCreatedAt?: string // Когда создан негативный батч
  negativeReason?: string // Причина негативного остатка
  sourceOperationType?: 'pos_order' | 'preparation_production' | 'manual_writeoff'
  affectedRecipeIds?: string[] // Рецепты, затронутые этим батчем
  reconciledAt?: string // Когда негативный батч был погашен

  // Transit fields (Purchase Orders)
  purchaseOrderId?: string // Заказ поставщику
  supplierId?: string
  supplierName?: string
  plannedDeliveryDate?: string
  actualDeliveryDate?: string
}
```

#### StorageBalance (Calculated Summary)

**Роль:** Агрегированный баланс по продукту

```typescript
interface StorageBalance {
  itemId: string
  itemName: string
  totalQuantity: number // Сумма currentQuantity всех активных батчей
  unit: string
  totalValue: number // Сумма totalValue всех батчей
  averageCost: number // Средневзвешенная цена
  latestCost: number // Цена последнего поступления
  costTrend: 'up' | 'down' | 'stable'

  // Status flags
  hasExpired: boolean // Есть просроченные батчи
  hasNearExpiry: boolean // Есть батчи с истекающим сроком
  belowMinStock: boolean // Ниже минимального запаса

  // Analytics
  batches: StorageBatch[] // Все активные батчи
  oldestBatchDate: string
  newestBatchDate: string
  averageDailyUsage?: number
  daysOfStockRemaining?: number
}
```

#### StorageOperation (Audit Trail)

**Роль:** История операций (receipt, correction, inventory, write_off)

```typescript
interface StorageOperation {
  id: string
  operationType: 'receipt' | 'correction' | 'inventory' | 'write_off'
  documentNumber: string // "WO-20260130-001"
  operationDate: string
  department: 'kitchen' | 'bar'
  responsiblePerson: string
  items: StorageOperationItem[]
  totalValue?: number
  status: 'draft' | 'confirmed'

  // Write-off specific
  writeOffDetails?: {
    reason: WriteOffReason
    affectsKPI: boolean
    notes?: string
  }

  // Correction specific
  correctionDetails?: {
    reason: 'recipe_usage' | 'waste' | 'expired' | 'theft' | 'damage' | 'other'
    relatedId?: string
    relatedName?: string
    portionCount?: number
  }

  relatedInventoryId?: string
  relatedPreparationOperationId?: string
}
```

---

## Batch System

### Batch Lifecycle

```
1. CREATION (Receipt/Production)
   └─> New batch: initialQuantity = currentQuantity
   └─> Status: 'active'
   └─> Added to balances

2. CONSUMPTION (Write-off/Sales)
   └─> FIFO: oldest batch first
   └─> currentQuantity decremented
   └─> If currentQuantity = 0 → status: 'consumed'

3. EXPIRY
   └─> Background job checks expiryDate
   └─> status: 'expired'
   └─> Can be written off with reason 'expired'

4. NEGATIVE (Selling without stock)
   └─> New negative batch created
   └─> currentQuantity < 0
   └─> Reconciled when new receipt arrives
```

### Batch Status Flow

```
                    ┌──────────┐
                    │ in_transit│ (Purchase Order sent)
                    └────┬─────┘
                         │ receipt
                         ▼
                    ┌──────────┐
          ┌────────│  active  │────────┐
          │        └──────────┘        │
          │             │              │
   write_off      full consumed   expiry date
          │             │              │
          ▼             ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ consumed │  │ consumed │  │ expired  │
    └──────────┘  └──────────┘  └──────────┘
```

### Transit Batches (Purchase Orders)

Когда создаётся заказ поставщику:

```typescript
// 1. Create transit batches (in_transit status)
const transitBatches = await storageStore.createTransitBatches([
  {
    itemId: 'product_uuid',
    itemName: 'Tomatoes',
    quantity: 5000,
    unit: 'gram',
    estimatedCostPerUnit: 15,
    purchaseOrderId: 'po_123',
    supplierId: 'supplier_uuid',
    supplierName: "Bu'Dewa",
    plannedDeliveryDate: '2026-02-01'
  }
])

// 2. On receipt (приёмка)
await storageStore.convertTransitBatchesToActive(
  'po_123',
  [{ itemId: 'product_uuid', receivedQuantity: 4800, actualPrice: 16 }],
  '2026-01-30'
)

// 3. On order cancel
await storageStore.removeTransitBatchesOnOrderCancel('po_123')
```

---

## Write-off System

### Write-off Reasons

Kitchen App классифицирует списания на **KPI-влияющие** и **не влияющие на KPI**:

```typescript
// KPI-AFFECTING (влияют на метрики потерь)
const KPI_AFFECTING_REASONS = ['expired', 'spoiled', 'other']

// NON-KPI-AFFECTING (нормальные операции)
const NON_KPI_AFFECTING_REASONS = [
  'education', // Обучение персонала
  'test', // Тестирование рецептов
  'production_consumption', // Расход на производство полуфабрикатов
  'sales_consumption' // Расход на продажи (POS)
]
```

### Write-off Reason Options

| Reason                   | Title          | Description                         | Affects KPI |
| ------------------------ | -------------- | ----------------------------------- | ----------- |
| `expired`                | Expired        | Product has passed expiry date      | ✅ Yes      |
| `spoiled`                | Spoiled        | Product is damaged or spoiled       | ✅ Yes      |
| `other`                  | Other Loss     | Other losses (spill, mistake, etc.) | ✅ Yes      |
| `education`              | Education      | Staff training and education        | ❌ No       |
| `test`                   | Recipe Testing | Recipe development and testing      | ❌ No       |
| `production_consumption` | Production     | Raw products for prep production    | ❌ No       |
| `sales_consumption`      | Sales          | Products/preps consumed for sales   | ❌ No       |

### Write-off Process

```typescript
// 1. Manual write-off (через UI)
const operation = await storageStore.createWriteOff({
  warehouseId: 'warehouse-winter',
  department: 'kitchen',
  responsiblePerson: 'Chef Anna',
  reason: 'expired',
  items: [
    {
      itemId: 'product_uuid',
      itemName: 'Tomatoes',
      itemType: 'product',
      quantity: 500,
      unit: 'gram'
    }
  ],
  notes: 'Expired yesterday'
})

// 2. Automatic write-off (POS sales)
// При оплате заказа автоматически создаётся write-off с reason='sales_consumption'
await storageStore.createWriteOff(
  {
    department: 'kitchen',
    reason: 'sales_consumption',
    items: decomposedProducts,
    responsiblePerson: 'System'
  },
  { skipReload: true } // ⚡ Оптимизация: не перезагружаем балансы
)
```

### Write-off Statistics

```typescript
const stats: WriteOffStatistics = await storageStore.getWriteOffStatistics(
  'kitchen',      // department
  '2026-01-01',   // dateFrom
  '2026-01-31'    // dateTo
)

// Result:
{
  total: { count: 45, value: 1250000 },
  kpiAffecting: {
    count: 12,
    value: 450000,
    reasons: {
      expired: { count: 5, value: 200000 },
      spoiled: { count: 4, value: 150000 },
      other: { count: 3, value: 100000 }
    }
  },
  nonKpiAffecting: {
    count: 33,
    value: 800000,
    reasons: {
      education: { count: 2, value: 50000 },
      test: { count: 1, value: 25000 }
      // production_consumption и sales_consumption учитываются отдельно
    }
  },
  byDepartment: {
    kitchen: { total: 35, kpiAffecting: 10, nonKpiAffecting: 25 },
    bar: { total: 10, kpiAffecting: 2, nonKpiAffecting: 8 }
  }
}
```

---

## FIFO Cost Allocation

### Overview

FIFO (First In, First Out) - метод учёта, при котором списание происходит с самых старых партий.

**Implementation:** Supabase RPC functions (Migration 111)

### Algorithm

```sql
-- allocate_product_fifo(p_product_id, p_quantity, p_fallback_cost)

1. Get all active batches for product
2. Order by:
   - Positive batches first (current_quantity > 0)
   - Then by receipt_date ASC (oldest first)
3. For each batch:
   - Allocate min(batch.current_quantity, remaining_quantity)
   - Track cost per allocation
4. If remaining > 0: use fallback cost (last_known_cost or base_cost)
5. Return allocations with costs
```

### FIFO Response Structure

```typescript
interface FIFOAllocationResult {
  allocations: Array<{
    batchId: string
    batchNumber: string
    allocatedQuantity: number
    costPerUnit: number
    totalCost: number
    batchCreatedAt: string
    isNegative?: boolean // true for negative batch allocations
  }>
  totalCost: number
  totalAllocated: number
  averageCost: number
  deficit?: number // Если запрошено больше чем есть
  productName?: string
}
```

### Example FIFO Allocation

```
Request: 300g tomatoes

Available batches:
  Batch A: 100g @ 15 Rp/g (oldest, 2026-01-25)
  Batch B: 150g @ 18 Rp/g (2026-01-28)
  Batch C: 200g @ 16 Rp/g (newest, 2026-01-30)

Allocation:
  From A: 100g × 15 = 1,500 Rp
  From B: 150g × 18 = 2,700 Rp
  From C:  50g × 16 =   800 Rp
  ─────────────────────────────
  Total: 300g, Cost: 5,000 Rp
  Average: 16.67 Rp/g
```

### Calling FIFO Functions

```typescript
// Product FIFO
const { data } = await supabase.rpc('allocate_product_fifo', {
  p_product_id: 'product_uuid',
  p_quantity: 300,
  p_fallback_cost: 15 // Used if no batches available
})

// Preparation FIFO
const { data } = await supabase.rpc('allocate_preparation_fifo', {
  p_preparation_id: 'prep_uuid',
  p_quantity: 500,
  p_fallback_cost: 25
})
```

---

## Negative Inventory

### Concept

Negative inventory позволяет продавать товары, которых физически нет на складе ("в долг").

**Use Cases:**

- Касса продала товар, но приёмка ещё не оформлена
- Утренняя продажа до дневной поставки
- Отложенный учёт

### Cost Fallback Chain

Когда создаётся негативный батч, стоимость определяется по цепочке:

```
1. Last active batch cost (most recent positive batch)
   ↓ if not found
2. Average cost from depleted batches (historical)
   ↓ if not found
3. Cached last_known_cost from products table
   ↓ if not found
4. base_cost_per_unit from products table
   ↓ if not found
5. Return 0 with CRITICAL ERROR (makes problem visible)
```

### Negative Batch Creation

```typescript
// Automatic (during POS sale with insufficient stock)
const negativeBatch = await negativeBatchService.createNegativeBatch({
  productId: 'product_uuid',
  warehouseId: 'warehouse-winter',
  quantity: -100,               // Negative!
  unit: 'gram',
  cost: 15,                     // From fallback chain
  reason: 'Sold before receipt',
  sourceOperationType: 'pos_order',
  affectedRecipeIds: ['recipe_1']
})

// Result:
{
  id: 'batch_uuid',
  batchNumber: 'NEG-1706612400000',
  currentQuantity: -100,        // Negative
  costPerUnit: 15,
  isNegative: true,
  status: 'active',
  reconciledAt: null
}
```

### Negative Batch Consolidation

Система объединяет негативные батчи вместо создания дубликатов:

```typescript
// First shortage: -100g
await negativeBatchService.createNegativeBatch({...}) // Creates NEG-001

// Second shortage (same product): -50g
const existing = await negativeBatchService.getActiveNegativeBatch(productId, warehouseId)
if (existing) {
  await negativeBatchService.updateNegativeBatch(existing.id, 50, cost)
  // Result: NEG-001 now has -150g instead of creating NEG-002
}
```

### Balance Calculation with Negative Batches

```sql
-- Balance = SUM of all active batch quantities (positive + negative)
SELECT
  item_id,
  SUM(current_quantity) as total_quantity  -- e.g., 500 + (-100) = 400
FROM storage_batches
WHERE is_active = true
GROUP BY item_id
```

### Reconciliation

Негативные батчи остаются активными и погашаются во время инвентаризации или вручную:

```typescript
// Option 1: Manual reconciliation
await negativeBatchService.markAsReconciled(batchId)

// Option 2: Auto-reconciliation during inventory
// When actual count matches expected, negative batches are marked reconciled

// Option 3: Undo reconciliation
await negativeBatchService.undoReconciliation(batchId)
```

---

## Inventory Counts

### Overview

Инвентаризация - процесс сверки фактических остатков с системными.

### Inventory Document Lifecycle

```
1. START INVENTORY
   └─> Create InventoryDocument (status: 'draft')
   └─> Load all products with system quantities
   └─> Staff counts actual quantities

2. UPDATE INVENTORY
   └─> Record actual quantities for each item
   └─> Calculate differences
   └─> Mark items as confirmed

3. FINALIZE INVENTORY
   └─> status: 'confirmed'
   └─> Create correction operations for differences
   └─> Update batch quantities
   └─> Update last_counted_at on products
```

### Inventory Item Structure

```typescript
interface InventoryItem {
  id: string
  itemId: string
  itemName: string
  category?: string

  systemQuantity: number // What system thinks we have
  actualQuantity: number // What staff counted
  difference: number // actual - system (can be negative)

  unit: string
  averageCost: number
  valueDifference: number // difference × averageCost

  notes?: string
  countedBy?: string
  confirmed?: boolean // Staff confirmed this count
  userInteracted?: boolean // Staff touched this item
  lastCountedAt?: string // Last inventory date
}
```

### Inventory Process

```typescript
// 1. Start inventory
const inventory = await storageStore.startInventory({
  department: 'kitchen',
  responsiblePerson: 'Manager Anna'
})

// 2. Update items as staff counts
const updatedItems = inventory.items.map(item => ({
  ...item,
  actualQuantity: getActualCount(item.itemId),
  confirmed: true,
  userInteracted: true
}))

await storageStore.updateInventory(inventory.id, updatedItems)

// 3. Finalize and create corrections
await storageStore.finalizeInventory(inventory.id)

// Result:
// - Correction operations created for each difference
// - Batch quantities updated
// - products.last_counted_at updated
```

### Automatic Corrections

При финализации инвентаризации:

**Surplus (actualQuantity > systemQuantity):**

- Create new batch with `sourceType: 'inventory_adjustment'`
- Cost from average of existing batches

**Shortage (actualQuantity < systemQuantity):**

- Create correction operation
- Deduct from batches using FIFO
- If goes negative → create negative batch

---

## Preparations Inventory

### Parallel System

Preparations (полуфабрикаты) имеют собственную систему инвентаря, параллельную продуктам:

```
Products (src/stores/storage/)     Preparations (src/stores/preparation/)
─────────────────────────────      ────────────────────────────────────
StorageBatch                   ↔   PreparationBatch
StorageBalance                 ↔   PreparationBalance
StorageOperation               ↔   PreparationOperation
InventoryDocument              ↔   PreparationInventoryDocument
useWriteOff                    ↔   (similar composable)
FIFO allocation                ↔   FIFO allocation
Negative batches               ↔   Negative batches
```

### Preparation Batch

```typescript
interface PreparationBatch {
  id: string
  batchNumber: string
  preparationId: string
  department: 'kitchen' | 'bar'

  initialQuantity: number
  currentQuantity: number
  unit: string
  costPerUnit: number // Cost includes raw product costs
  totalValue: number

  productionDate: string // When it was made (not received)
  expiryDate?: string

  sourceType: 'production' | 'correction' | 'opening_balance' | 'inventory_adjustment'
  status: 'active' | 'expired' | 'depleted' | 'written_off'

  // Portion type support
  portionType?: 'weight' | 'portion'
  portionSize?: number // Size of one portion in grams
  portionQuantity?: number // Number of portions

  // Negative inventory (same as products)
  isNegative?: boolean
  sourceBatchId?: string
  negativeCreatedAt?: string
  // ...etc
}
```

### Production Creates Batch + Write-off

Когда производится полуфабрикат:

```typescript
// 1. Create preparation batch
const prepBatch = await preparationStore.createProduction({
  preparationId: 'prep_uuid',
  quantity: 1000,
  costPerUnit: 25, // Calculated from recipe components
  department: 'kitchen'
})

// 2. Auto-create write-off for raw products consumed
// (Handled automatically by preparationService)
const productWriteOff = await storageStore.createWriteOff({
  reason: 'production_consumption',
  items: recipeIngredients,
  relatedPreparationOperationId: prepBatch.operationId
})
```

### Preparation Write-off Reasons

```typescript
type PreparationWriteOffReason =
  | 'expired' // KPI-affecting
  | 'spoiled' // KPI-affecting
  | 'other' // KPI-affecting
  | 'education' // Non-KPI
  | 'test' // Non-KPI
```

---

## Integration Points

### POS → Storage

При оплате заказа:

```typescript
// 1. Order paid → Decomposition
const decomposed = DecompositionEngine.decompose(menuItem, selectedModifiers, {
  preparationStrategy: 'keep'  // or 'decompose' for raw products
})

// 2. Create write-offs for consumed items
for (const item of decomposed) {
  if (item.type === 'product') {
    await storageStore.createWriteOff({
      reason: 'sales_consumption',
      items: [{ itemId: item.id, quantity: item.quantity, ... }]
    }, { skipReload: true })
  } else if (item.type === 'preparation') {
    await preparationStore.createWriteOff({
      reason: 'sales_consumption',
      items: [{ preparationId: item.id, quantity: item.quantity }]
    })
  }
}
```

### Purchase Orders → Storage

```
Order Created → Transit Batches Created
       ↓
Order Sent → (no change)
       ↓
Receipt (Приёмка) → Transit → Active Batches
       ↓
Negative batches reconciled (if any)
```

### Recipes → Storage

```
Recipe Component Change
       ↓
useCostCalculation.ts recalculates costs
       ↓
Uses FIFO allocation for actual cost
       or lastKnownCost for planned cost
```

### Decomposition Engine

**Location:** `src/core/decomposition/DecompositionEngine.ts`

```typescript
// Two strategies for menu item decomposition:

// 1. 'keep' - Stop at preparations
DecompositionEngine.decompose(menuItem, modifiers, { preparationStrategy: 'keep' })
// Returns: products + preparations (for POS write-off)

// 2. 'decompose' - Go to raw products
DecompositionEngine.decompose(menuItem, modifiers, { preparationStrategy: 'decompose' })
// Returns: only products (for cost calculation)
```

---

## Database Schema

### storage_batches

```sql
CREATE TABLE storage_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'product',
  warehouse_id TEXT NOT NULL,

  initial_quantity NUMERIC NOT NULL,
  current_quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,

  receipt_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ,

  source_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Transit fields
  purchase_order_id TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  planned_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,

  -- Negative inventory fields
  is_negative BOOLEAN DEFAULT false,
  source_batch_id UUID REFERENCES storage_batches(id),
  negative_created_at TIMESTAMPTZ,
  negative_reason TEXT,
  source_operation_type TEXT,
  affected_recipe_ids JSONB,
  reconciled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,

  CONSTRAINT status_check CHECK (status IN ('active', 'expired', 'consumed', 'in_transit'))
);

-- Indexes
CREATE INDEX idx_storage_batches_item_active
  ON storage_batches (item_id, is_active)
  WHERE is_active = true;

CREATE INDEX idx_storage_batches_negative
  ON storage_batches (item_id, is_negative)
  WHERE is_negative = true AND reconciled_at IS NULL;

CREATE INDEX idx_storage_batches_transit
  ON storage_batches (purchase_order_id)
  WHERE status = 'in_transit';
```

### storage_operations

```sql
CREATE TABLE storage_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  document_number TEXT NOT NULL UNIQUE,
  operation_date TIMESTAMPTZ NOT NULL,
  warehouse_id TEXT,
  department TEXT NOT NULL,
  responsible_person TEXT NOT NULL,
  items JSONB NOT NULL,
  total_value NUMERIC,

  correction_details JSONB,
  write_off_details JSONB,

  related_inventory_id UUID,
  related_preparation_operation_id UUID,

  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT operation_type_check
    CHECK (operation_type IN ('receipt', 'correction', 'inventory', 'write_off'))
);

CREATE INDEX idx_operations_type_date
  ON storage_operations (operation_type, operation_date DESC);

CREATE INDEX idx_operations_department
  ON storage_operations (department, operation_date DESC);
```

### inventory_documents

```sql
CREATE TABLE inventory_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number TEXT NOT NULL UNIQUE,
  inventory_date TIMESTAMPTZ NOT NULL,
  department TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'product',
  responsible_person TEXT NOT NULL,
  items JSONB NOT NULL,

  total_items INTEGER NOT NULL,
  total_discrepancies INTEGER NOT NULL DEFAULT 0,
  total_value_difference NUMERIC NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT status_check CHECK (status IN ('draft', 'confirmed', 'cancelled'))
);
```

### FIFO RPC Functions

```sql
-- Product FIFO allocation
CREATE FUNCTION allocate_product_fifo(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_fallback_cost NUMERIC DEFAULT 0
) RETURNS JSONB;

-- Preparation FIFO allocation
CREATE FUNCTION allocate_preparation_fifo(
  p_preparation_id UUID,
  p_quantity NUMERIC,
  p_fallback_cost NUMERIC DEFAULT 0
) RETURNS JSONB;

-- Batch negative batch operations
CREATE FUNCTION batch_process_negative_batches(
  p_shortages JSONB
) RETURNS JSONB;

-- Batch storage batch updates
CREATE FUNCTION batch_update_storage_batches(
  p_updates JSONB
) RETURNS JSONB;
```

---

## Code Examples

### Creating Receipt from Purchase Order

```typescript
// src/stores/storage/storageStore.ts:501-535

async function createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
  const response = await storageService.createReceipt(data)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create receipt')
  }

  // Add to operations list
  state.value.operations.unshift(response.data)

  // Reload balances to reflect new batches
  await loadBalances()

  // Refresh UI
  await fetchBalances(data.department)

  return response.data
}
```

### Write-off with FIFO

```typescript
// src/stores/storage/storageService.ts

async function createWriteOff(
  data: CreateWriteOffData
): Promise<ServiceResponse<StorageOperation>> {
  const items: StorageOperationItem[] = []

  for (const item of data.items) {
    // FIFO allocation
    const { data: allocation } = await supabase.rpc('allocate_product_fifo', {
      p_product_id: item.itemId,
      p_quantity: item.quantity,
      p_fallback_cost: product.baseCostPerUnit
    })

    items.push({
      itemId: item.itemId,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      batchAllocations: allocation.allocations,
      totalCost: allocation.totalCost,
      averageCostPerUnit: allocation.averageCost
    })

    // Update batches
    for (const alloc of allocation.allocations) {
      await updateBatchQuantity(alloc.batchId, alloc.allocatedQuantity)
    }

    // Handle deficit (create negative batch if needed)
    if (allocation.deficit > 0) {
      await negativeBatchService.createNegativeBatch({
        productId: item.itemId,
        quantity: -allocation.deficit,
        cost: allocation.averageCost
        // ...
      })
    }
  }

  // Create operation record
  const operation = await insertOperation({
    operationType: 'write_off',
    items,
    writeOffDetails: {
      reason: data.reason,
      affectsKPI: doesWriteOffAffectKPI(data.reason)
    }
  })

  return { success: true, data: operation }
}
```

### Using useWriteOff Composable

```typescript
// src/views/storage/WriteOffView.vue

import { useWriteOff } from '@/stores/storage/composables/useWriteOff'

const {
  // Computed
  availableProducts, // Products with stock (filtered by department)
  expiredProducts, // Expired products ready for write-off
  productsNeedingAttention, // Expired + near expiry

  // Actions
  writeOffProduct, // Single product write-off
  writeOffMultipleProducts, // Bulk write-off
  writeOffExpiredProducts, // Quick write-off all expired

  // State
  selectedDepartment, // 'kitchen' | 'bar' | 'all'
  loading,
  error
} = useWriteOff()

// Example: Write off a product
async function handleWriteOff() {
  await writeOffProduct(
    selectedProduct.itemId,
    writeOffQuantity,
    selectedReason, // 'expired' | 'spoiled' | etc
    'kitchen',
    currentUser.name,
    'Notes here'
  )
}
```

---

## Common Scenarios

### Scenario 1: Morning Sale Before Delivery

```
08:00 - Cashier sells dish with tomatoes
        └─> System: 0g tomatoes in stock
        └─> Creates negative batch: -200g @ 15 Rp/g

10:00 - Supplier delivers tomatoes
        └─> Receipt: +5000g @ 16 Rp/g
        └─> New positive batch created
        └─> Negative batch remains (reconciled during inventory)

Balance: 5000 + (-200) = 4800g available
```

### Scenario 2: Production Consumes Raw Products

```
Chef prepares Pizza Dough (preparation)
├─> Recipe requires: 1000g flour, 500ml water, 50g salt
│
├─> Creates PreparationBatch:
│   └─> preparationId: 'pizza_dough'
│   └─> quantity: 1500g
│   └─> costPerUnit: calculated from ingredients
│
└─> Auto-creates StorageOperation (write_off):
    └─> reason: 'production_consumption'
    └─> items: [flour, water, salt]
    └─> FIFO deducts from oldest batches
```

### Scenario 3: Inventory Count with Discrepancies

```
System says: Tomatoes 5000g
Count says:  Tomatoes 4800g
Difference:  -200g (shortage)

Finalization:
├─> Creates correction operation
│   └─> correctionDetails: { reason: 'other' }
│
├─> FIFO deducts 200g from batches
│   └─> If goes negative → creates negative batch
│
└─> Updates products.last_counted_at
```

### Scenario 4: POS Order with Decomposition

```
Order: Big Breakfast with Potato Hash-brown
        ↓
Decomposition (strategy: 'keep'):
├─> products: eggs (2), bacon (50g)
└─> preparations: toast (2), hash-brown (1)

Write-offs created:
├─> Storage write-off: eggs, bacon (reason: sales_consumption)
└─> Preparation write-off: toast, hash-brown (reason: sales_consumption)

Each uses FIFO to allocate from oldest batches
```

---

## Best Practices

### DO:

1. **Always use FIFO for cost calculation**

   ```typescript
   // Use RPC function, not manual calculation
   const { data } = await supabase.rpc('allocate_product_fifo', {...})
   ```

2. **Set correct write-off reasons**

   ```typescript
   // POS sales
   reason: 'sales_consumption' // Non-KPI

   // Manual spoilage
   reason: 'spoiled' // KPI-affecting
   ```

3. **Handle negative inventory gracefully**

   ```typescript
   // Check for deficits after FIFO
   if (allocation.deficit > 0) {
     await negativeBatchService.createNegativeBatch({...})
   }
   ```

4. **Use skipReload for POS operations**

   ```typescript
   // Saves bandwidth during high-volume sales
   await storageStore.createWriteOff(data, { skipReload: true })
   ```

5. **Update last_known_cost after receipts**
   ```typescript
   await storageStore.updateProductLastKnownCost(productId)
   ```

### DON'T:

1. **Don't create batches with zero cost**

   ```typescript
   // BAD: Cost 0 hides problems
   costPerUnit: 0

   // GOOD: Use fallback or throw error
   costPerUnit: await calculateFallbackCost(productId)
   ```

2. **Don't skip balance refresh after major operations**

   ```typescript
   // After receipt/inventory, always reload
   await loadBalances()
   ```

3. **Don't manually calculate FIFO**

   ```typescript
   // BAD: Manual iteration
   for (const batch of batches) {...}

   // GOOD: Use RPC function
   await supabase.rpc('allocate_product_fifo', {...})
   ```

4. **Don't mix KPI-affecting and non-KPI reasons**
   ```typescript
   // Training is education, not other
   reason: 'education' // ✅ Correct for staff training
   reason: 'other' // ❌ Wrong, affects KPI
   ```

---

## Troubleshooting

### Issue: Balance shows wrong quantity

**Cause:** Stale cache or unprocessed operations

**Fix:**

```typescript
await storageStore.fetchBalances(department)
// or
await storageStore.loadBalances()
```

### Issue: Negative batch cost is 0

**Cause:** No cost data in fallback chain

**Check:**

```sql
-- Check last_known_cost
SELECT id, name, last_known_cost, base_cost_per_unit
FROM products WHERE id = 'product_uuid';

-- Check if any batches exist
SELECT * FROM storage_batches
WHERE item_id = 'product_uuid'
ORDER BY receipt_date DESC LIMIT 5;
```

**Fix:**

```typescript
// Update last_known_cost
await storageStore.updateProductLastKnownCost(productId)

// Or set base_cost_per_unit in products table
```

### Issue: FIFO returns wrong allocations

**Cause:** Batches not marked as consumed/inactive

**Check:**

```sql
SELECT id, batch_number, current_quantity, status, is_active
FROM storage_batches
WHERE item_id = 'product_uuid'
ORDER BY receipt_date;
```

**Fix:**

```sql
-- Mark depleted batches as consumed
UPDATE storage_batches
SET status = 'consumed', is_active = false
WHERE current_quantity = 0 AND is_active = true;
```

### Issue: Write-off fails with "Insufficient stock"

**Cause:** Negative inventory disabled or validation error

**Check:**

```typescript
// Check if product allows negative
const canGoNegative = storageStore.canGoNegative(productId)
// Returns product.allowNegativeInventory ?? true
```

**Fix:**

- Enable negative inventory for product
- Or create receipt first

### Issue: Inventory finalization creates wrong corrections

**Cause:** items not properly confirmed or calculated

**Check:**

```typescript
// Ensure all items have actualQuantity set
inventory.items.forEach(item => {
  console.log(item.itemName, {
    system: item.systemQuantity,
    actual: item.actualQuantity,
    diff: item.difference,
    confirmed: item.confirmed
  })
})
```

---

## Related Documentation

- [Recipe System Architecture](../recipe/architecture.md)
- [Payment System](../account/payments-system.md)
- [POS System](../pos/) (TODO)
- [Migration 111: FIFO with Negative Batches](../../supabase/migrations/111_support_active_negative_batches_fifo.sql)

---

## File Reference

**Core Files:**

- `src/stores/storage/storageStore.ts` - Main Pinia store (1,114 lines)
- `src/stores/storage/types.ts` - Type definitions
- `src/stores/storage/storageService.ts` - Supabase integration
- `src/stores/storage/composables/useWriteOff.ts` - Write-off composable (778 lines)
- `src/stores/storage/composables/useInventory.ts` - Inventory composable (320 lines)
- `src/stores/storage/negativeBatchService.ts` - Negative batch handling
- `src/stores/storage/transitBatchService.ts` - Purchase order batches

**Preparation System:**

- `src/stores/preparation/preparationStore.ts`
- `src/stores/preparation/types.ts`
- `src/stores/preparation/preparationService.ts`

**Database:**

- `src/supabase/migrations/111_support_active_negative_batches_fifo.sql` - FIFO RPC

---

## Changelog

**2026-01-30 v1.0** - Initial documentation

- Documented batch system and lifecycle
- Explained FIFO cost allocation
- Covered negative inventory handling
- Added write-off system with KPI classification
- Included inventory count process
- Added preparations parallel system
- Provided integration points with POS/recipes
- Added database schema and indexes
- Included code examples and troubleshooting
