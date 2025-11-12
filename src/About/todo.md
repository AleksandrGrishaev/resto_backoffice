# Sprint 5: Shift History UI + Offline-Resilient Sync

## Обзор

Sprint 5 добавляет две критические функции:

1. **Backoffice интерфейс для истории смен** - отдельный view для просмотра всех смен (admin/manager)
2. **Offline-capable закрытие смен** - возможность закрыть смену без интернета с очередью синхронизации

## Предпосылки

✅ **Sprint 4 завершен:**

- Синхронизация shift → acc_1 при закрытии смены
- Все expenses отображаются корректно
- Mock данные упрощены (2 смены)
- Балансы синхронизированы

## Текущая ситуация

### Что работает ✅

- Смены синхронизируются с acc_1 при закрытии (Sprint 4)
- ShiftManagementView показывает текущую активную смену (POS interface)
- Expenses отображаются в Shift Management
- syncShiftToAccount() создает транзакции в acc_1

### Что НЕ работает ❌

- **НЕТ Backoffice интерфейса** для просмотра истории всех смен
- **Смена НЕ закрывается** если нет интернета (sync блокирует endShift)
- **НЕТ очереди синхронизации** для failed/offline shifts
- **НЕТ retry логики** при старте приложения или восстановлении связи

## Решения по архитектуре ✅

### Согласовано с пользователем:

1. **Маршрут:** `/sales/shifts` (внутри Sales section, рядом с Analytics, Transactions)
2. **Sync архитектура:** Упрощенная версия в `shiftsStore.ts` (рефакторинг в SyncService - Sprint 6)
3. **Таблица:** Упрощенная (как на примере скриншота) - Name, Start Time, End Time, Total Expected, Total Actual, Difference
4. **Детальный просмотр:** Переиспользовать существующий `ShiftManagementView.vue` (открывать в dialog или отдельной странице)

### Следующие шаги:

- **Sprint 5:** Базовая sync queue + Shift History UI
- **Sprint 6:** Централизованный SyncService для всех сущностей (shifts, transactions, discounts, customers, etc.)

## Требования

### 1. Backoffice Shift History View 📊

**Маршрут:** `/sales/shifts` (внутри Sales section)

**Доступ:** Admin, Manager (allowedRoles: ['admin', 'manager'])

**Функциональность:**

- **Упрощенная таблица смен** (аналогично скриншоту):
  - Name (Cashier + Shift Number)
  - Start Time
  - End Time
  - Total Expected (ожидаемая выручка)
  - Total Actual (фактическая выручка)
  - Difference (разница, красным если минус)
  - Sync Status (badge: ✅ synced / ⏳ pending / ❌ failed)
- **Фильтры:**
  - Date range (from/to)
  - Cashier name (dropdown)
  - Sync status filter (all/synced/pending/failed)
- **Детальный просмотр:**
  - Клик на строку → открыть существующий `ShiftManagementView.vue` (read-only mode)
  - Или dialog с тем же компонентом
  - Показать: shift summary, payments, expenses, transactions, sync status
- **Actions:**
  - Retry Sync кнопка для failed shifts

### 2. Offline-Capable Shift Closing 📴

**Требование:** Смена **ДОЛЖНА** закрываться даже без интернета

**Архитектура:**

```
endShift() → ALWAYS SUCCESS (save locally)
  ↓
syncShiftToAccount() → TRY SYNC
  ↓
Success? → Mark as synced
  ↓
Failure? → Add to sync queue (syncedToAccount: false, syncAttempts: 0)
  ↓
Retry later:
  - On app startup (check queue)
  - On network restore (POS goes online)
  - Manual retry (from Backoffice UI)
```

**Поля для tracking:**

```typescript
export interface PosShift {
  // ... existing fields ...

  // ✅ Sprint 4 (already exists)
  syncedToAccount?: boolean
  syncedAt?: string
  accountTransactionIds?: string[]

  // ✅ Sprint 5: NEW
  syncAttempts?: number // Количество попыток синхронизации
  lastSyncAttempt?: string // Когда была последняя попытка
  syncError?: string // Последняя ошибка синхронизации
  syncQueuedAt?: string // Когда добавлена в очередь
}
```

