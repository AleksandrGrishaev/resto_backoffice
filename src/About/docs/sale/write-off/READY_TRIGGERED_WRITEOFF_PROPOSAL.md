# Ready-Triggered Write-Off Architecture

**Status:** Approved with modifications
**Date:** 2026-01-30
**Updated:** 2026-01-30 (Critical Analysis)
**Author:** Development Team

---

## Critical Analysis & Final Decisions

> Этот раздел добавлен после критического анализа исходного предложения.

### Принятые архитектурные решения

| Пункт                     | Решение                      | Обоснование                                                |
| ------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Race conditions           | Не критично                  | Один монитор = одно нажатие                                |
| Cancellation после Ready  | `cancellation_loss` reason   | Учёт потерь в P&L                                          |
| FIFO timing               | При Ready                    | Физически берём продукты в этот момент                     |
| Kitchen Realtime writeOff | НЕ НУЖНО                     | POS = source of truth, Kitchen не должен знать о списаниях |
| Split bills move          | Не пересчитывать             | cachedActualCost — просто перемещение                      |
| Partial cancellation      | Per item `cancellation_loss` | Cancel item реализован по позициям                         |

### Background Queue Architecture

**КРИТИЧНО:** Все write-off операции выполняются в фоне, UI не блокируется.

**Файл:** `src/core/background/useBackgroundTasks.ts`

```
Kitchen нажимает Ready:
1. UI сразу показывает "ready" статус
2. Write-off добавляется в background queue
3. Background worker выполняет:
   - Decomposition
   - FIFO allocation
   - storage_operation INSERT
   - recipe_writeoff INSERT
   - order_item UPDATE (cachedActualCost)
4. При ошибке — retry с backoff
```

**Особенно важно для:**

- Восстановления после offline (20+ заказов, 50+ блюд)
- Не блокировать интерфейс Kitchen

### Kitchen Monitor: Новый столбец SYNC

**Текущие статусы:** `pending` → `cooking` → `ready`

**Новые статусы:** `sync` → `pending` → `cooking` → `ready`

```
┌─────────────────────────────────────────────────────────┐
│  Kitchen Monitor                                         │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│   SYNC   │ PENDING  │ COOKING  │  READY   │  SERVED    │
├──────────┼──────────┼──────────┼──────────┼────────────┤
│ Order 45 │ Order 48 │ Order 47 │ Order 46 │            │
│ Order 44 │ Order 49 │          │          │            │
│ (offline)│          │          │          │            │
└──────────┴──────────┴──────────┴──────────┴────────────┘
```

**Определение SYNC заказов:**

- `order.offline_created = true` — флаг на заказе
- Это отделяет "восстановленные" заказы от текущего потока
- Staff может bulk-обработать sync заказы

### Защита от двойного списания

```typescript
async function markAsReadyWithWriteOff(itemId: string) {
  const order = await getOrder(item.orderId)

  // 1. Заказ уже оплачен — write-off уже был (fallback path)
  if (order.status === 'paid') {
    await updateItemStatus(itemId, 'ready')
    return // Skip write-off
  }

  // 2. Item уже processed
  if (item.writeOffStatus === 'completed') {
    await updateItemStatus(itemId, 'ready')
    return // Skip write-off
  }

  // 3. UI сразу показывает ready
  await updateItemStatus(itemId, 'ready')

  // 4. Добавить в background queue
  addToBackgroundQueue({
    type: 'ready_writeoff',
    itemId,
    priority: 'high'
  })
}
```

### Дополнительные изменения в БД

```sql
-- Offline tracking для orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS offline_created BOOLEAN DEFAULT false;

-- Новый reason для storage_operations
ALTER TABLE storage_operations
ADD CONSTRAINT storage_operations_reason_check
CHECK (reason IN (
  'expired', 'spoiled', 'other', 'cancellation_loss',
  'education', 'test', 'production_consumption', 'sales_consumption'
));
```

---

## Overview

Переход от **Payment-triggered** к **Ready-triggered** write-off с сохранением **POS как единственного источника правды**.

### Key Principles

1. **POS = Single Source of Truth** — все данные о заказах живут в POS
2. **Kitchen/Bar Display = Read-only + Status Updates** — только просмотр и смена статуса
3. **Write-off Status Tracking** — маркер на каждой позиции: списано или нет
4. **Offline Resilience** — система работает при потере связи

---

## Current vs Proposed

### Current Architecture (Payment-triggered)

```
POS Order → Payment (10s) → [COGS + Write-Off] → Done
                              └── 5-8 секунд в критическом пути
```

### Proposed Architecture (Ready-triggered)

```
┌─────────────────────────────────────────────────────────────────┐
│                         POS (Source of Truth)                    │
│                                                                  │
│  Order #123                                                      │
│  ├── Item A: Pizza      [status: ready]    [writeOff: ✅ done]  │
│  ├── Item B: Pasta      [status: ready]    [writeOff: ✅ done]  │
│  └── Item C: Dessert    [status: cooking]  [writeOff: ⏳ pending]│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         │                              ▲
         │ Realtime Sync                │ Status Updates
         ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Kitchen/Bar Display                           │
│                                                                  │
│  Order #123                                                      │
│  ├── Item A: Pizza      [READY ✅] ← Click triggers write-off   │
│  ├── Item B: Pasta      [READY ✅] ← Click triggers write-off   │
│  └── Item C: Dessert    [COOKING] ← In progress                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model Changes

### OrderItem Extended

```typescript
interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  variantId: string
  name: string
  quantity: number
  price: number
  selectedModifiers: SelectedModifier[]

  // Existing status
  status: 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled'

  // ✨ NEW: Write-off tracking
  writeOffStatus: 'pending' | 'processing' | 'completed' | 'skipped'
  writeOffAt?: string // When write-off was executed
  writeOffTriggeredBy?: string // 'kitchen_ready' | 'bar_ready' | 'payment_fallback' | 'manual'
  writeOffOperationId?: string // Link to storage_operations.id
}
```

### Write-off Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Write-off Status State Machine                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐                                                    │
│  │ pending │ ← Order item created                               │
│  └────┬────┘                                                    │
│       │                                                         │
│       │ Kitchen/Bar marks as READY                              │
│       ▼                                                         │
│  ┌────────────┐                                                 │
│  │ processing │ ← Write-off in progress (FIFO allocation)       │
│  └─────┬──────┘                                                 │
│        │                                                        │
│   ┌────┴────┐                                                   │
│   │         │                                                   │
│   ▼         ▼                                                   │
│ ┌───────────┐  ┌─────────┐                                     │
│ │ completed │  │ skipped │ ← Error or cancelled item           │
│ └───────────┘  └─────────┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow Scenarios

### Scenario 1: Normal Online Flow

```
Timeline:
  10:00  POS: Create Order #123 (Item A, B, C)
         └── All items: writeOffStatus = 'pending'

  10:00  Kitchen Display: Receives order via Realtime
         └── Shows Order #123 with 3 items

  10:05  Kitchen: Marks Item A as READY
         └── Triggers: writeOff(Item A)
         └── Item A: writeOffStatus = 'completed'

  10:07  Kitchen: Marks Item B as READY
         └── Triggers: writeOff(Item B)
         └── Item B: writeOffStatus = 'completed'

  10:10  Kitchen: Marks Item C as READY
         └── Triggers: writeOff(Item C)
         └── Item C: writeOffStatus = 'completed'

  10:12  POS: Payment
         └── Check: All items writeOffStatus = 'completed'? ✅
         └── Skip write-off, just process payment
         └── Payment time: ~2 seconds! 🚀
