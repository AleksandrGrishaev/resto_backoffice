# Sale Flow Documentation - Полный процесс продажи и списания

## Оглавление

1. [Обзор процесса](#обзор-процесса)
2. [Этап 1: Оформление заказа (POS)](#этап-1-оформление-заказа-pos)
3. [Этап 2: Оплата заказа](#этап-2-оплата-заказа)
4. [Этап 3: Запись транзакции продажи](#этап-3-запись-транзакции-продажи)
5. [Этап 4: Списание ингредиентов](#этап-4-списание-ингредиентов)
6. [Технические детали](#технические-детали)
7. [Обработка ошибок](#обработка-ошибок)

---

## Обзор процесса

**Полный цикл продажи состоит из 4 этапов:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   POS        │────▶│   Payment    │────▶│    Sales     │────▶│  Write-Off   │
│   Order      │     │   Processing │     │  Recording   │     │   Inventory  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
  Создание           Оплата              Учет продаж         Списание со склада
  заказа             средствами          + себестоимость      FIFO + negative
```

**Временная линия:**

- **POS Order**: Мгновенно (создание заказа)
- **Payment**: 1-2 сек (обработка платежа)
- **Sales Recording**: 2-3 сек (DecompositionEngine + CostAdapter)
- **Write-Off**: 3-5 сек (DecompositionEngine + WriteOffAdapter + FIFO allocation)

**Общее время:** ~6-11 секунд

---

## Этап 1: Оформление заказа (POS)

### Файлы:

- `src/stores/pos/orders/ordersStore.ts`
- `src/stores/pos/tables/tablesStore.ts`
- `src/views/pos/order/OrderSection.vue`

### Что происходит:

1. **Пользователь выбирает стол/тип заказа**

   - Тип: `dine-in`, `takeaway`, `delivery`
   - Для `dine-in` выбирается стол из `tablesStore`

2. **Добавляет позиции меню**

   ```typescript
   order.items.push({
     menuItemId: '1880d1c2-...',
     variantId: 'f2c05dbe-...',
     name: 'Test',
     variantName: 'Dragon',
     quantity: 1,
     price: 100000,
     selectedModifiers: [] // Replacement modifiers
   })
   ```

3. **Создается заказ в ordersStore**
   ```typescript
   ordersStore.createOrder({
     tableId?: string,
     orderType: 'dine-in' | 'takeaway' | 'delivery',
     items: OrderItem[],
     status: 'pending'
   })
   ```

**Результат:**

- Order создан с `status: 'pending'`
- Order сохранен в localStorage (offline-first)
- UI обновлен

---

## Этап 2: Оплата заказа

### Файлы:

- `src/stores/pos/payments/paymentsStore.ts`
- `src/views/pos/order/dialogs/PaymentDialog.vue`

### Что происходит:

1. **Пользователь нажимает "Pay"**

   - Открывается `PaymentDialog`
   - Выбирает метод оплаты: `cash`, `card`, `qr`

2. **Обработка платежа**

   ```typescript
   // Simple payment (один метод оплаты)
   paymentsStore.processSimplePayment({
     orderId: order.id,
     amount: order.totalAmount,
     paymentMethod: 'cash',
     tendered: 150000
   })

   // Multiple payments (несколько методов)
   paymentsStore.processMultiplePayments({
     orderId: order.id,
     payments: [
       { method: 'cash', amount: 50000 },
       { method: 'card', amount: 50000 }
     ]
   })
   ```

3. **Обновление статуса**
   - Order status: `pending` → `paid`
   - Payment record создан
   - Если `dine-in`: Table status: `occupied` → `available`

**Результат:**

- Payment сохранен в БД (`payments` table)
- Order обновлен (`orders` table)
- Сдача возвращена (для cash)

---

## Этап 3: Запись транзакции продажи

### Файлы:

- `src/stores/sales/salesStore.ts`
- `src/core/decomposition/DecompositionEngine.ts`
- `src/core/decomposition/adapters/CostAdapter.ts`
- `src/core/decomposition/utils/batchAllocationUtils.ts`

### Что происходит:

### 3.1. Инициализация

```typescript
salesStore.recordSalesTransaction({
  orderId: order.id,
  items: order.items,
  totalRevenue: order.totalAmount,
  paymentMethods: ['cash'],
  shiftId: currentShift.id
})
```

### 3.2. Расчет ФАКТИЧЕСКОЙ себестоимости (DecompositionEngine + CostAdapter)

**Файлы:**

- `src/core/decomposition/DecompositionEngine.ts`
- `src/core/decomposition/adapters/CostAdapter.ts`

```typescript
import { createDecompositionEngine, createCostAdapter } from '@/core/decomposition'

// Create engine and adapter
const engine = await createDecompositionEngine()
const costAdapter = createCostAdapter({ department: 'kitchen' })

for (const item of orderItems) {
  // 1. Traverse menu item to get decomposed nodes
  const traversalResult = await engine.traverse(
    {
      menuItemId: item.menuItemId,
      variantId: item.variantId,
      quantity: item.quantity,
      selectedModifiers: item.selectedModifiers
    },
    costAdapter.getTraversalOptions()
  )

  // traversalResult.nodes = [
  //   { type: 'preparation', preparationId: 'ba109...', quantity: 20, unit: 'gram' },
  //   { type: 'product', productId: '5212...', quantity: 5, unit: 'piece' }
  // ]

  // 2. Transform to cost breakdown using FIFO
  const costBreakdown = await costAdapter.transform(traversalResult, input)

  // costBreakdown = {
  //   totalCost: 2000,
  //   preparationCosts: [...],
  //   productCosts: [...],
  //   method: 'FIFO'
  // }

  totalCost += costBreakdown.totalCost
}
```

**FIFO Allocation (via batchAllocationUtils):**

```typescript
// src/core/decomposition/utils/batchAllocationUtils.ts

export async function allocateFromPreparationBatches(
  preparationId: string,
  requiredQuantity: number,
  department: 'kitchen' | 'bar'
): Promise<PreparationCostItem> {
  // 1. Get batches from preparationStore
  const batches = preparationStore.getPreparationBatches(preparationId, department)

  // 2. Allocate FIFO (positive batches first, then negative)
  const allocations = allocateFromBatches(batches, requiredQuantity, b => b.productionDate)

  // 3. Handle deficit with lastKnownCost fallback
  if (deficit > 0) {
    const fallbackCost = preparation.lastKnownCost || 0
    allocations.push({
      batchId: 'fallback-prep-cost',
      batchNumber: 'LAST_KNOWN',
      allocatedQuantity: deficit,
      costPerUnit: fallbackCost
    })
  }

  return {
    preparationId,
    preparationName,
    quantity: requiredQuantity,
    batchAllocations: allocations,
    averageCostPerUnit: avgCost,
    totalCost
  }
}
```

**ВАЖНО:** На этом этапе **НЕ происходит write-off**!

- Это только **расчет стоимости** для profit calculation
- Batches **читаются**, но **не изменяются**
- Negative batches **используются** для расчета

### 3.3. Расчет прибыли

```typescript
const profit = {
  revenue: item.finalPrice, // 100,000 IDR
  cost: costBreakdown.totalCost, // 2,000 IDR (from FIFO)
  profit: revenue - cost, // 98,000 IDR
  profitMargin: ((revenue - cost) / revenue) * 100 // 98%
}
```

### 3.4. Сохранение транзакции

```typescript
const transaction = {
  id: generateShortId('st-'),
  orderId: order.id,
  timestamp: now,
  revenue: totalRevenue,
  cost: totalCost,
  profit: totalRevenue - totalCost,
  items: items.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    cost: item.actualCost
  })),
  paymentMethods: ['cash'],
  shiftId: currentShift.id
}

// Save to Supabase
await supabase.from('sales_transactions').insert(transaction)
```

**Результат Этапа 3:**

- Transaction создана в `sales_transactions` table
- COGS рассчитана через DecompositionEngine + CostAdapter
- Profit calculated
- Переход к Этапу 4 (Write-Off)

---

## Этап 4: Списание ингредиентов

### Файлы:

- `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts`
- `src/core/decomposition/DecompositionEngine.ts`
- `src/core/decomposition/adapters/WriteOffAdapter.ts`
- `src/stores/storage/storageService.ts`
- `src/stores/preparation/negativeBatchService.ts`

### Что происходит:

### 4.1. Инициализация Write-Off

```typescript
recipeWriteOffStore.processItemWriteOff({
  menuItemName: item.name,
  menuItemId: item.menuItemId,
  variantId: item.variantId,
  quantity: item.quantity,
  selectedModifiers: item.selectedModifiers,
  salesTransactionId: transaction.id
})
```

### 4.2. ДЕКОМПОЗИЦИЯ через DecompositionEngine + WriteOffAdapter

**Файлы:**

- `src/core/decomposition/DecompositionEngine.ts`
- `src/core/decomposition/adapters/WriteOffAdapter.ts`

**Цель:** Раскрыть menu item до финальных ингредиентов (products/preparations)

```typescript
import { createDecompositionEngine, createWriteOffAdapter } from '@/core/decomposition'

const engine = await createDecompositionEngine()
const writeOffAdapter = createWriteOffAdapter({ department: 'kitchen' })

// 1. Traverse menu item
const traversalResult = await engine.traverse(
  {
    menuItemId: '1880d1c2-...',
    variantId: 'f2c05dbe-...',
    quantity: 1,
    selectedModifiers: [] // Replacement modifiers
  },
  writeOffAdapter.getTraversalOptions()
)

// traversalResult.nodes = DecomposedNode[]
// Each node has: type, quantity, unit, productId/preparationId, etc.

// 2. Transform to WriteOffResult
const writeOffResult = await writeOffAdapter.transform(traversalResult, input)

// writeOffResult.items = WriteOffItem[]
// [
//   { type: 'preparation', id: 'ba109...', quantity: 20, unit: 'gram', name: 'Dragon test' }
// ]
```

**Алгоритм декомпозиции (DecompositionEngine):**

```typescript
// DecompositionEngine.traverse()
async traverse(input: MenuItemInput, options: TraversalOptions) {
  // 1. Get menu item and variant
  const menuItem = menuStore.getMenuItem(input.menuItemId)
  const variant = menuItem.variants.find(v => v.id === input.variantId)

  // 2. Build replacement map from modifiers
  const replacements = buildReplacementMap(input.selectedModifiers)

  // 3. Process variant composition
  const nodes: DecomposedNode[] = []

  for (const component of variant.composition) {
    // Check for replacement modifier
    const replacement = getReplacementForVariantComponent(
      variant.id,
      component.id,
      replacements
    )

    if (replacement) {
      // Use replacement composition instead
      await this.processComposition(replacement.composition, nodes, options)
    } else {
      // Process original component
      await this.processComponent(component, nodes, options)
    }
  }

  // 4. Merge duplicates if needed
  if (options.mergeDuplicates) {
    mergeNodes(nodes)
  }

  return { nodes, metadata }
}
```

**WriteOffAdapter transforms nodes:**

```typescript
// WriteOffAdapter.transform()
async transform(result: TraversalResult, input: MenuItemInput): Promise<WriteOffResult> {
  const items: WriteOffItem[] = []

  for (const node of result.nodes) {
    if (node.type === 'preparation') {
      items.push({
        type: 'preparation',
        preparationId: node.preparationId,
        preparationName: node.preparationName,
        quantity: node.quantity,
        unit: node.unit
      })
    } else if (node.type === 'product') {
      items.push({
        type: 'product',
        productId: node.productId,
        productName: node.productName,
        quantity: node.quantity,
        unit: node.unit
      })
    }
  }

  return { items, totalItems: items.length }
}
```

### 4.3. FIFO Allocation и создание Write-Off

**Файл:** `src/stores/storage/storageService.ts`

```typescript
storageService.createWriteOff({
  department: 'kitchen',
  reason: 'sale',
  items: writeOffResult.items,
  notes: `Sale transaction: ${salesTransactionId}`,
  userId: currentUser.id,
  shiftId: currentShift.id
})
```

**Для каждого item:**

#### Для PRODUCT:

```typescript
allocateProductFIFO(productId, quantity, department) {
  // 1. Get active batches
  const batches = storageStore.batches
    .filter(b =>
      b.productId === productId &&
      b.department === department &&
      b.status === 'active' &&
      b.currentQuantity > 0
    )
    .sort(by receiptDate)  // FIFO

  // 2. Allocate
  const allocations = []
  let remaining = quantity

  for (const batch of batches) {
    const allocated = Math.min(remaining, batch.currentQuantity)

    // Update batch
    batch.currentQuantity -= allocated
    if (batch.currentQuantity === 0) {
      batch.status = 'depleted'
    }

    allocations.push({ batchId: batch.id, quantity: allocated })
    remaining -= allocated
  }

  // 3. IF shortage → create negative batch
  if (remaining > 0) {
    const cost = await calculateNegativeBatchCost(productId, remaining)
    const negativeBatch = await negativeBatchService.createNegativeBatch({
      productId,
      department,
      quantity: -remaining,
      cost
    })

    allocations.push({
      batchId: negativeBatch.id,
      quantity: remaining,
      isNegative: true
    })
  }

  return allocations
}
```

#### Для PREPARATION:

```typescript
allocatePreparationFIFO(preparationId, quantity, department) {
  // 1. Get active batches (including negative!)
  const batches = preparationStore.batches
    .filter(b =>
      b.preparationId === preparationId &&
      b.department === department &&
      b.isActive &&
      b.currentQuantity !== 0
    )
    .sort(by productionDate)  // FIFO

  // 2. Allocate from positive batches first
  let remaining = quantity

  for (const batch of positiveBatches) {
    const allocated = Math.min(remaining, batch.currentQuantity)
    batch.currentQuantity -= allocated
    remaining -= allocated
  }

  // 3. IF shortage → create/update negative batch
  if (remaining > 0) {
    const existingNegative = await negativeBatchService.getActiveNegativeBatch(
      preparationId,
      department
    )

    if (existingNegative) {
      // UPDATE existing
      await negativeBatchService.updateNegativeBatch(existingNegative.id, remaining, cost)
    } else {
      // CREATE new
      await negativeBatchService.createNegativeBatch({
        preparationId,
        department,
        quantity: -remaining,
        cost
      })
    }
  }

  return allocations
}
```

### 4.4. Расчет стоимости для Negative Batch

**Fallback Chain (5 уровней для products, 4 для preparations):**

```
1. Last active batch cost          ← getLastActiveBatch() → batch.costPerUnit
   ↓ FAIL
2. Depleted batches average (5шт)  ← SELECT FROM *_batches WHERE status='depleted' LIMIT 5
   ↓ FAIL
3. last_known_cost from DB         ← SELECT last_known_cost FROM products/preparations
   ↓ FAIL
4. base_cost_per_unit (products)   ← SELECT base_cost_per_unit FROM products
   ↓ FAIL (или N/A для preparations)
5. 0 + CRITICAL ERROR              ← console.error() with context
```

**Результат Этапа 4:**

- Write-off operation создана
- Batches обновлены (FIFO)
- Negative batches созданы/обновлены при shortage
- Expense записан в Account Store (если affects_kpi)
- Inventory актуализирован

---

## Технические детали

### Unified Decomposition Architecture

С Phase 4 рефакторинга (декабрь 2025) используется **единый DecompositionEngine**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DecompositionEngine                          │
│  - traverse(input, options)                                     │
│  - Builds replacement map from modifiers                        │
│  - Iterates composition                                         │
│  - Applies yield adjustment (optional)                          │
│  - Converts portions to grams (optional)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │                                     │
           ▼                                     ▼
    WriteOffAdapter                        CostAdapter
    (recipeWriteOffStore)                  (salesStore)
           │                                     │
           ▼                                     ▼
    WriteOffResult                      ActualCostBreakdown
```

**Ключевые файлы:**

| File                                                   | Purpose                   |
| ------------------------------------------------------ | ------------------------- |
| `src/core/decomposition/DecompositionEngine.ts`        | Unified traversal         |
| `src/core/decomposition/adapters/WriteOffAdapter.ts`   | For inventory write-off   |
| `src/core/decomposition/adapters/CostAdapter.ts`       | For FIFO cost calculation |
| `src/core/decomposition/utils/batchAllocationUtils.ts` | Shared FIFO allocation    |

### Разница между Step 3 и Step 4

| Аспект               | Step 3 (Sales COGS)                | Step 4 (Write-Off)              |
| -------------------- | ---------------------------------- | ------------------------------- |
| **Цель**             | Посчитать себестоимость для profit | Списать фактические ингредиенты |
| **Adapter**          | CostAdapter                        | WriteOffAdapter                 |
| **Действие**         | Читает batches (read-only)         | Изменяет batches (write)        |
| **Negative batches** | Использует для расчета             | Создает при shortage            |
| **Обновляет БД**     | Нет                                | Да                              |

### Negative Batches

**Что это:**

- Batch с отрицательным `currentQuantity`
- Представляет "долг" перед складом
- Создается когда списываем больше чем есть

**Reconciliation:**

- Когда создается новый receipt → negative batch reconciled
- Status: `active` → `depleted`
- `reconciled_at` заполняется

### Replacement Modifiers

Поддерживаются **Replacement Modifiers** - возможность заменить компонент рецепта:

```
Recipe: Cappuccino
├── Espresso: 30ml
└── Regular Milk: 150ml  ← заменяемый компонент

При заказе с Oat Milk:
├── Espresso: 30ml
└── Oat Milk: 150ml  ← замена из modifier composition
```

**Обрабатывается в DecompositionEngine:**

```typescript
const replacements = buildReplacementMap(selectedModifiers)
const replacement = getReplacementForComponent(recipeId, componentId, replacements)
if (replacement) {
  // Use replacement.composition instead of original
}
```

---

## Обработка ошибок

### Ошибка в Payment (Step 2)

```typescript
try {
  await paymentsStore.processSimplePayment(...)
} catch (error) {
  // Rollback: order status → 'pending'
  // Payment НЕ создан
  // Sales transaction НЕ создана
  // Write-off НЕ выполнен
}
```

### Ошибка в Sales Recording (Step 3)

```typescript
try {
  await salesStore.recordSalesTransaction(...)
} catch (error) {
  // Payment УЖЕ создан!
  // Но sales transaction НЕ создана
  // КРИТИЧНО: Manual reconciliation required!
}
```

### Ошибка в Write-Off (Step 4)

```typescript
try {
  await recipeWriteOffStore.processItemWriteOff(...)
} catch (error) {
  // Payment создан
  // Sales transaction создана
  // Но write-off НЕ выполнен

  // Решение:
  // 1. Retry автоматически (3 попытки)
  // 2. Queue for manual write-off
  // 3. Admin видит pending write-offs
}
```

---

## Логи и Debugging

### Ключевые логи:

```typescript
// Step 3: Sales Recording with DecompositionEngine
[SalesStore] Recording sale transaction
[DecompositionEngine] Traversing menu item: Cappuccino
[DecompositionEngine] Replacement registered: { key, targetName, replacement }
[CostAdapter] Calculating actual cost from FIFO batches
[BatchAllocationUtils] Preparation stock allocated: { required, allocated, batchesUsed }

// Step 4: Write-Off
[RecipeWriteOffStore] Processing write-off for item
[DecompositionEngine] Traversing menu item
[WriteOffAdapter] Transforming to write-off items: { totalItems }
[StorageService] Creating write-off operation
[NegativeBatchService] Created negative batch: { batchNumber, quantity, cost }
```

### Debugging checklist:

1. **Проверить decomposition:**

   ```typescript
   const engine = await createDecompositionEngine()
   const result = await engine.traverse(input, options)
   console.log('Decomposed nodes:', result.nodes)
   ```

2. **Проверить batches:**

   ```typescript
   const batches = preparationStore.getPreparationBatches(preparationId, 'kitchen')
   console.log('Available batches:', batches)
   ```

3. **Проверить cost allocation:**
   ```typescript
   const costItem = await allocateFromPreparationBatches(preparationId, quantity, 'kitchen')
   console.log('Cost breakdown:', costItem)
   ```

---

## Заключение

**Полный цикл продажи - это 4 этапа:**

1. **POS Order** - создание заказа
2. **Payment** - обработка платежа
3. **Sales Recording** - DecompositionEngine + CostAdapter → COGS
4. **Write-Off** - DecompositionEngine + WriteOffAdapter → inventory

**Ключевые особенности (Phase 4):**

- **Unified DecompositionEngine** - единая логика декомпозиции
- **Adapters pattern** - CostAdapter и WriteOffAdapter
- **Shared FIFO allocation** - batchAllocationUtils
- **Negative batches** при shortage
- **Replacement modifiers** support
- **~1,728 lines removed** - удален дублирующийся код

**Документация:**

- [DECOMPOSITION_ARCHITECTURE.md](./DECOMPOSITION_ARCHITECTURE.md) - архитектура
- [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - план рефакторинга