### 3. Sync Queue + Retry Logic 🔄

**LocalStorage ключ:** `pos_sync_queue`

**Структура:**

```typescript
interface SyncQueueItem {
  shiftId: string
  addedAt: string
  attempts: number
  lastAttempt?: string
  lastError?: string
}

type SyncQueue = SyncQueueItem[]
```

**Retry триггеры:**

1. **On app startup** (в `appInitializer.ts` или `App.vue`):

   ```typescript
   if (ENV.pos.offlineFirst) {
     await posStore.processSyncQueue() // После инициализации POS stores
   }
   ```

2. **On network restore** (в `posStore.ts` при network monitoring):

   ```typescript
   watch(isOnline, async online => {
     if (online && syncQueue.length > 0) {
       await processSyncQueue()
     }
   })
   ```

3. **Manual retry** (из Backoffice UI):
   ```typescript
   async function retrySyncShift(shiftId: string) {
     const shift = shifts.value.find(s => s.id === shiftId)
     if (shift && !shift.syncedToAccount) {
       await syncShiftToAccount(shift)
     }
   }
   ```

**Retry strategy:**

- **Max attempts:** 10
- **Backoff:** Exponential (1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, ...)
- **Give up:** После 10 failed attempts → пометить как "needs_manual_intervention"

## Детальный план реализации

### Phase 1: Offline-Capable Shift Closing

#### 1.1. Обновить PosShift type

**Файл:** `src/stores/pos/shifts/types.ts`

**Добавить поля:**

```typescript
export interface PosShift {
  // ... existing fields ...

  // Sprint 5: Offline sync tracking
  syncAttempts?: number
  lastSyncAttempt?: string
  syncError?: string
  syncQueuedAt?: string
}
```

#### 1.2. Изменить логику endShift() + syncShiftToAccount()

**Файл:** `src/stores/pos/shifts/shiftsStore.ts`

**Текущая логика (Sprint 4):**

```typescript
async function endShift(dto: EndShiftDto) {
  const result = await shiftsService.endShift(dto)

  if (result.success && result.data) {
    await syncShiftToAccount(result.data) // ❌ Блокирует если нет интернета
  }

  return result
}
```

**Новая логика (Sprint 5):**

```typescript
async function endShift(dto: EndShiftDto): Promise<ServiceResponse<PosShift>> {
  try {
    // 1. ВСЕГДА закрываем смену локально (offline-first)
    const result = await shiftsService.endShift(dto)

    if (!result.success || !result.data) {
      return result
    }

    const closedShift = result.data

    // 2. ПЫТАЕМСЯ синхронизировать с acc_1 (но не блокируем)
    const syncResult = await syncShiftToAccount(closedShift)

    if (!syncResult.success) {
      // Sync failed → добавляем в очередь
      console.warn(`⚠️ Sync failed for shift ${closedShift.shiftNumber}, adding to queue`)
      await addToSyncQueue(closedShift.id)
    }

    // 3. Обновляем локальный state
    const index = shifts.value.findIndex(s => s.id === closedShift.id)
    if (index !== -1) {
      shifts.value[index] = closedShift
    }
    currentShift.value = null

    // 4. ВСЕГДА возвращаем success (смена закрыта локально)
    return {
      success: true,
      data: closedShift,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'local',
        synced: syncResult.success
      }
    }
  } catch (error) {
    console.error('❌ endShift failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end shift'
    }
  }
}
```

#### 1.3. Обновить syncShiftToAccount() для error handling

**Файл:** `src/stores/pos/shifts/shiftsStore.ts`

**Изменить:**