```

### Scenario 2: Offline Recovery Flow

```
Timeline:
  10:00  POS: Create Order #123, #124, #125
         └── Internet LOST ❌
         └── Orders saved locally in POS
         └── Kitchen Display: No orders (no realtime)
         └── Kitchen gets PAPER orders

  10:05  Kitchen: Prepares orders from paper
         └── No digital tracking
         └── Physical dishes ready

  10:10  POS: Customer pays Order #123
         └── Still offline
         └── Check: writeOffStatus = 'pending' for all items
         └── Fallback: Execute write-off synchronously
         └── Payment takes ~10 seconds (like before)
         └── Items marked: writeOffStatus = 'completed',
                          writeOffTriggeredBy = 'payment_fallback'

  10:30  Internet RESTORED ✅
         └── Orders #124, #125 sync to Kitchen Display
         └── Kitchen sees them as "pending" (from paper, already done)

  10:31  Kitchen: Bulk-marks #124, #125 as READY
         └── Special mode: "Mark all as completed"
         └── Triggers write-offs for both orders
         └── Items: writeOffStatus = 'completed'

  10:35  POS: Payment for #124
         └── Check: writeOffStatus = 'completed'? ✅
         └── Fast payment (~2 seconds)
```

### Scenario 3: Payment Before Ready (Edge Case)

```
Timeline:
  10:00  POS: Create Takeaway Order #200
         └── Items: writeOffStatus = 'pending'

  10:01  Kitchen: Starts cooking
         └── Status: 'cooking'

  10:03  Customer: "I'll pay now while I wait"
         └── POS: Payment requested
         └── Check: Item writeOffStatus = 'pending'
         └── Fallback: Execute write-off now
         └── Payment: ~10 seconds
         └── Items: writeOffStatus = 'completed',
                   writeOffTriggeredBy = 'payment_fallback'

  10:05  Kitchen: Marks as READY
         └── Check: writeOffStatus already 'completed'
         └── Skip write-off (idempotent)
         └── Just update status to 'ready'
```

---

## Technical Implementation

### 1. Database Schema

```sql
-- Add columns to orders_items (or order_items)
ALTER TABLE order_items
ADD COLUMN write_off_status TEXT DEFAULT 'pending'
  CHECK (write_off_status IN ('pending', 'processing', 'completed', 'skipped')),
ADD COLUMN write_off_at TIMESTAMPTZ,
ADD COLUMN write_off_triggered_by TEXT
  CHECK (write_off_triggered_by IN ('kitchen_ready', 'bar_ready', 'payment_fallback', 'manual')),
ADD COLUMN write_off_operation_id UUID REFERENCES storage_operations(id);

-- Index for quick checks
CREATE INDEX idx_order_items_write_off_status
ON order_items (order_id, write_off_status);

-- Prevent double write-off at DB level
CREATE UNIQUE INDEX idx_order_items_write_off_unique
ON order_items (id)
WHERE write_off_status = 'completed';
```

### 2. Kitchen Display: Mark as Ready (Background Queue)

> **РЕШЕНИЕ:** Write-off выполняется в background queue, UI не блокируется.

```typescript
// src/stores/kitchen/kitchenStore.ts

async function markItemAsReady(orderItemId: string): Promise<void> {
  const item = await getOrderItem(orderItemId)
  const order = await getOrder(item.orderId)

  // 1. Защита от двойного списания
  if (order.status === 'paid') {
    console.info(`[Kitchen] Order already paid, skip write-off`)
    await updateItemStatus(orderItemId, 'ready')
    return
  }

  if (item.writeOffStatus === 'completed') {
    console.info(`[Kitchen] Write-off already done for ${orderItemId}`)
    await updateItemStatus(orderItemId, 'ready')
    return
  }

  // 2. UI сразу обновляется (не блокируем интерфейс)
  await updateItemStatus(orderItemId, 'ready')

  // 3. Write-off добавляется в background queue
  addToBackgroundQueue({
    type: 'ready_writeoff',
    itemId: orderItemId,
    orderId: order.id,
    menuItemId: item.menuItemId,
    variantId: item.variantId,
    quantity: item.quantity,
    selectedModifiers: item.selectedModifiers,
    triggeredBy: item.department === 'kitchen' ? 'kitchen_ready' : 'bar_ready',
    priority: 'high'
  })

  console.info(`[Kitchen] ✅ Item ${orderItemId} ready, write-off queued`)
}
```

### 2.1 Background Task Worker

```typescript
// src/core/background/useBackgroundTasks.ts

async function processReadyWriteoff(task: WriteoffTask): Promise<void> {
  // Idempotency check
  const item = await getOrderItem(task.itemId)
  if (item.writeOffStatus === 'completed') {
    return // Already processed
  }

  // Mark as processing
  await updateOrderItem(task.itemId, { writeOffStatus: 'processing' })

  try {
    // Execute write-off
    const operation = await executeWriteOff({
      orderItemId: task.itemId,
      menuItemId: task.menuItemId,
      variantId: task.variantId,
      quantity: task.quantity,
      selectedModifiers: task.selectedModifiers,
      triggeredBy: task.triggeredBy
    })

    // Update item with success
    await updateOrderItem(task.itemId, {
      writeOffStatus: 'completed',
      writeOffAt: new Date().toISOString(),
      writeOffTriggeredBy: task.triggeredBy,
      writeOffOperationId: operation.storageOperationId,
      recipeWriteoffId: operation.recipeWriteoffId,
      cachedActualCost: operation.actualCost
    })

    console.info(`[Background] ✅ Write-off completed for ${task.itemId}`)
  } catch (error) {
    // Revert to pending on failure, will retry
    await updateOrderItem(task.itemId, { writeOffStatus: 'pending' })
    console.error(`[Background] ❌ Write-off failed for ${task.itemId}:`, error)
    throw error // Trigger retry
  }
}
```

### 3. POS: Payment with Fallback

```typescript
// src/stores/pos/payments/paymentsStore.ts

async function processPayment(orderId: string, paymentData: PaymentData): Promise<Payment> {
  const order = await getOrder(orderId)

  // 1. Check write-off status for all items
  const pendingWriteOff = order.items.filter(
    item => item.writeOffStatus !== 'completed' && item.status !== 'cancelled'
  )

  if (pendingWriteOff.length > 0) {
    console.warn(`[Payment] Fallback: ${pendingWriteOff.length} items without write-off`)

    // 2. Execute write-off for missing items (BLOCKING)
    for (const item of pendingWriteOff) {
      await executeWriteOffWithFallback(item)
    }
  }

  // 3. Process payment (fast path if write-offs already done)
  const payment = await createPayment({
    orderId,
    amount: paymentData.amount,
    method: paymentData.method
    // ... other fields
  })

  // 4. Update order status
  await updateOrder(orderId, { status: 'paid' })

  return payment
}

async function executeWriteOffWithFallback(item: OrderItem): Promise<void> {
  // Check again (might have been completed during our processing)
  const freshItem = await getOrderItem(item.id)
  if (freshItem.writeOffStatus === 'completed') {
    return // Already done by Kitchen
  }

  // Mark as processing
  await updateOrderItem(item.id, { writeOffStatus: 'processing' })

  try {
    const operation = await executeWriteOff({
      orderItemId: item.id,
      menuItemId: item.menuItemId,
      variantId: item.variantId,
      quantity: item.quantity,
      selectedModifiers: item.selectedModifiers,
      triggeredBy: 'payment_fallback'
    })

    await updateOrderItem(item.id, {
      writeOffStatus: 'completed',
      writeOffAt: new Date().toISOString(),
      writeOffTriggeredBy: 'payment_fallback',
      writeOffOperationId: operation.id
    })
  } catch (error) {
    await updateOrderItem(item.id, { writeOffStatus: 'pending' })
    throw error
  }
}
```

### 4. Write-off Execution (Shared)

```typescript
// src/stores/sales/recipeWriteOff/recipeWriteOffService.ts

interface ExecuteWriteOffParams {
  orderItemId: string
  menuItemId: string
  variantId: string
  quantity: number
  selectedModifiers: SelectedModifier[]
  triggeredBy: 'kitchen_ready' | 'bar_ready' | 'payment_fallback' | 'manual'
}