```typescript
async function syncShiftToAccount(shift: PosShift): Promise<ServiceResponse<void>> {
  try {
    // Increment sync attempts
    shift.syncAttempts = (shift.syncAttempts || 0) + 1
    shift.lastSyncAttempt = new Date().toISOString()

    // Check if account store is available (offline check)
    if (!accountStore.accounts || accountStore.accounts.length === 0) {
      throw new Error('Account store not available (offline)')
    }

    // ... existing sync logic (create transactions) ...

    // Success → mark as synced
    shift.syncedToAccount = true
    shift.syncedAt = new Date().toISOString()
    shift.syncError = undefined

    // Remove from sync queue if present
    await removeFromSyncQueue(shift.id)

    // Save updated shift
    await shiftsService.updateShift(shift)

    return { success: true }
  } catch (error) {
    // Failure → update error info
    shift.syncError = error instanceof Error ? error.message : 'Sync failed'
    shift.syncedToAccount = false

    // Save shift with error info
    await shiftsService.updateShift(shift)

    console.error(`❌ Failed to sync shift ${shift.shiftNumber}:`, error)

    return {
      success: false,
      error: shift.syncError
    }
  }
}
```

### Phase 2: Sync Queue Management

#### 2.1. Создать sync queue helpers

**Файл:** `src/stores/pos/shifts/shiftsStore.ts`

**Добавить методы:**

```typescript
// ===== SYNC QUEUE MANAGEMENT =====

const SYNC_QUEUE_KEY = 'pos_sync_queue'
const MAX_SYNC_ATTEMPTS = 10

interface SyncQueueItem {
  shiftId: string
  addedAt: string
  attempts: number
  lastAttempt?: string
  lastError?: string
}

/**
 * Добавить смену в очередь синхронизации
 */
async function addToSyncQueue(shiftId: string): Promise<void> {
  const queue = getSyncQueue()

  // Check if already in queue
  const existing = queue.find(item => item.shiftId === shiftId)
  if (existing) {
    console.log(`⏳ Shift ${shiftId} already in sync queue`)
    return
  }

  const item: SyncQueueItem = {
    shiftId,
    addedAt: new Date().toISOString(),
    attempts: 0
  }

  queue.push(item)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))

  console.log(`📥 Added shift ${shiftId} to sync queue (${queue.length} items)`)
}

/**
 * Удалить смену из очереди синхронизации
 */
async function removeFromSyncQueue(shiftId: string): Promise<void> {
  const queue = getSyncQueue()
  const filtered = queue.filter(item => item.shiftId !== shiftId)

  if (filtered.length < queue.length) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered))
    console.log(`✅ Removed shift ${shiftId} from sync queue`)
  }
}

/**
 * Получить очередь синхронизации
 */
function getSyncQueue(): SyncQueueItem[] {
  const stored = localStorage.getItem(SYNC_QUEUE_KEY)
  return stored ? JSON.parse(stored) : []
}

/**
 * Обработать очередь синхронизации
 */
async function processSyncQueue(): Promise<void> {
  const queue = getSyncQueue()

  if (queue.length === 0) {
    console.log('✅ Sync queue is empty')
    return
  }

  console.log(`🔄 Processing sync queue (${queue.length} items)...`)

  for (const item of queue) {
    // Check max attempts
    if (item.attempts >= MAX_SYNC_ATTEMPTS) {
      console.error(`❌ Shift ${item.shiftId} exceeded max sync attempts (${MAX_SYNC_ATTEMPTS})`)
      continue
    }

    // Find shift
    const shift = shifts.value.find(s => s.id === item.shiftId)
    if (!shift) {
      console.warn(`⚠️ Shift ${item.shiftId} not found, removing from queue`)
      await removeFromSyncQueue(item.shiftId)
      continue
    }

    // Try to sync
    console.log(`🔄 Retrying sync for shift ${shift.shiftNumber} (attempt ${item.attempts + 1})`)

    const result = await syncShiftToAccount(shift)

    if (result.success) {
      console.log(`✅ Successfully synced shift ${shift.shiftNumber}`)
      // removeFromSyncQueue is called inside syncShiftToAccount
    } else {
      // Update queue item with attempt info
      item.attempts++
      item.lastAttempt = new Date().toISOString()
      item.lastError = result.error

      const updatedQueue = getSyncQueue()
      const index = updatedQueue.findIndex(q => q.shiftId === item.shiftId)
      if (index !== -1) {
        updatedQueue[index] = item
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue))
      }

      console.error(
        `❌ Sync failed for shift ${shift.shiftNumber} (${item.attempts}/${MAX_SYNC_ATTEMPTS})`
      )
    }
  }
}

// Export для использования в других местах
return {
  // ... existing exports ...

  // Sprint 5: Sync queue
  processSyncQueue,
  getSyncQueue,
  retrySyncShift: async (shiftId: string) => {
    const shift = shifts.value.find(s => s.id === shiftId)
    if (shift) {
      return await syncShiftToAccount(shift)
    }
    return { success: false, error: 'Shift not found' }
  }
}
```

#### 2.2. Интегрировать retry в posStore

**Файл:** `src/stores/pos/index.ts`

**Добавить в initializePOS():**

```typescript
async function initializePOS(): Promise<ServiceResponse<void>> {
  try {
    // ... existing initialization ...

    // ✅ Sprint 5: Process sync queue on startup
    console.log('🔄 Checking for pending shift syncs...')
    await shiftsStore.processSyncQueue()

    initialized.value = true
    return { success: true }
  } catch (error) {
    // ...
  }
}
```

**Добавить network watcher:**

```typescript
// Watch network status and trigger sync when online
watch(isOnline, async (online, wasOnline) => {
  if (online && !wasOnline) {
    console.log('🌐 Network restored, processing sync queue...')
    await shiftsStore.processSyncQueue()
  }
})
```

### Phase 3: Backoffice Shift History View (УПРОЩЕННАЯ)

#### 3.1. Создать ShiftHistoryView.vue

**Файл:** `src/views/backoffice/sales/ShiftHistoryView.vue`

**Упрощенная структура (аналогично скриншоту):**

```vue
<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Shift History</h1>
      </v-col>
    </v-row>

    <!-- Filters (минимальные) -->
    <v-row>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="filters.dateFrom"
          label="Date From"
          type="date"
          variant="outlined"
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="filters.dateTo"
          label="Date To"
          type="date"
          variant="outlined"
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="filters.cashier"
          label="Cashier"
          :items="cashierOptions"
          variant="outlined"
          density="compact"
          clearable
        />
      </v-col>
    </v-row>

    <!-- Простая таблица (как на скриншоте) -->
    <v-card class="mt-4">
      <v-data-table
        :headers="headers"
        :items="filteredShifts"
        :loading="loading"
        :items-per-page="25"
        density="comfortable"
        @click:row="viewShiftDetails"
      >
        <!-- Name (Cashier + Shift Number) -->
        <template #[`item.name`]="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.cashierName }}</div>
            <div class="text-caption text-grey">{{ item.shiftNumber }}</div>
          </div>
        </template>

        <!-- Start Time -->
        <template #[`item.startTime`]="{ item }">
          {{ formatDateTime(item.startTime) }}
        </template>

        <!-- End Time -->
        <template #[`item.endTime`]="{ item }">
          {{ item.endTime ? formatDateTime(item.endTime) : '-' }}
        </template>

        <!-- Total Expected -->
        <template #[`item.totalExpected`]="{ item }">
          {{ formatCurrency(calculateExpectedTotal(item)) }}
        </template>

        <!-- Total Actual -->
        <template #[`item.totalActual`]="{ item }">
          {{ formatCurrency(item.actualCash || 0) }}
        </template>

        <!-- Difference -->
        <template #[`item.difference`]="{ item }">
          <span :class="getDifferenceClass(item)">
            {{ formatCurrency(calculateDifference(item)) }}
          </span>
        </template>

        <!-- Sync Status (badge) -->
        <template #[`item.syncStatus`]="{ item }">
          <v-chip :color="getSyncStatusColor(item)" size="small" variant="tonal">
            <v-icon start size="small">{{ getSyncStatusIcon(item) }}</v-icon>
            {{ getSyncStatusText(item) }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <v-btn
            v-if="!item.syncedToAccount && item.status === 'completed'"
            icon
            size="small"
            variant="text"
            color="primary"
            :loading="retryingSync[item.id]"
            @click.stop="retrySync(item)"
          >
            <v-icon>mdi-refresh</v-icon>
            <v-tooltip activator="parent">Retry Sync</v-tooltip>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Shift Details Dialog (переиспользуем ShiftManagementView) -->
    <v-dialog v-model="showDetailsDialog" max-width="1200px">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Shift Details</span>
          <v-btn icon @click="showDetailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <!-- Переиспользуем существующий ShiftManagementView -->
          <ShiftManagementView :shift="selectedShift" read-only />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { formatCurrency, formatDateTime } from '@/utils'
import ShiftManagementView from '@/views/pos/shifts/ShiftManagementView.vue'
import type { PosShift } from '@/stores/pos/shifts/types'

// Упрощенные headers (как на скриншоте)
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Start Time', key: 'startTime' },
  { title: 'End Time', key: 'endTime' },
  { title: 'Total Expected', key: 'totalExpected', align: 'end' },
  { title: 'Total Actual', key: 'totalActual', align: 'end' },
  { title: 'Difference', key: 'difference', align: 'end' },
  { title: 'Sync', key: 'syncStatus' },
  { title: '', key: 'actions', sortable: false }
]

// ... state, computed, methods ...
</script>
```