async function executeWriteOff(params: ExecuteWriteOffParams): Promise<StorageOperation> {
  const { orderItemId, menuItemId, variantId, quantity, selectedModifiers, triggeredBy } = params

  // 1. Decompose menu item to ingredients
  const engine = await createDecompositionEngine()
  const writeOffAdapter = createWriteOffAdapter()

  const traversalResult = await engine.traverse(
    { menuItemId, variantId, quantity, selectedModifiers },
    writeOffAdapter.getTraversalOptions()
  )

  const writeOffResult = await writeOffAdapter.transform(traversalResult, {
    menuItemId,
    variantId,
    quantity,
    selectedModifiers
  })

  // 2. Create write-off operation
  const operation = await storageStore.createWriteOff(
    {
      department: getDepartment(menuItemId),
      reason: 'sales_consumption',
      items: writeOffResult.items,
      notes: `Order item: ${orderItemId}, triggered by: ${triggeredBy}`
    },
    { skipReload: true } // Optimize: don't reload balances for each item
  )

  return operation
}
```

### 5. Offline Detection in POS

```typescript
// src/stores/pos/core/connectionStore.ts

const connectionStore = defineStore('connection', () => {
  const isOnline = ref(true)
  const realtimeConnected = ref(false)

  // Monitor Supabase Realtime connection
  function setupRealtimeMonitor() {
    supabase
      .channel('system')
      .on('system', { event: 'connected' }, () => {
        realtimeConnected.value = true
        console.info('[Connection] Realtime connected ✅')
      })
      .on('system', { event: 'disconnected' }, () => {
        realtimeConnected.value = false
        console.warn('[Connection] Realtime disconnected ❌')
      })
      .subscribe()
  }

  // Check if we can rely on Kitchen Display
  const canRelyOnKitchenDisplay = computed(() => {
    return isOnline.value && realtimeConnected.value
  })

  return {
    isOnline,
    realtimeConnected,
    canRelyOnKitchenDisplay,
    setupRealtimeMonitor
  }
})
```

### 6. Bulk Recovery After Reconnect

```typescript
// src/stores/pos/kitchen/kitchenRecoveryService.ts

/**
 * After reconnection, Kitchen can bulk-mark orders as ready
 * This is for orders that were prepared from paper during offline
 */
async function bulkMarkAsReady(orderIds: string[]): Promise<void> {
  console.info(`[Recovery] Bulk marking ${orderIds.length} orders as ready`)

  for (const orderId of orderIds) {
    const order = await getOrder(orderId)

    // Filter items that need write-off
    const pendingItems = order.items.filter(
      item => item.writeOffStatus === 'pending' && item.status !== 'cancelled'
    )

    for (const item of pendingItems) {
      try {
        await markItemAsReady(item.id)
      } catch (error) {
        console.error(`[Recovery] Failed to process item ${item.id}:`, error)
        // Continue with other items
      }
    }
  }

  console.info(`[Recovery] ✅ Bulk recovery completed`)
}
```

---

## Performance Comparison

### Current (Payment-triggered)

```
Payment Flow:
├── Validate payment data:        100ms
├── DecompositionEngine:          500ms
├── CostAdapter (COGS):         2,000ms
├── WriteOffAdapter:              500ms
├── FIFO allocation:            3,000ms
├── Update batches:             2,000ms
├── Create payment record:        500ms
└── Update order status:          200ms
────────────────────────────────────────
Total:                         ~8,800ms (~9 seconds)
```

### Proposed (Ready-triggered)

**Normal path (write-off already done):**

```
Payment Flow:
├── Validate payment + discounts:  200ms
├── Check writeOffStatus (N items): N × 100ms
├── Create sales_transactions:     500ms  ← Uses cachedActualCost
├── Link recipe_writeoffs:         N × 100ms
├── Create payment record:         300ms
└── Update order status:           200ms
────────────────────────────────────────
Total (3 items):                 ~1,800ms (~2 seconds) 🚀
```

**Fallback path (write-off not done):**

```
Payment Flow:
├── Validate payment data:        100ms
├── Check writeOffStatus:         100ms
├── FALLBACK write-off:        ~6,000ms  ← Only when needed
├── Create payment record:        500ms
└── Update order status:          200ms
────────────────────────────────────────
Total:                         ~6,900ms (~7 seconds)
```

**Expected distribution (реалистичная оценка):**

| Тип заказа | Kitchen Ready до Payment?        | Fast path % |
| ---------- | -------------------------------- | ----------- |
| Dine-in    | Да (блюдо готовится, потом счёт) | ~90%        |
| Takeaway   | Часто нет (оплата сразу)         | ~30%        |
| Delivery   | Зависит от процесса              | ~50%        |
| Bar drinks | Быстро, может быть до Ready      | ~60%        |

**Общая оценка:** 60-70% fast path, 30-40% fallback

---

## Edge Cases

### 1. Order Cancellation After Write-off

> **РЕШЕНИЕ (после анализа):** Используем `cancellation_loss` reason для учёта потерь в P&L.

```typescript
async function cancelOrderItem(orderItemId: string): Promise<void> {
  const item = await getOrderItem(orderItemId)

  if (item.writeOffStatus === 'completed' && item.writeOffOperationId) {
    // Write-off already happened - update reason to cancellation_loss
    // Это учитывается в KPI потерь, но НЕ в Sales COGS

    // 1. Update write-off reason to cancellation_loss
    await storageStore.updateWriteOffReason(
      item.writeOffOperationId,
      'cancellation_loss',
      `Cancelled: ${request.reason}`
    )

    // 2. Cancel order item (NO new write-off)
    await updateOrderItem(orderItemId, {
      status: 'cancelled',
      cancelledAfterWriteOff: true // Flag for reporting
    })

    // 3. DO NOT create sales_transaction for cancelled items
    console.warn(`[Cancel] Item ${orderItemId} cancelled AFTER write-off → cancellation_loss`)
    return
  }

  // Write-off not done yet - simple cancellation
  await updateOrderItem(orderItemId, {
    status: 'cancelled',
    writeOffStatus: 'skipped'
  })
}
```

### 2. Partial Order Ready

```
Order #123:
├── Item A: [ready]    writeOff: completed
├── Item B: [ready]    writeOff: completed
└── Item C: [cooking]  writeOff: pending

Customer: "I want to pay now"

Resolution:
1. Check all non-cancelled items
2. Items A, B: already done ✅
3. Item C: execute fallback write-off
4. Complete payment
```

### 3. Network Timeout During Write-off

```typescript
async function markItemAsReadyWithRetry(orderItemId: string, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await markItemAsReady(orderItemId)
      return // Success
    } catch (error) {
      console.warn(`[Kitchen] Attempt ${attempt}/${maxRetries} failed:`, error)

      if (attempt === maxRetries) {
        // Show error to kitchen staff
        notifyKitchenStaff({
          type: 'error',
          message: `Failed to mark item as ready. Will retry on next action.`,
          itemId: orderItemId
        })
        throw error
      }

      // Wait before retry
      await sleep(1000 * attempt)
    }
  }
}
```

---

## Migration Plan

### Phase 1: Add Fields (Non-breaking)

```sql
-- 1. order_items: Write-off tracking + cached cost
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS write_off_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS write_off_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS write_off_triggered_by TEXT,
ADD COLUMN IF NOT EXISTS write_off_operation_id UUID,
ADD COLUMN IF NOT EXISTS recipe_writeoff_id UUID,
ADD COLUMN IF NOT EXISTS cached_actual_cost JSONB;

-- 2. orders: Offline tracking для SYNC столбца в Kitchen Monitor
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS offline_created BOOLEAN DEFAULT false;

-- 3. storage_operations: cancellation_loss reason
ALTER TABLE storage_operations
DROP CONSTRAINT IF EXISTS storage_operations_reason_check;

ALTER TABLE storage_operations
ADD CONSTRAINT storage_operations_reason_check
CHECK (reason IN (
  'expired', 'spoiled', 'other', 'cancellation_loss',
  'education', 'test', 'production_consumption', 'sales_consumption'
));

-- 4. Backfill: mark all paid orders as already written off
UPDATE order_items oi
SET write_off_status = 'completed',
    write_off_triggered_by = 'payment_fallback',
    write_off_at = o.paid_at