**Ключевые упрощения:**

- ❌ Убраны summary cards (не нужны для MVP)
- ❌ Убран отдельный ShiftDetailsDialog компонент
- ✅ Переиспользуем существующий ShiftManagementView.vue
- ✅ Простая таблица как на скриншоте
- ✅ Минимум фильтров (date range + cashier)

#### 3.2. Добавить read-only режим в ShiftManagementView.vue

**Файл:** `src/views/pos/shifts/ShiftManagementView.vue`

**Добавить props:**

```typescript
interface Props {
  shift?: PosShift // Опциональная смена (для backoffice просмотра)
  readOnly?: boolean // Режим только для чтения
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false
})

// Использовать props.shift вместо currentShift если передан
const displayShift = computed(() => props.shift || currentShift.value)

// Скрыть action buttons если readOnly
```

#### 3.3. Добавить route в router

**Файл:** `src/router/index.ts`

**Добавить в Sales routes (рядом с analytics, transactions):**

```typescript
{
  path: 'sales',
  meta: {
    allowedRoles: ['admin', 'manager']
  },
  children: [
    {
      path: 'analytics',
      name: 'sales-analytics',
      component: () => import('@/views/backoffice/sales/SalesAnalyticsView.vue'),
      meta: { title: 'Sales Analytics' }
    },
    {
      path: 'transactions',
      name: 'sales-transactions',
      component: () => import('@/views/backoffice/sales/SalesTransactionsView.vue'),
      meta: { title: 'Sales Transactions' }
    },
    // ✅ Sprint 5: NEW
    {
      path: 'shifts',
      name: 'shift-history',
      component: () => import('@/views/backoffice/sales/ShiftHistoryView.vue'),
      meta: { title: 'Shift History' }
    }
  ]
}
```

### Phase 4: Testing & Validation

#### 4.1. Test Offline Shift Closing

**Сценарий:**

1. Открыть POS → Start Shift
2. Создать несколько orders
3. **Отключить интернет** (DevTools → Network → Offline)
4. End Shift
5. Проверить:
   - ✅ Смена закрылась локально (status = 'completed')
   - ✅ UI показывает success
   - ✅ Shift.syncedToAccount = false
   - ✅ Shift добавлена в sync queue

#### 4.2. Test Sync Retry on Startup

**Сценарий:**

1. При отключенном интернете закрыть смену (см. выше)
2. Закрыть приложение (или reload page)
3. **Включить интернет**
4. Открыть приложение
5. Проверить консоль:
   - ✅ `🔄 Processing sync queue...`
   - ✅ `✅ Successfully synced shift #...`
6. Проверить Shift History:
   - ✅ Смена помечена как synced
   - ✅ Транзакции созданы в acc_1

#### 4.3. Test Sync Retry on Network Restore

**Сценарий:**

1. При отключенном интернете закрыть смену
2. **НЕ перезагружать** приложение
3. Включить интернет в DevTools
4. Проверить:
   - ✅ Network watcher срабатывает
   - ✅ Sync queue обрабатывается автоматически
   - ✅ Смена синхронизируется

#### 4.4. Test Backoffice Shift History

**Сценарий:**

1. Открыть Backoffice → Shifts
2. Проверить:
   - ✅ Все смены отображаются в таблице
   - ✅ Фильтры работают (date, cashier, sync status)
   - ✅ Sync status badges корректны (synced, pending, failed)
   - ✅ Summary cards показывают правильные значения