FROM orders o
WHERE oi.order_id = o.id
AND o.status = 'paid';
```

### Phase 2: Update Kitchen Display

1. Add SYNC column for offline-created orders
2. Add "Mark as Ready" button with background write-off trigger
3. Add visual indicator for write-off status (processing/completed)
4. Add bulk recovery feature for SYNC orders

### Phase 3: Update Payment Flow

1. Add write-off status check before payment
2. Implement fallback write-off logic
3. Remove synchronous write-off from normal path

### Phase 4: Monitoring & Tuning

1. Add metrics for write-off timing
2. Track fallback usage %
3. Alert on high fallback rate (indicates Kitchen Display issues)

---

## Monitoring Metrics

```typescript
// Track write-off sources
const writeOffMetrics = {
  total: 0,
  bySource: {
    kitchen_ready: 0, // Normal path - good
    bar_ready: 0, // Normal path - good
    payment_fallback: 0, // Fallback - should be low
    manual: 0 // Admin intervention - should be rare
  },
  timing: {
    avgKitchenWriteOff: 0, // ms
    avgPaymentFallback: 0, // ms
    avgPaymentNoFallback: 0 // ms - should be <1s
  }
}

// Alert if fallback > 10%
if (metrics.bySource.payment_fallback / metrics.total > 0.1) {
  alertOps('High payment fallback rate - check Kitchen Display connectivity')
}
```

---

## COGS Architecture & Single Source of Truth

### Где живёт COGS - Единый Источник Правды

**КРИТИЧНО:** COGS считается из `sales_transactions.actual_cost`, НЕ из `storage_operations`!

```
┌─────────────────────────────────────────────────────────────────┐
│                    COGS ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  sales_transactions.actual_cost (JSONB)                         │
│  ├── totalCost: 45000          ← FIFO-стоимость                │
│  ├── preparationCosts: [...]   ← Полуфабрикаты                 │
│  ├── productCosts: [...]       ← Продукты                      │
│  └── method: 'FIFO'                                             │
│                                                                  │
│  ↓ SQL: get_cogs_by_date_range()                                │
│                                                                  │
│  v_sales_cogs = SUM(actual_cost->>'totalCost')                  │
│                  └── ТОЛЬКО из sales_transactions               │
│                                                                  │
│  storage_operations (reason='sales_consumption')                │
│  └── ИСКЛЮЧАЕТСЯ из COGS расчёта! (SQL строки 42-43)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Ключевой SQL (get_cogs_by_date_range.sql:42-43):**

```sql
-- Always exclude production_consumption and sales_consumption
-- (already in Sales COGS)
v_storage_excluded := ARRAY['production_consumption', 'sales_consumption'];
```

### Текущий Payment Flow (Оптимизированный)

**Файл:** `src/stores/sales/salesStore.ts:302-459`

```
┌─────────────────────────────────────────────────────────────────┐
│ recordSalesTransaction(payment, billItems)                       │
│                                                                  │
│ 1. createDecompositionEngine() ─────────────────┐               │
│ 2. createWriteOffAdapter()                       │ ОДИН РАЗ      │
│ 3. createCostAdapter()                          ─┘               │
│                                                                  │
│ FOR EACH billItem:                                               │
│   4. engine.traverse(menuInput) ← ОДНА декомпозиция             │
│   5. writeOffAdapter.transform(traversalResult) ← тот же result │
│   6. costAdapter.transform(traversalResult) ← тот же result      │
│   7. SalesService.saveSalesTransaction(actualCost) ← COGS сюда  │
│   8. recipeWriteOffStore.processItemWriteOffFromResult()        │
│      └── storageStore.createWriteOff(reason='sales_consumption')│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Оптимизация уже есть:** Одна декомпозиция → два адаптера используют результат.

### Проблема: Двойная Декомпозиция при Naive Ready-Triggered

```
┌─────────────────────────────────────────────────────────────────┐
│ ПРОБЛЕМА: Двойная декомпозиция и двойной write-off              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. Kitchen marks READY:                                          │
│    ├── DecompositionEngine.traverse() ← ПЕРВАЯ декомпозиция    │
│    ├── WriteOffAdapter.transform()                              │
│    └── storageStore.createWriteOff(reason='sales_consumption')  │
│                                                                  │
│ 2. Payment:                                                      │
│    ├── DecompositionEngine.traverse() ← ВТОРАЯ декомпозиция ❌  │
│    ├── CostAdapter.transform() → sales_transactions.actual_cost │
│    ├── WriteOffAdapter.transform()                              │
│    └── processItemWriteOffFromResult() ← ВТОРОЙ write-off ❌    │
│                                                                  │
│ РЕЗУЛЬТАТ:                                                       │
│ • 2x декомпозиции (performance hit)                             │
│ • 2x storage_operations записи (дубли)                          │
│ • COGS не пострадает (SQL защита), но данные замусорены        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Архитектурные Решения

### Вопрос: Нужен ли отдельный store?

**Нет, отдельный store не нужен.** Это было бы дублирование.

Достаточно добавить **два поля** в order_item:

- `cachedActualCost` — FIFO стоимость
- `recipeWriteOffId` — ссылка на recipe_writeoffs

### Вопрос: Это дублирование с storage_operations?

**Нет, это разные данные:**

| Хранилище                     | Что хранит                     | Для чего                |
| ----------------------------- | ------------------------------ | ----------------------- |
| `storage_operations`          | items[], batches[], quantities | Учёт складских движений |
| `order_item.cachedActualCost` | totalCost, FIFO breakdown      | Расчёт прибыли/COGS     |

### Вопрос: Когда payment раньше ready?

**Fallback логика:**

```typescript
if (item.cachedActualCost) {
  // ✅ Используем готовый расчёт
  actualCost = item.cachedActualCost
} else {
  // ⚠️ Fallback: Payment до Ready или offline
  actualCost = await costAdapter.transform(traversalResult)
  await processItemWriteOffFromResult(...)
}
```

Это покрывает:

- Оплата до готовности (takeaway)
- Offline режим (нет синхронизации статусов)
- Legacy заказы (без writeOffStatus)

---

## Гибридный Подход для Отчётов

### Текущий Flow (Payment-triggered)

```
Payment → Одновременно записывается:
  1. sales_transactions + actual_cost  → Sales Transactions View
  2. recipe_writeoffs                  → Write-off History View
  3. storage_operations                → Складской учёт
```

### Новый Flow (Гибридный Ready+Payment)

```
Ready → Записывается:
  1. storage_operations (с FIFO cost)  → Складской учёт ✅
  2. recipe_writeoffs (БЕЗ salesTransactionId)  → Write-off History ✅
  3. order_item.cachedActualCost       → Кэш для Payment
  4. order_item.recipeWriteOffId       → Ссылка для связи

Payment → Дополняется:
  1. sales_transactions + actual_cost  → Sales Transactions ✅
  2. recipe_writeoffs.salesTransactionId = transaction.id  → Связь ✅
```

### Структура Данных