3. Клик на "View Details":
   - ✅ Dialog открывается с полной информацией о смене
4. Клик на "Retry Sync" (для failed shift):
   - ✅ Sync повторяется
   - ✅ Status обновляется в таблице

#### 4.5. Test Manual Retry from Backoffice

**Сценарий:**

1. Создать failed shift (симулировать offline при закрытии)
2. Открыть Backoffice → Shifts
3. Найти failed shift в таблице
4. Клик "Retry Sync"
5. Проверить:
   - ✅ syncShiftToAccount() вызывается
   - ✅ Транзакции создаются в acc_1
   - ✅ Shift помечается как synced
   - ✅ UI обновляется (badge меняется на "synced")

## Файлы для изменения/создания (ОБНОВЛЕНО)

### Новые файлы

1. **src/views/backoffice/sales/ShiftHistoryView.vue** ⭐ УПРОЩЕННАЯ ВЕРСИЯ
   - Простая таблица (как на скриншоте)
   - Минимальные фильтры (date range, cashier)
   - Dialog с переиспользованием ShiftManagementView
   - ~200-300 строк кода

### Измененные файлы

1. **src/stores/pos/shifts/types.ts**

   - Добавить поля: `syncAttempts`, `lastSyncAttempt`, `syncError`, `syncQueuedAt`

2. **src/stores/pos/shifts/shiftsStore.ts** ⭐ ОСНОВНЫЕ ИЗМЕНЕНИЯ

   - Обновить `endShift()` → всегда успешно (offline-first)
   - Обновить `syncShiftToAccount()` → error handling + retry tracking
   - Добавить sync queue methods:
     - `addToSyncQueue()`
     - `removeFromSyncQueue()`
     - `getSyncQueue()`
     - `processSyncQueue()`
     - `retrySyncShift()`
   - Export новых методов

3. **src/stores/pos/index.ts**

   - Добавить `processSyncQueue()` в `initializePOS()`
   - Добавить network watcher для auto-retry при восстановлении сети

4. **src/views/pos/shifts/ShiftManagementView.vue**

   - Добавить props: `shift?: PosShift`, `readOnly?: boolean`
   - Скрыть action buttons в read-only режиме
   - Использовать props.shift если передан (для backoffice просмотра)

5. **src/router/index.ts**

   - Добавить route `sales/shifts` для ShiftHistoryView

6. **src/stores/pos/shifts/services.ts** (если нужно)
   - Добавить `updateShift()` метод для сохранения sync tracking полей

## Критерии приемки

### Must Have ✅

- [ ] Смена закрывается даже без интернета (endShift всегда success)
- [ ] Failed sync добавляется в очередь (localStorage: `pos_sync_queue`)
- [ ] Sync queue обрабатывается при старте приложения (initializePOS)
- [ ] Sync queue обрабатывается при восстановлении сети (network watcher)
- [ ] Backoffice Shift History View создан и доступен по `/sales/shifts`
- [ ] Упрощенная таблица смен (Name, Times, Expected, Actual, Difference, Sync)
- [ ] Фильтры работают (date range, cashier)
- [ ] Можно просмотреть детали смены (dialog с ShiftManagementView)
- [ ] Можно вручную retry sync из таблицы

### Should Have 🎯

- [ ] Max sync attempts = 10 (configurable)
- [ ] Visual indicators для sync status (badges: ✅ synced / ⏳ pending / ❌ failed)
- [ ] Read-only режим в ShiftManagementView
- [ ] Sync attempt counter в shift details

### Nice to Have 💡 (Sprint 6+)

- [ ] Exponential backoff для retry
- [ ] Batch retry (retry all failed shifts)
- [ ] Централизованный SyncService (вместо queue в shiftsStore)
- [ ] Sync для других сущностей (transactions, discounts, customers)
- [ ] Export shift data to CSV/Excel

## Риски и митигация

### Риски

1. **Race condition:** Если sync queue обрабатывается дважды одновременно

   - **Митигация:** Mutex/lock механизм для processSyncQueue()