```
┌─────────────────────────────────────────────────────────────────┐
│ При READY:                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ storage_operations:                                              │
│   id: 'so-123'                                                   │
│   reason: 'sales_consumption'                                    │
│   items: [{itemId, quantity, unit, batchAllocations}]           │
│                                                                  │
│ recipe_writeoffs:                                                │
│   id: 'rwo-123'                                                  │
│   salesTransactionId: NULL  ← ещё нет                           │
│   storageOperationId: 'so-123'                                   │
│   writeOffItems: [{itemName, totalQuantity, costPerUnit, ...}]  │
│   actualCost: {...}  ← FIFO расчёт                              │
│                                                                  │
│ order_item:                                                      │
│   writeOffStatus: 'completed'                                    │
│   writeOffOperationId: 'so-123'                                 │
│   recipeWriteOffId: 'rwo-123'  ← ссылка на write-off            │
│   cachedActualCost: {...}                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ При PAYMENT:                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ sales_transactions:                                              │
│   id: 'st-456'                                                   │
│   recipeWriteOffId: 'rwo-123'  ← ссылка на write-off            │
│   actualCost: {...}  ← из кэша order_item                       │
│                                                                  │
│ recipe_writeoffs (UPDATE):                                       │
│   salesTransactionId: 'st-456'  ← теперь связан!                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Влияние на Отчёты

| Отчёт              | Когда видны данные | Источник                         |
| ------------------ | ------------------ | -------------------------------- |
| Write-off History  | Сразу при Ready    | `recipe_writeoffs`               |
| Sales Transactions | При Payment        | `sales_transactions`             |
| Складской учёт     | Сразу при Ready    | `storage_operations`             |
| COGS отчёт         | При Payment        | `sales_transactions.actual_cost` |

---

## Единый Источник Правды: Расширенный OrderItem

### Архитектура: Сохранять результаты при Ready

```typescript
// order_item расширенный тип
interface OrderItem {
  // ... existing fields ...

  // ✨ NEW: Write-off tracking
  writeOffStatus: 'pending' | 'processing' | 'completed' | 'skipped'
  writeOffAt?: string
  writeOffTriggeredBy?: 'kitchen_ready' | 'bar_ready' | 'payment_fallback'
  writeOffOperationId?: string // → storage_operations.id

  // ✨ NEW: Cached decomposition results (единый источник правды)
  cachedActualCost?: ActualCostBreakdown // FIFO результат
  recipeWriteOffId?: string // → recipe_writeoffs.id
}
```

### Ready-Triggered Flow (ИСПРАВЛЕННЫЙ)

```
┌─────────────────────────────────────────────────────────────────┐
│ Kitchen marks READY (с кэшированием стоимости)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. createDecompositionEngine()                                   │
│ 2. engine.traverse(menuInput) ← ЕДИНСТВЕННАЯ декомпозиция      │
│ 3. costAdapter.transform() → actualCost                         │
│ 4. writeOffAdapter.transform() → writeOffResult                  │
│ 5. storageStore.createWriteOff(reason='sales_consumption')      │
│ 6. recipeWriteOffStore.create() → recipe_writeoffs (без txId)   │
│                                                                  │
│ 7. updateOrderItem({                                             │
│      writeOffStatus: 'completed',                                │
│      writeOffOperationId: operation.id,                          │
│      recipeWriteOffId: recipeWriteOff.id,                       │
│      cachedActualCost: actualCost  // ← ЕДИНСТВЕННОЕ КЭШИРОВАНИЕ│
│    })                                                            │
│                                                                  │
│ ✅ Декомпозиция сделана                                          │
│ ✅ Товар списан                                                  │
│ ✅ Стоимость посчитана и сохранена                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Payment Flow (ИСПРАВЛЕННЫЙ)

```
┌─────────────────────────────────────────────────────────────────┐
│ recordSalesTransaction() - с проверкой writeOffStatus           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ FOR EACH billItem:                                               │
│                                                                  │
│   IF (item.writeOffStatus === 'completed') {                     │
│     // ✅ FAST PATH: Используем кэшированные данные             │
│     const actualCost = item.cachedActualCost                     │
│                                                                  │
│     // Создаём sales_transaction с готовыми данными             │
│     SalesService.saveSalesTransaction({                          │
│       actualCost,  // ← Из кэша, без декомпозиции               │
│       recipeWriteOffId: item.recipeWriteOffId                    │
│     })                                                           │
│                                                                  │
│     // Связываем recipe_writeoffs с транзакцией                 │
│     RecipeWriteOffService.linkToTransaction(                     │
│       item.recipeWriteOffId,                                     │
│       transaction.id                                             │
│     )                                                            │
│                                                                  │
│     // ⚡ SKIP: processItemWriteOffFromResult() - уже сделано    │
│   }                                                              │
│                                                                  │
│   ELSE {                                                         │
│     // FALLBACK PATH: Обычный flow (offline, etc.)              │
│     // ... existing decomposition logic ...                      │
│   }                                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Логика: Единый Источник Правды

```
                    ┌──────────────────┐
                    │   Order Item     │
                    ├──────────────────┤
                    │ writeOffStatus   │
                    │ writeOffOpId     │
                    │ recipeWriteOffId │
                    │ cachedActualCost │ ← Стоимость (FIFO)
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   Ready Trigger       Payment Check       Cancellation
         │                   │                   │
         │                   │                   │
   Декомпозиция        Есть кэш?           Есть write-off?
   + Write-off              │                   │
   + Сохранить          ┌───┴───┐          ┌───┴───┐
     стоимость          ▼       ▼          ▼       ▼
         │           ДА      НЕТ         ДА      НЕТ
         │            │       │           │       │
         │      Использ.  Fallback:   Обновить  Просто
         │       кэш    декомпозиц.   reason   cancel
         │            │       │           │       │
         ▼            ▼       ▼           ▼       ▼
   storage_ops   sales_tx  sales_tx  storage_ops  done
   recipe_wo     + link    + write    update
```

---

## Cancellation Rollback Architecture

### Проблема

Когда блюдо отменяется ПОСЛЕ Ready:

- Write-off уже создан с `reason='sales_consumption'`
- COGS не должен включать отменённые позиции
- Нужно пометить как потерю

### Решение: Новый Write-Off Reason

```typescript
export type WriteOffReason =
  | 'expired'
  | 'spoiled'
  | 'other'
  | 'cancellation_loss' // ✨ NEW: отмена после Ready
  | 'education'
  | 'test'
  | 'production_consumption'
  | 'sales_consumption'

// Update classification
export const WRITE_OFF_CLASSIFICATION = {
  KPI_AFFECTING: ['expired', 'spoiled', 'other', 'cancellation_loss'], // ← ADD
  NON_KPI_AFFECTING: ['education', 'test', 'production_consumption', 'sales_consumption']
}
```

### Cancellation Flow

| Stage     | Write-Off Status | На отмену                                |
| --------- | ---------------- | ---------------------------------------- |
| `pending` | `pending`        | `writeOffStatus='skipped'`, no write-off |
| `cooking` | `pending`        | Пользователь выбирает (можно ещё успеть) |
| `ready`   | `completed`      | UPDATE: `reason → 'cancellation_loss'`   |
| `served`  | `completed`      | UPDATE: `reason → 'cancellation_loss'`   |

### Cancellation Flow Code

```typescript
async function cancelItem(orderId, billId, item, request) {
  if (item.writeOffStatus === 'completed' && item.writeOffOperationId) {
    // 1. Update write-off reason to cancellation_loss
    await storageStore.updateWriteOffReason(
      item.writeOffOperationId,
      'cancellation_loss',
      `Cancelled: ${request.reason}`
    )

    // 2. Cancel order item (NO new write-off)
    await ordersStore.cancelItem(orderId, billId, item.id, {
      reason: request.reason,
      cancelledAfterWriteOff: true
    })

    // 3. DO NOT create sales_transaction for cancelled items
    return { success: true }
  }
  // ... existing flow for items without write-off ...
}
```

### COGS Impact

```sql
-- get_cogs_by_date_range() SQL:

v_sales_cogs = SUM(actual_cost->>'totalCost')
               FROM sales_transactions
               -- ← Отменённые позиции НЕ имеют sales_transaction
               -- ← Поэтому не попадают в Sales COGS ✅

v_spoilage = SUM(total_value)
             FROM storage_operations
             WHERE reason IN ('expired', 'spoiled', 'other', 'cancellation_loss')
             -- ← cancellation_loss ВКЛЮЧАЕТСЯ в потери ✅
```

### P&L Report Impact

```
P&L Report (After):
  Sales COGS = 28,000          ← только завершённые продажи
  Cancellation Loss = 2,000    ← отдельная строка
  Total COGS = 30,000