2. **LocalStorage overflow:** Если много failed shifts накапливается

   - **Митигация:** Limit queue size (max 100 items), cleanup old items

3. **Infinite retry loop:** Если sync всегда fails

   - **Митигация:** Max attempts = 10, exponential backoff

4. **Inconsistent state:** Shift closed locally but never synced
   - **Митигация:** Manual retry from Backoffice, clear error messaging

### Ограничения

1. Sync queue хранится в localStorage (не персистентен при clear data)
2. Network detection может быть неточным (navigator.onLine не всегда надежен)
3. Max 10 retry attempts (после этого нужен manual intervention)

## Timeline (ОБНОВЛЕНО - упрощенная версия)

- **Phase 1 (Offline Shift Closing):** 2-3 часа

  - Update types (30 мин)
  - Update endShift logic (1 час)
  - Update syncShiftToAccount error handling (1-1.5 часа)

- **Phase 2 (Sync Queue):** 2-3 часа

  - Sync queue helpers (1.5-2 часа)
  - Integration в posStore (30 мин - 1 час)

- **Phase 3 (Backoffice UI - УПРОЩЕННАЯ):** 2-3 часа

  - ShiftHistoryView.vue (1.5-2 часа)
  - Update ShiftManagementView read-only mode (30 мин)
  - Add route (15 мин)

- **Phase 4 (Testing):** 1-2 часа
  - Offline shift closing (30 мин)
  - Sync retry scenarios (30 мин)
  - UI testing (30 мин)

**Общее время:** 7-11 часов (~1-1.5 рабочих дня) ✅ БЫСТРЕЕ чем первоначальная оценка!

## Зависимости

- ✅ Sprint 4 завершен (syncShiftToAccount() существует)
- ✅ Network monitoring в posStore (isOnline)
- ✅ ShiftsService имеет updateShift() метод
- ✅ Account store доступен из shiftsStore

## Следующие шаги

После Sprint 5:

- **Sprint 6:** Real-time sync (WebSocket/Firebase) вместо manual retry
- **Sprint 7:** Multi-device conflict resolution
- **Sprint 8:** Advanced shift analytics & reporting
- **Sprint 9:** Shift templates & scheduling

---

## Решения принятые с пользователем ✅

1. **Роут для Shift History:** ✅ `/sales/shifts` (внутри Sales section)

2. **Доступ:** ✅ Только admin/manager

3. **Sync архитектура:** ✅ Упрощенная версия в shiftsStore (рефакторинг в Sprint 6)

4. **Таблица:** ✅ Упрощенная (как на скриншоте)

5. **Детальный просмотр:** ✅ Переиспользовать ShiftManagementView.vue

6. **Max sync attempts:** ✅ 10 попыток (manual retry после этого)

7. **Network detection:** ✅ `navigator.onLine` + watcher в posStore

8. **Sync queue cleanup:** ✅ Удалять сразу после успешной синхронизации

---

## Готово к реализации! 🚀

План согласован, архитектурные решения приняты. Можно начинать Sprint 5.

**Порядок реализации:**

1. Phase 1: Offline-capable endShift (types + store logic)
2. Phase 2: Sync queue (localStorage + retry logic)
3. Phase 3: Backoffice UI (ShiftHistoryView + read-only mode)
4. Phase 4: Testing (offline scenarios + sync retry)

---

## Quick Summary для разработчика 📋

### Что делаем:

✅ Смена закрывается ВСЕГДА (даже offline)
✅ Failed sync → localStorage queue → retry автоматически
✅ Backoffice UI для просмотра истории смен (упрощенная таблица)

### Ключевые изменения:

- **types.ts**: +4 поля (syncAttempts, lastSyncAttempt, syncError, syncQueuedAt)
- **shiftsStore.ts**: endShift не блокирует + sync queue methods (~150 строк)
- **posStore.ts**: processSyncQueue on startup + network watcher (~30 строк)
- **ShiftHistoryView.vue**: простая таблица + dialog (~250 строк)
- **ShiftManagementView.vue**: props для read-only mode (~20 строк)
- **router.ts**: новый route `/sales/shifts` (5 строк)

### Timeline: 7-11 часов (~1-1.5 дня)

Переходим к реализации? 🎯