```

---

## Implementation Plan

### Step 1: Add New Write-Off Reason Type

**File:** `src/stores/storage/types.ts`

```typescript
export type WriteOffReason =
  | 'expired'
  | 'spoiled'
  | 'other'
  | 'cancellation_loss' // ✨ NEW: KPI-affecting (cancelled after ready)
  | 'education'
  | 'test'
  | 'production_consumption'
  | 'sales_consumption'

// Update classification
export const WRITE_OFF_CLASSIFICATION = {
  KPI_AFFECTING: ['expired', 'spoiled', 'other', 'cancellation_loss'], // ← ADD
  NON_KPI_AFFECTING: ['education', 'test', 'production_consumption', 'sales_consumption']
}
```

### Step 2: Extend PosBillItem Type

**File:** `src/stores/pos/types.ts`

```typescript
interface PosBillItem {
  // ... existing fields ...

  // Write-off tracking (уже частично есть)
  writeOffStatus?: 'pending' | 'processing' | 'completed' | 'skipped'
  writeOffAt?: string
  writeOffTriggeredBy?: 'kitchen_ready' | 'bar_ready' | 'payment_fallback' | 'manual'
  writeOffOperationId?: string

  // ✨ NEW: Cached cost and write-off reference
  cachedActualCost?: ActualCostBreakdown
  recipeWriteOffId?: string
}
```

### Step 3: Add updateWriteOffReason Method

**File:** `src/stores/storage/storageStore.ts`

```typescript
async function updateWriteOffReason(
  operationId: string,
  newReason: WriteOffReason,
  additionalNotes?: string
): Promise<ServiceResponse<void>> {
  const { data, error } = await supabase
    .from('storage_operations')
    .update({
      reason: newReason,
      notes: additionalNotes
        ? supabase.sql`COALESCE(notes, '') || ' | ' || ${additionalNotes}`
        : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', operationId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}
```

### Step 4: Update recordSalesTransaction

**File:** `src/stores/sales/salesStore.ts`

```typescript
async function recordSalesTransaction(payment, billItems) {
  // ...

  for (const billItem of billItems) {
    // ✨ FAST PATH: Write-off already done at Ready
    if (billItem.writeOffStatus === 'completed' && billItem.cachedActualCost) {
      DebugUtils.info(MODULE_NAME, 'Using cached data from Ready', {
        itemId: billItem.id,
        recipeWriteOffId: billItem.recipeWriteOffId
      })

      const actualCost = billItem.cachedActualCost

      // Create transaction with cached actualCost
      const transaction: SalesTransaction = {
        ...createBaseTransaction(billItem, payment),
        actualCost,
        recipeWriteOffId: billItem.recipeWriteOffId
      }

      await SalesService.saveSalesTransaction(transaction)

      // ✨ Link recipe_writeoffs with salesTransactionId
      if (billItem.recipeWriteOffId) {
        await RecipeWriteOffService.linkToTransaction(billItem.recipeWriteOffId, transaction.id)
      }

      // ⚡ SKIP: processItemWriteOffFromResult - уже сделано при Ready
      continue
    }

    // FALLBACK PATH: Payment до Ready (takeaway, offline)
    // ... existing decomposition code ...
  }
}
```

### Step 5: Add linkToTransaction Method

**File:** `src/stores/sales/recipeWriteOff/services.ts`

```typescript
/**
 * Link existing recipe_writeoff to sales_transaction
 * Called when Payment happens after Ready-triggered write-off
 */
async function linkToTransaction(
  recipeWriteOffId: string,
  salesTransactionId: string
): Promise<void> {
  const { error } = await supabase
    .from('recipe_writeoffs')
    .update({ sales_transaction_id: salesTransactionId })
    .eq('id', recipeWriteOffId)

  if (error) {
    console.error('Failed to link write-off to transaction:', error)
  }
}
```

### Step 6: Ready-Triggered Write-Off Function

**File:** `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts`

```typescript
/**
 * Execute write-off when Kitchen marks item as READY
 * Creates: storage_operations + recipe_writeoffs (without salesTransactionId)
 * Returns: actualCost for caching in order_item
 */
async function executeReadyTriggeredWriteOff(
  orderItem: OrderItem
): Promise<{
  storageOperationId: string
  recipeWriteOffId: string
  actualCost: ActualCostBreakdown
}> {
  const engine = await createDecompositionEngine()
  const costAdapter = createCostAdapter()
  const writeOffAdapter = createWriteOffAdapter()

  await costAdapter.initialize()

  const menuInput = {
    menuItemId: orderItem.menuItemId,
    variantId: orderItem.variantId,
    quantity: orderItem.quantity,
    selectedModifiers: orderItem.selectedModifiers
  }

  // 1. Single decomposition
  const traversalResult = await engine.traverse(menuInput, costAdapter.getTraversalOptions())

  // 2. Get FIFO cost
  const actualCost = await costAdapter.transform(traversalResult, menuInput)

  // 3. Get write-off items
  const writeOffResult = await writeOffAdapter.transform(traversalResult, menuInput)

  // 4. Create storage operation
  const storageOperation = await storageStore.createWriteOff({
    department: orderItem.department,
    reason: 'sales_consumption',
    items: writeOffResult.items.map(...)
  }, { skipReload: true })

  // 5. Create recipe_writeoff (WITHOUT salesTransactionId)
  const recipeWriteOff = await createRecipeWriteOff({
    ...buildRecipeWriteOff(orderItem, writeOffResult, actualCost),
    salesTransactionId: null,  // ← Will be linked at Payment
    storageOperationId: storageOperation.id
  })

  return {
    storageOperationId: storageOperation.id,
    recipeWriteOffId: recipeWriteOff.id,
    actualCost
  }
}
```

### Step 7: Update Cancellation Logic

**File:** `src/stores/pos/orders/composables/useCancellation.ts`

```typescript
async function cancelItem(orderId, billId, item, request, callbacks) {
  // ... validation ...

  // ✨ Handle cancellation AFTER ready-triggered write-off
  if (item.writeOffStatus === 'completed' && item.writeOffOperationId) {
    DebugUtils.info(MODULE_NAME, 'Cancelling after write-off', { itemId: item.id })

    // 1. Update write-off reason to cancellation_loss
    const storageStore = useStorageStore()
    await storageStore.updateWriteOffReason(
      item.writeOffOperationId,
      'cancellation_loss',
      `Cancelled: ${request.reason} by ${currentUser}`
    )

    // 2. Cancel the order item (NO new write-off needed)
    await ordersStore.cancelItem(orderId, billId, item.id, {
      reason: request.reason,
      notes: request.notes,
      cancelledBy: currentUser,
      cancelledAfterWriteOff: true
    })

    return { success: true }
  }

  // ... existing flow for items without write-off ...
}
```

### Step 8: Database Migration

**File:** `src/supabase/migrations/0XX_ready_triggered_writeoff.sql`

```sql
-- Migration: 0XX_ready_triggered_writeoff
-- Description: Add cancellation_loss reason and indexes for ready-triggered write-off
-- Date: 2026-01-30

-- 1. Add cancellation_loss reason to storage_operations
ALTER TABLE storage_operations
DROP CONSTRAINT IF EXISTS storage_operations_reason_check;

ALTER TABLE storage_operations
ADD CONSTRAINT storage_operations_reason_check
CHECK (reason IN (
  'expired', 'spoiled', 'other', 'cancellation_loss',
  'education', 'test', 'production_consumption', 'sales_consumption'
));

-- 2. Verify salesTransactionId is nullable in recipe_writeoffs
-- (Already nullable in most setups, this is verification)
-- ALTER TABLE recipe_writeoffs ALTER COLUMN sales_transaction_id DROP NOT NULL;

-- 3. Add index for linking recipe_writeoffs by order_item
CREATE INDEX IF NOT EXISTS idx_recipe_writeoffs_order_item
ON recipe_writeoffs (order_item_id);

-- 4. Add index for finding write-offs by storage_operation
CREATE INDEX IF NOT EXISTS idx_recipe_writeoffs_storage_operation
ON recipe_writeoffs (storage_operation_id);
```

---

## Files to Modify

| #   | File                                                     | Changes                                                        |
| --- | -------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `src/stores/storage/types.ts`                            | Add `cancellation_loss`, update `WRITE_OFF_CLASSIFICATION`     |
| 2   | `src/stores/pos/types.ts`                                | Add `cachedActualCost`, `recipeWriteOffId` to PosBillItem      |
| 3   | `src/stores/storage/storageStore.ts`                     | Add `updateWriteOffReason()` method                            |
| 4   | `src/stores/sales/salesStore.ts`                         | Fast path: use cached data, skip decomposition, link write-off |
| 5   | `src/stores/sales/recipeWriteOff/services.ts`            | Add `linkToTransaction()` method                               |
| 6   | `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts` | Add `executeReadyTriggeredWriteOff()` function                 |
| 7   | `src/stores/pos/orders/composables/useCancellation.ts`   | Update reason on post-ready cancellation                       |
| 8   | `src/supabase/migrations/0XX_*.sql`                      | Add CHECK constraint, indexes                                  |
| 9   | Kitchen Display (future)                                 | Call `executeReadyTriggeredWriteOff()` on READY button click   |

---

## Verification Plan

### Test 1: Ready-Triggered → Payment (No Double Decomposition)

1. Create order with 2 items
2. Kitchen marks both as READY → triggers write-off
3. Verify: `cachedActualCost` and `recipeWriteOffId` saved on items
4. Process payment
5. Verify:
   - Only 1 `storage_operations` per item (not 2)
   - `sales_transactions.actual_cost` matches `cachedActualCost`
   - `recipe_writeoffs.sales_transaction_id` is linked
   - No second decomposition in logs

### Test 2: Cancellation After Ready

1. Create order with 2 items
2. Kitchen marks both as READY
3. Cancel 1 item with reason `customer_refused`
4. Verify:
   - `storage_operations.reason` changed to `cancellation_loss`
   - No `sales_transaction` for cancelled item
   - `get_cogs_by_date_range()` excludes cancelled from Sales COGS
   - Cancelled appears in spoilage/losses

### Test 3: Payment Before Ready (Fallback)

1. Create takeaway order
2. Customer pays immediately (before kitchen marks ready)
3. Verify:
   - Fallback decomposition runs
   - `sales_transaction` and `storage_operations` created
   - Works same as current flow
   - `writeOffTriggeredBy = 'payment_fallback'`

### Test 4: COGS Report Accuracy

1. Run 10 orders: 8 normal, 2 cancelled after ready
2. Run `get_cogs_by_date_range()`
3. Verify:
   - `sales_cogs` = 8 items × cost
   - `cancellation_loss` = 2 items × cost (separate line)
   - `total_cogs` = sales_cogs + cancellation_loss + other_losses

### Test 5: Report Visibility (Гибридный подход)

1. Create order with 2 items
2. Kitchen marks item 1 as READY
3. **Check Write-off History:** Item 1 SHOULD appear (with `salesTransactionId = NULL`)
4. **Check Sales Transactions:** Item 1 SHOULD NOT appear yet
5. Process payment
6. **Check Write-off History:** Item 1 now has `salesTransactionId` linked
7. **Check Sales Transactions:** Item 1 appears with correct `actualCost`

### Test 6: Data Integrity

1. Mark item as READY → creates recipe_writeoff + storage_operation
2. Process payment → creates sales_transaction, links to recipe_writeoff
3. Verify all 3 records have matching costs:
   - `recipe_writeoffs.actualCost.totalCost`
   - `sales_transactions.actual_cost.totalCost`
   - `storage_operations.total_value`

---

## Summary: Финальная Архитектура

### Что НЕ меняем:

- ❌ Не создаём отдельный store
- ❌ Не используем localStorage для кэша
- ❌ Не меняем логику COGS расчёта (он уже правильный)
- ❌ Не храним весь writeOffResult (только actualCost)
- ❌ Kitchen НЕ подписывается на writeOffStatus (POS = source of truth)

### Что добавляем:

- ✅ Background queue для write-off (`src/core/background/useBackgroundTasks.ts`)
- ✅ SYNC столбец в Kitchen Monitor для offline заказов
- ✅ `offline_created` флаг на orders
- ✅ Поля в order_item: `cachedActualCost`, `recipeWriteOffId`
- ✅ Новый reason `cancellation_loss`
- ✅ Методы: `updateWriteOffReason()`, `linkToTransaction()`
- ✅ Fast path в `recordSalesTransaction()` — использовать cached cost
- ✅ Функция `markItemAsReady()` с background queue

### Архитектурный принцип:

```
Ready → UI сразу обновляется → Background: Декомпозиция + Write-off + Cache cost
Payment → Проверить writeOffStatus → Fast path ИЛИ Fallback
Cancel → Обновить reason в существующем write-off → cancellation_loss
Offline → SYNC столбец → Bulk recovery
```

---

## Summary

| Aspect                      | Before                | After                       |
| --------------------------- | --------------------- | --------------------------- |
| **Payment time (normal)**   | ~9 seconds            | ~2 seconds                  |
| **Payment time (fallback)** | N/A                   | ~7 seconds                  |
| **Write-off timing**        | At payment (blocking) | At ready (background)       |
| **Offline handling**        | Automatic             | SYNC column + bulk recovery |
| **Source of truth**         | POS                   | POS (unchanged)             |
| **UI blocking**             | Yes (write-off)       | No (background queue)       |

### Key Benefits

1. **4-5x faster payments** in normal flow (~60-70% of orders)
2. **Non-blocking UI** - write-off в background queue
3. **Accurate write-off timing** - when actually prepared
4. **SYNC column** - visual separation of offline orders
5. **POS remains source of truth** - no sync conflicts

### Implementation Effort

- Database: 1 migration (order_items + orders + storage_operations)
- Background Queue: `src/core/background/useBackgroundTasks.ts`
- Kitchen Store: `markItemAsReady()` + SYNC column UI
- Payment Flow: Fast path check in `recordSalesTransaction()`
- Testing: Critical - offline scenarios + background queue

---

## Next Steps

### Phase 1: Database & Infrastructure

1. [ ] Create database migration (`order_items`, `orders`, `storage_operations`)
2. [ ] Implement `useBackgroundTasks.ts` for background queue
3. [ ] Add `ReadyWriteOffSyncAdapter` to SyncService

### Phase 2: Kitchen Display

4. [ ] Add SYNC column to Kitchen Monitor UI
5. [ ] Implement `markItemAsReady()` with background queue
6. [ ] Add bulk recovery UI for SYNC orders
7. [ ] Test Kitchen Display с offline заказами

### Phase 3: Payment Flow

8. [ ] Add fast path check in `recordSalesTransaction()`
9. [ ] Implement `linkToTransaction()` method
10. [ ] Test Payment с cached cost vs fallback

### Phase 4: Cancellation

11. [ ] Add `updateWriteOffReason()` method
12. [ ] Update cancellation flow to use `cancellation_loss`
13. [ ] Test cancellation после Ready

### Phase 5: Testing & Deployment

14. [ ] Test offline scenarios (POS offline, Kitchen offline, both)
15. [ ] Test background queue retry logic
16. [ ] Deploy to dev
17. [ ] Monitor metrics (fast path %, fallback %, queue processing time)

---

## Implementation Log

### 2026-01-30: Code Review & Bug Fixes

**Status:** ✅ IMPLEMENTED

После code review были обнаружены и исправлены следующие баги:

#### Критические исправления (P0)

| #   | Проблема                                                                           | Файл                | Решение                                                                                         |
| --- | ---------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | **Race condition**: items застревали в `write_off_status = 'processing'` при крэше | `kitchenService.ts` | Добавлена функция `recoverStaleProcessingItems()` — сбрасывает items старше 5 минут в `pending` |
| 2   | **onError не awaited**: сброс статуса мог fail silently                            | `kitchenService.ts` | Добавлен try-catch вокруг reset, логирование ошибок                                             |

#### Важные исправления (P1)

| #   | Проблема                                                            | Файл                              | Решение                                                                         |
| --- | ------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| 3   | **Weak type check**: `cachedActualCost!` без валидации              | `salesStore.ts`                   | Добавлен type guard `isValidCachedCost()` для проверки структуры                |
| 4   | **Property names mismatch**: использовались несуществующие свойства | `salesStore.ts`, `CostAdapter.ts` | Исправлено `avgCostPerUnit` → `averageCostPerUnit`, `products` → `productCosts` |

#### Средние исправления (P2)

| #   | Проблема                                                             | Файл                    | Решение                                                                             |
| --- | -------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| 5   | **Unbounded backoff**: delay мог расти до 32s+                       | `useBackgroundTasks.ts` | Добавлен `MAX_BACKOFF_DELAY_MS = 60000` и `calculateBackoffDelay()`                 |
| 6   | **Await missing**: `updateExistingWriteOffReason` не awaited         | `useCancellation.ts`    | Добавлен `await`                                                                    |
| 7   | **Weak result validation**: write-off result не полностью проверялся | `useBackgroundTasks.ts` | Добавлена проверка `storageOperationId`, `recipeWriteOffId`, `actualCost.totalCost` |

#### Изменённые файлы

```
src/stores/kitchen/kitchenService.ts
├── + PROCESSING_TIMEOUT_MS constant
├── + recoverStaleProcessingItems() function
└── ~ markItemAsReadyWithWriteOff() - improved error handling

src/stores/sales/salesStore.ts
├── + isValidCachedCost() type guard
└── ~ recordSalesTransaction() - fixed property names

src/core/decomposition/adapters/CostAdapter.ts
└── ~ avgCostPerUnit → averageCostPerUnit (match type definition)

src/core/background/useBackgroundTasks.ts
├── + MAX_BACKOFF_DELAY_MS constant
├── + calculateBackoffDelay() function
└── ~ processReadyWriteOffTask() - improved result validation

src/stores/pos/orders/composables/useCancellation.ts
└── ~ cancelItem() - await updateExistingWriteOffReason
```

#### Type Guard Implementation

```typescript
// salesStore.ts
function isValidCachedCost(cost: unknown): cost is ActualCostBreakdown {
  if (!cost || typeof cost !== 'object') return false
  const c = cost as Record<string, unknown>
  return (
    typeof c.totalCost === 'number' &&
    Array.isArray(c.productCosts) &&
    Array.isArray(c.preparationCosts)
  )
}
```

#### Recovery Function

```typescript
// kitchenService.ts
export async function recoverStaleProcessingItems(): Promise<number> {
  const cutoffTime = new Date(Date.now() - PROCESSING_TIMEOUT_MS).toISOString()

  const { data: staleItems } = await supabase
    .from('order_items')
    .select('id, order_id, menu_item_name')
    .eq('write_off_status', 'processing')
    .lt('updated_at', cutoffTime)

  if (staleItems?.length) {
    await supabase
      .from('order_items')
      .update({ write_off_status: 'pending' })
      .in(
        'id',
        staleItems.map(i => i.id)
      )
  }

  return staleItems?.length || 0
}
```

#### Backoff with Cap

```typescript
// useBackgroundTasks.ts
const MAX_BACKOFF_DELAY_MS = 60 * 1000 // 60 seconds

function calculateBackoffDelay(attempt: number): number {
  const baseDelay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s, 16s...
  return Math.min(baseDelay, MAX_BACKOFF_DELAY_MS)
}
```

#### Build Status

✅ `pnpm build` — успешно (57.79s)

---

### 2026-01-30: UI Testing & Type Mismatch Fix

**Status:** ✅ FIXED

При UI тестировании был обнаружен баг: 400 Bad Request при обновлении `order_items`.

#### Проблема

Write-off успешно выполнялся:

- ✅ Storage operation создан
- ✅ Recipe write-off сохранён (id: "rwo-1769748671360-nuibmmmbz")
- ❌ 400 Bad Request при `order_items.update({ recipe_writeoff_id })`

**Причина:** Несоответствие типов колонок:

- `recipe_write_offs.id` = **TEXT** (хранит "rwo-xxx" формат)
- `order_items.recipe_writeoff_id` = **UUID** (ожидает UUID формат)

#### Решение

Миграция 117: изменить тип `order_items.recipe_writeoff_id` с UUID на TEXT.

```sql
-- Migration: 117_fix_recipe_writeoff_id_type
ALTER TABLE order_items
ALTER COLUMN recipe_writeoff_id TYPE text;
```

#### Файлы

```
src/supabase/migrations/117_fix_recipe_writeoff_id_type.sql  # NEW
```

#### Верификация

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'recipe_writeoff_id';
-- Result: data_type = 'text' ✅
```

---

### 2026-01-30: UI Testing Complete ✅

**Status:** ✅ VERIFIED

После исправления миграции 117, полный Ready-Triggered Write-off flow протестирован и работает:

#### Тестовый заказ

- Order: ORD-20260130-9095
- Item: Latte (id: 0a3c7ef8-4f4e-4456-9b0c-633441fedaf7)
- Kitchen нажал "Ready"

#### Flow timeline

```
04:58:26.059 Kitchen: Click Ready on Latte
04:58:26.240 Item status → 'ready'
04:58:26.568 Background task queued (d1f9fe13...)
04:58:26.572 DecompositionEngine: 3 products
04:58:26.668 FIFO RPC: totalCost = 11074.52 (93ms)
04:58:27.223 Storage operation WO-106728 created
04:58:27.415 Recipe write-off saved (rwo-1769749107334-kkqzzajta)
04:58:27.496 Task completed ✅
```

**Total time:** ~1.4 seconds (non-blocking)

#### Database verification

```sql
SELECT * FROM order_items WHERE id = '0a3c7ef8...';
```

| Field                  | Value                                             |
| ---------------------- | ------------------------------------------------- |
| status                 | ready                                             |
| write_off_status       | **completed** ✅                                  |
| write_off_triggered_by | **kitchen_ready** ✅                              |
| write_off_at           | 2026-01-30T04:58:27 ✅                            |
| cached_actual_cost     | {totalCost: 11074.52, method: "FIFO_RPC", ...} ✅ |
| recipe_writeoff_id     | rwo-1769749107334-kkqzzajta ✅                    |
| write_off_operation_id | b7cb491b-b9eb-4b5d-9184-51d5f4436bfd ✅           |

#### cached_actual_cost structure

```json
{
  "totalCost": 11074.52,
  "method": "FIFO_RPC",
  "productCosts": [3 items],
  "preparationCosts": []
}
```

#### Next: Test Payment Fast Path

Когда этот заказ будет оплачен, система должна:

1. Обнаружить `writeOffStatus === 'completed'`
2. Использовать `cachedActualCost` вместо повторной декомпозиции
3. Быстрый путь (~500ms vs ~3-5s)

---

### 2026-01-30: Payment Fast Path Bug Fix

**Status:** ✅ FIXED

При тестировании оплаты обнаружен ещё один баг с неправильным импортом supabase.

#### Проблема

```
❌ [RecipeWriteOffStore] Error linking write-off: TypeError: Cannot read properties of undefined (reading 'from')
```

**Причина:** Неправильный синтаксис импорта в нескольких файлах:

```typescript
// ❌ Неправильно (supabase - named export, не default)
const { default: supabase } = await import('@/supabase/client')

// ✅ Правильно
const { supabase } = await import('@/supabase/client')
```

#### Исправленные файлы

| Файл                     | Строки        |
| ------------------------ | ------------- |
| `recipeWriteOffStore.ts` | 271, 459, 699 |
| `storageStore.ts`        | 598           |

#### Важно

Несмотря на ошибку, транзакция была записана успешно:

```
✅ [SalesStore] Transaction saved: st-1769749763192-ebdyf9wsm
⚡ [SalesStore] FAST PATH: Using cached cost for Latte ← Кэшированная стоимость использована!
```

Ошибка возникла только при попытке связать write-off с транзакцией (`linkWriteOffToTransaction`), но сама продажа прошла корректно.
