# 7. Repository Pattern Implementation - Sprint Plan

**Дата создания**: 2025-11-03
**Статус**: Planning
**Базовый документ**: [6_Repository.md](./6_Repository.md)

## Текущее состояние системы

### ✅ Реализовано (Phase 0 - Infrastructure Foundation)

**Базовая инфраструктура** (`src/repositories/base/`):

- ✅ `IRepository.ts` - интерфейсы репозиториев
  - `IRepository<T>` - базовый CRUD
  - `IExtendedRepository<T>` - batch операции и пагинация
  - `ISyncableRepository<T>` - синхронизация
  - `ICacheableRepository<T>` - кэширование
- ✅ `LocalStorageRepository.ts` - полная реализация
- ✅ `ServiceResponse.ts` - стандартизированные ответы
- ✅ `RepositoryFactory` + `useRepository()` composable
- ✅ Environment configuration в `src/config/environment.ts`

**POS Store структура**:

- ✅ `src/stores/pos/index.ts` - координатор POS системы
- ✅ Модульная структура: orders/, tables/, payments/, shifts/
- ✅ Паттерн: store + services + composables + types

### ❌ Проблемы для решения

**Orders Store** (`ordersStore.ts` - 885 строк):

- ❌ Не использует Repository Pattern (прямая работа с localStorage через `OrdersService`)
- ❌ Переусложненная логика в store (должна быть в repository)
- ❌ 21 TODO комментариев (интеграции отложены)
- ❌ Методы `sendToKitchen`, `closeOrder` работают, но неоптимальны
- ❌ `DepartmentNotificationService` - сложный, возможно избыточный

**Tables Store**:

- ❌ Использует `services.ts` вместо Repository
- ❌ TODO: "Заменить на API вызов"

**Общие проблемы**:

- ❌ Нет menuPosStore для offline кэширования меню
- ❌ Нет синхронизации для offline-first режима
- ❌ localStorage структура неоптимальна

---

## SPRINT 1: Orders Store Simplification

**Продолжительность**: 3-5 дней
**Приоритет**: High
**Зависимости**: Phase 0 (выполнен)

### Цели

1. Упростить `ordersStore.ts` с 885 до ~400-500 строк
2. Удалить неиспользуемые и дублирующие методы
3. Вынести бизнес-логику из store в composables
4. Подготовить store к миграции на Repository Pattern

### Задачи

#### 1.1 Audit Orders Store

**Файлы для анализа**:

- `src/stores/pos/orders/ordersStore.ts` (885 строк)
- `src/stores/pos/orders/services.ts`
- `src/stores/pos/orders/composables/useOrders.ts`
- `src/stores/pos/orders/composables/useOrderCalculations.ts`
- `src/stores/pos/service/DepartmentNotificationService.ts`

**Что искать**:

- Неиспользуемые методы (grep в src/views/pos/)
- Дублирующая логика между store и composables
- Сложные вычисления, которые можно вынести
- TODO комментарии - какие актуальны, какие можно убрать

**Результат**: Документ с классификацией методов:

- 🟢 Essential (оставить)
- 🟡 Refactor (переделать)
- 🔴 Remove (удалить)

#### 1.2 Упростить selection logic

**Проблема**: `ordersStore` управляет selection (selectedItems, selectedBills, toggleSelection)

**Решение**: Вынести в отдельный composable

```typescript
// src/stores/pos/orders/composables/useOrderSelection.ts
export function useOrderSelection() {
  const selectedItems = ref<Set<string>>(new Set())
  const selectedBills = ref<Set<string>>(new Set())

  function toggleItemSelection(itemId: string) { ... }
  function toggleBillSelection(billId: string) { ... }
  function clearSelection() { ... }

  return { selectedItems, selectedBills, toggleItemSelection, ... }
}
```

**Изменения в ordersStore**:

- Удалить selection state и методы
- Компоненты будут использовать `useOrderSelection()` напрямую

#### 1.3 Упростить calculations

**Проблема**: Методы `recalculateOrderTotals`, `calculateOrderStatus`, `determineStatusByOrderType` в store

**Решение**: Переместить в `useOrderCalculations`

```typescript
// src/stores/pos/orders/composables/useOrderCalculations.ts
export function useOrderCalculations() {
  function recalculateOrderTotals(order: PosOrder): PosOrder { ... }
  function calculateOrderStatus(order: PosOrder): OrderStatus { ... }
  function calculatePaymentStatus(order: PosOrder): OrderPaymentStatus { ... }

  return { recalculateOrderTotals, calculateOrderStatus, ... }
}
```

#### 1.4 Refactor DepartmentNotificationService

**Анализ использования**:

```bash
grep -r "DepartmentNotificationService\|departmentNotificationService" src/
```

**Варианты**:

- Если используется → упростить, убрать избыточную логику
- Если не используется → удалить или заглушить (TODO: implement later)

**Решение**: Минимальный интерфейс

```typescript
// src/stores/pos/orders/services/notificationService.ts
export const notificationService = {
  async notifyKitchen(order: PosOrder, items: PosBillItem[]): Promise<boolean> {
    // TODO: Real implementation
    console.log('Kitchen notification:', { order, items })
    return true
  }
}
```

#### 1.5 Cleanup TODOs

**21 TODO комментариев** - разобрать каждый:

- Интеграции с authStore/accountStore → создать issues для будущих спринтов
- "TODO: реализовать" → либо реализовать сейчас, либо убрать
- "TODO: Интеграция с реальным store" → удалить (mock заглушки убрать)

### Критерии приемки

✅ **Размер файлов**:

- `ordersStore.ts`: < 500 строк (было 885)
- Selection logic вынесена в composable
- Calculations вынесены в composable

✅ **Code quality**:

- Нет дублирования логики
- Каждый метод имеет одну ответственность
- TODO комментарии актуальны или удалены

✅ **Функциональность**:

- Все существующие функции работают
- Tests проходят (если есть)
- POS интерфейс работает без регрессий

✅ **Готовность к миграции**:

- Четкое разделение: store (state) vs service (persistence)
- Методы store работают с ServiceResponse<T>
- localStorage операции изолированы в service

---

## SPRINT 2: Orders Repository Migration

**Продолжительность**: 5-7 дней
**Приоритет**: High
**Зависимости**: Sprint 1 (completed)

### Цели

1. Создать `OrdersRepository` на базе Repository Pattern
2. Заменить `OrdersService` на `OrdersRepository` в `ordersStore`
3. Оптимизировать localStorage структуру (можем ломать совместимость)
4. Добавить поддержку nested entities (bills, items)

### Архитектура

**Текущая структура localStorage**:

```
pos_orders: Order[] - массив заказов
pos_bills: Bill[] - массив счетов (отдельно?)
pos_bill_items: BillItem[] - массив позиций (отдельно?)
```

**Новая структура** (нормализованная):

```
kitchen-app:pos:orders - Order[] (без nested bills)
kitchen-app:pos:bills - Bill[] (с orderId reference)
kitchen-app:pos:bill-items - BillItem[] (с billId reference)
kitchen-app:pos:meta - { version, lastSync, etc. }
```

Или **денормализованная** (проще для offline):

```
kitchen-app:pos:orders - Order[] (с вложенными bills и items)
```

**Решение**: Используем денормализованный подход для POS (offline-first priority)

### Задачи

#### 2.1 Создать OrdersRepository интерфейс

**Файл**: `src/repositories/orders/IOrdersRepository.ts`

```typescript
import type { IRepository, ServiceResponse } from '@/repositories/base'
import type { PosOrder, OrderFilters, OrderType, OrderStatus } from '@/stores/pos/types'

/**
 * Репозиторий для POS заказов
 */
export interface IOrdersRepository extends IRepository<PosOrder> {
  /**
   * Найти активные заказы (не завершенные, не отмененные)
   */
  findActiveOrders(): Promise<ServiceResponse<PosOrder[]>>

  /**
   * Найти заказы за сегодня
   */
  findTodayOrders(): Promise<ServiceResponse<PosOrder[]>>

  /**
   * Найти заказы по столу
   */
  findByTableId(tableId: string): Promise<ServiceResponse<PosOrder[]>>

  /**
   * Найти заказы с фильтрами
   */
  findWithFilters(filters: OrderFilters): Promise<ServiceResponse<PosOrder[]>>

  /**
   * Обновить статус заказа
   */
  updateStatus(orderId: string, status: OrderStatus): Promise<ServiceResponse<PosOrder>>

  /**
   * Закрыть заказ (перевести в финальный статус)
   */
  closeOrder(orderId: string): Promise<ServiceResponse<PosOrder>>
}
```

#### 2.2 Реализовать LocalOrdersRepository

**Файл**: `src/repositories/orders/LocalOrdersRepository.ts`

```typescript
import { LocalStorageRepository } from '@/repositories/base'
import type { IOrdersRepository } from './IOrdersRepository'
import type { PosOrder, OrderFilters } from '@/stores/pos/types'

export class LocalOrdersRepository
  extends LocalStorageRepository<PosOrder>
  implements IOrdersRepository
{
  constructor() {
    super('pos:orders', {
      storagePrefix: 'kitchen-app',
      enableCache: false,
      debug: import.meta.env.DEV
    })
  }

  async findActiveOrders(): Promise<ServiceResponse<PosOrder[]>> {
    const finalStatuses = ['served', 'collected', 'delivered', 'cancelled']

    return this.findWhere({
      // Orders not in final status OR unpaid
    })
  }

  async findTodayOrders(): Promise<ServiceResponse<PosOrder[]>> {
    const today = new Date().toISOString().split('T')[0]
    const result = await this.findAll()

    if (!result.success) return result

    const todayOrders = result.data!.filter(order => order.createdAt.startsWith(today))

    return ResponseFactory.success(todayOrders, 'local')
  }

  async findByTableId(tableId: string): Promise<ServiceResponse<PosOrder[]>> {
    return this.findWhere({ tableId } as any)
  }

  async findWithFilters(filters: OrderFilters): Promise<ServiceResponse<PosOrder[]>> {
    const result = await this.findAll()
    if (!result.success) return result

    let orders = result.data!

    // Apply filters (type, status, tableId, search)
    if (filters.type) {
      orders = orders.filter(o => o.type === filters.type)
    }

    if (filters.status) {
      orders = orders.filter(o => o.status === filters.status)
    }

    if (filters.tableId) {
      orders = orders.filter(o => o.tableId === filters.tableId)
    }

    if (filters.search) {
      const search = filters.search.toLowerCase()
      orders = orders.filter(
        o =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.customerName?.toLowerCase().includes(search)
      )
    }

    return ResponseFactory.success(orders, 'local')
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<ServiceResponse<PosOrder>> {
    return this.update(orderId, { status } as any)
  }

  async closeOrder(orderId: string): Promise<ServiceResponse<PosOrder>> {
    const order = await this.findById(orderId)
    if (!order.success || !order.data) {
      return ResponseFactory.error('Order not found')
    }

    // Business logic for closing order
    const closedOrder: PosOrder = {
      ...order.data,
      status: 'collected', // or 'served' based on type
      closedAt: new Date().toISOString()
    }

    return this.save(closedOrder)
  }
}
```

#### 2.3 Создать RepositoryFactory для POS

**Файл**: `src/repositories/orders/index.ts`

```typescript
import { LocalOrdersRepository } from './LocalOrdersRepository'
import type { IOrdersRepository } from './IOrdersRepository'

export type { IOrdersRepository } from './IOrdersRepository'
export { LocalOrdersRepository } from './LocalOrdersRepository'

/**
 * Factory для создания OrdersRepository
 */
export function createOrdersRepository(): IOrdersRepository {
  // В будущем можем добавить APIOrdersRepository, FirebaseOrdersRepository
  return new LocalOrdersRepository()
}

/**
 * Composable для использования в stores/components
 */
export function useOrdersRepository() {
  const repository = createOrdersRepository()
  return repository
}
```

#### 2.4 Migрировать ordersStore на Repository

**Изменения в** `src/stores/pos/orders/ordersStore.ts`:

```typescript
// БЫЛО:
import { OrdersService } from './services'
const ordersService = new OrdersService()

// СТАЛО:
import { useOrdersRepository } from '@/repositories/orders'
const ordersRepository = useOrdersRepository()

// БЫЛО:
async function loadOrders(): Promise<ServiceResponse<PosOrder[]>> {
  try {
    loading.value.list = true
    const response = await ordersService.getAllOrders()

    if (response.success && response.data) {
      orders.value = response.data
    }

    return response
  } catch (err) {
    // error handling
  } finally {
    loading.value.list = false
  }
}

// СТАЛО:
async function loadOrders(): Promise<ServiceResponse<PosOrder[]>> {
  try {
    loading.value.list = true
    const response = await ordersRepository.findAll()

    if (response.success && response.data) {
      orders.value = response.data
    }

    return response
  } catch (err) {
    // error handling
  } finally {
    loading.value.list = false
  }
}

// БЫЛО:
async function createOrder(
  type: OrderType,
  tableId?: string,
  customerName?: string
): Promise<ServiceResponse<PosOrder>> {
  try {
    loading.value.create = true
    const response = await ordersService.createOrder(type, tableId, customerName)

    if (response.success && response.data) {
      orders.value.push(response.data)
      selectOrder(response.data.id)
    }

    return response
  } catch (err) {
    // error handling
  }
}

// СТАЛО:
async function createOrder(
  type: OrderType,
  tableId?: string,
  customerName?: string
): Promise<ServiceResponse<PosOrder>> {
  try {
    loading.value.create = true

    // Создаем объект заказа
    const newOrder: Omit<PosOrder, 'id' | 'createdAt' | 'updatedAt'> = {
      orderNumber: generateOrderNumber(),
      type,
      tableId,
      customerName,
      status: 'pending',
      paymentStatus: 'unpaid',
      bills: [],
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      finalAmount: 0,
      notes: ''
    }

    const response = await ordersRepository.create(newOrder)

    if (response.success && response.data) {
      orders.value.push(response.data)
      selectOrder(response.data.id)
    }

    return response
  } catch (err) {
    // error handling
  }
}
```

**Удалить**: `src/stores/pos/orders/services.ts` (больше не нужен)

#### 2.5 Обновить localStorage структуру

**Migration strategy**:

1. Определить версию схемы в meta
2. При загрузке проверять версию
3. Если старая версия → мигрировать данные
4. Сохранить новую версию

```typescript
// src/repositories/orders/migrations.ts
export async function migrateOrdersStorage(): Promise<void> {
  const OLD_KEY = 'pos_orders'
  const NEW_KEY = 'kitchen-app:pos:orders'
  const META_KEY = 'kitchen-app:pos:meta'

  // Проверяем версию
  const metaStr = localStorage.getItem(META_KEY)
  const meta = metaStr ? JSON.parse(metaStr) : { version: 0 }

  if (meta.version >= 1) {
    console.log('✅ Storage already migrated')
    return
  }

  console.log('🔄 Migrating orders storage from v0 to v1...')

  // Загружаем старые данные
  const oldData = localStorage.getItem(OLD_KEY)
  if (oldData) {
    const orders = JSON.parse(oldData)

    // Сохраняем в новый формат
    localStorage.setItem(NEW_KEY, JSON.stringify(orders))

    // Удаляем старые ключи
    localStorage.removeItem(OLD_KEY)
    localStorage.removeItem('pos_bills')
    localStorage.removeItem('pos_bill_items')
  }

  // Обновляем версию
  localStorage.setItem(
    META_KEY,
    JSON.stringify({
      version: 1,
      migratedAt: new Date().toISOString()
    })
  )

  console.log('✅ Migration completed')
}
```

**Вызов миграции** в `posStore.initializePOS()`:

```typescript
async function initializePOS(): Promise<ServiceResponse<void>> {
  try {
    // Мигрируем storage если нужно
    await migrateOrdersStorage()

    // Остальная инициализация...
  } catch (err) {
    // error handling
  }
}
```

### Критерии приемки

✅ **Repository реализован**:

- `IOrdersRepository` интерфейс определен
- `LocalOrdersRepository` полностью реализован
- `createOrdersRepository()` factory создан
- Все методы покрыты документацией

✅ **ordersStore мигрирован**:

- Использует `ordersRepository` вместо `ordersService`
- `services.ts` удален
- Все методы работают через repository API
- Store остается state container (не business logic)

✅ **localStorage оптимизирован**:

- Новая структура: `kitchen-app:pos:orders`
- Migration скрипт работает
- Старые данные сохранены (для dev/test)
- Версионирование схемы

✅ **Функциональность**:

- Все CRUD операции работают
- Filtered queries работают (active, today, by table)
- POS интерфейс работает без регрессий
- Performance не ухудшился

✅ **Code quality**:

- Repository паттерн правильно применен
- Separation of concerns соблюден
- TypeScript типы корректны
- Нет дублирования кода

---

## SPRINT 3: Tables Repository Migration

**Продолжительность**: 3-4 дня
**Приоритет**: Medium
**Зависимости**: Sprint 2 (completed)

### Цели

1. Создать `TablesRepository` по аналогии с OrdersRepository
2. Упростить `tablesStore` (заменить services.ts на repository)
3. Оптимизировать localStorage для tables

### Задачи

#### 3.1 Создать TablesRepository

**Файл**: `src/repositories/tables/ITablesRepository.ts`

```typescript
import type { IRepository, ServiceResponse } from '@/repositories/base'
import type { PosTable, TableStatus } from '@/stores/pos/types'

export interface ITablesRepository extends IRepository<PosTable> {
  /**
   * Найти доступные столы (available, reserved)
   */
  findAvailableTables(): Promise<ServiceResponse<PosTable[]>>

  /**
   * Найти занятые столы (occupied)
   */
  findOccupiedTables(): Promise<ServiceResponse<PosTable[]>>

  /**
   * Найти столы по статусу
   */
  findByStatus(status: TableStatus): Promise<ServiceResponse<PosTable[]>>

  /**
   * Найти стол по номеру
   */
  findByNumber(number: string): Promise<ServiceResponse<PosTable | null>>

  /**
   * Обновить статус стола
   */
  updateStatus(tableId: string, status: TableStatus): Promise<ServiceResponse<PosTable>>

  /**
   * Освободить стол (доступен для новых заказов)
   */
  freeTable(tableId: string): Promise<ServiceResponse<PosTable>>

  /**
   * Занять стол (создан заказ)
   */
  occupyTable(tableId: string, orderId: string): Promise<ServiceResponse<PosTable>>
}
```

#### 3.2 Реализовать LocalTablesRepository

**Файл**: `src/repositories/tables/LocalTablesRepository.ts`

Аналогично `LocalOrdersRepository`, наследуем `LocalStorageRepository<PosTable>` и реализуем специфичные методы.

#### 3.3 Мигрировать tablesStore

**Изменения**:

- Заменить `services.ts` на `useTablesRepository()`
- Упростить методы store
- Удалить дублирование логики

**Удалить**: `src/stores/pos/tables/services.ts`

#### 3.4 localStorage структура

**Ключ**: `kitchen-app:pos:tables`

**Migration**: Если есть старые данные (`pos_tables`) → мигрировать

### Критерии приемки

✅ **Repository реализован**:

- `ITablesRepository` + `LocalTablesRepository`
- Factory и composable созданы

✅ **tablesStore мигрирован**:

- Использует repository
- `services.ts` удален
- Логика упрощена

✅ **Функциональность**:

- Все операции со столами работают
- Фильтрация по статусу работает
- POS интерфейс (TablesSidebar) работает

---

## SPRINT 4: Menu POS Repository & Offline Support

**Продолжительность**: 5-6 дней
**Приоритет**: High
**Зависимости**: Sprint 2, Sprint 3 (completed)

### Цели

1. Создать `menuPosStore` для кэширования меню в POS режиме
2. Реализовать `MenuPosRepository` с поддержкой кэширования
3. Добавить offline support для POS (работа без интернета)
4. Синхронизация с основным `menuStore` (backoffice)

### Проблема

**Текущая ситуация**:

- POS использует `menuStore` (backoffice menu)
- `menuStore` загружается из Firebase/API (online-first)
- Если нет интернета → POS не работает (нет меню)

**Решение**:

- POS использует `menuPosStore` (отдельный store для кэша)
- `menuPosStore` хранит меню в localStorage (offline-first)
- Синхронизация: backoffice menu → menuPosStore (по расписанию или вручную)

### Архитектура

```
┌─────────────────┐         ┌──────────────────┐
│   menuStore     │────────▶│   Firebase/API   │
│  (Backoffice)   │         │   (Online menu)  │
└─────────────────┘         └──────────────────┘
        │
        │ Sync (manual/scheduled)
        ▼
┌─────────────────┐         ┌──────────────────┐
│  menuPosStore   │────────▶│   localStorage   │
│     (POS)       │         │  (Cached menu)   │
└─────────────────┘         └──────────────────┘
```

### Задачи

#### 4.1 Создать MenuPosRepository

**Файл**: `src/repositories/menu/IMenuPosRepository.ts`

```typescript
import type { ICacheableRepository, ServiceResponse } from '@/repositories/base'
import type { PosMenuItem } from '@/stores/pos/types'

export interface IMenuPosRepository extends ICacheableRepository<PosMenuItem> {
  /**
   * Найти доступные элементы меню (isAvailable = true)
   */
  findAvailableItems(): Promise<ServiceResponse<PosMenuItem[]>>

  /**
   * Найти элементы по категории
   */
  findByCategory(categoryId: string): Promise<ServiceResponse<PosMenuItem[]>>

  /**
   * Синхронизировать с основным меню
   */
  syncFromMainMenu(items: PosMenuItem[]): Promise<ServiceResponse<void>>

  /**
   * Получить timestamp последней синхронизации
   */
  getLastSyncTime(): Promise<ServiceResponse<string | null>>
}
```

#### 4.2 Реализовать LocalMenuPosRepository

**Файл**: `src/repositories/menu/LocalMenuPosRepository.ts`

```typescript
import { LocalStorageRepository, ResponseFactory } from '@/repositories/base'
import type { IMenuPosRepository } from './IMenuPosRepository'
import type { PosMenuItem } from '@/stores/pos/types'

export class LocalMenuPosRepository
  extends LocalStorageRepository<PosMenuItem>
  implements IMenuPosRepository
{
  private readonly META_KEY = 'kitchen-app:pos:menu:meta'

  constructor() {
    super('pos:menu', {
      storagePrefix: 'kitchen-app',
      enableCache: true,
      cacheTTL: 3600, // 1 hour
      debug: import.meta.env.DEV
    })
  }

  async findAvailableItems(): Promise<ServiceResponse<PosMenuItem[]>> {
    const result = await this.findAll()
    if (!result.success) return result

    const available = result.data!.filter(item => item.isAvailable)
    return ResponseFactory.success(available, 'cache')
  }

  async findByCategory(categoryId: string): Promise<ServiceResponse<PosMenuItem[]>> {
    return this.findWhere({ categoryId } as any)
  }

  async syncFromMainMenu(items: PosMenuItem[]): Promise<ServiceResponse<void>> {
    try {
      // Clear existing cache
      await this.clearCache()

      // Save new items
      for (const item of items) {
        await this.save(item)
      }

      // Update sync timestamp
      const meta = {
        lastSync: new Date().toISOString(),
        itemsCount: items.length
      }
      localStorage.setItem(this.META_KEY, JSON.stringify(meta))

      return ResponseFactory.success(undefined, 'local')
    } catch (error) {
      return ResponseFactory.error(`Sync failed: ${error}`)
    }
  }

  async getLastSyncTime(): Promise<ServiceResponse<string | null>> {
    try {
      const metaStr = localStorage.getItem(this.META_KEY)
      const meta = metaStr ? JSON.parse(metaStr) : null

      return ResponseFactory.success(meta?.lastSync || null, 'local')
    } catch (error) {
      return ResponseFactory.error(`Failed to get sync time: ${error}`)
    }
  }

  // ICacheableRepository implementation
  async clearCache(): Promise<ServiceResponse<void>> {
    try {
      const storageKey = this.getStorageKey()
      localStorage.removeItem(storageKey)
      return ResponseFactory.success(undefined, 'local')
    } catch (error) {
      return ResponseFactory.error(`Failed to clear cache: ${error}`)
    }
  }

  async clearCacheFor(id: string): Promise<ServiceResponse<void>> {
    return this.delete(id)
  }

  async getCacheStats(): Promise<
    ServiceResponse<{
      size: number
      hitRate: number
      lastCleared?: string
    }>
  > {
    try {
      const result = await this.findAll()
      const size = result.success ? result.data!.length : 0

      const metaStr = localStorage.getItem(this.META_KEY)
      const meta = metaStr ? JSON.parse(metaStr) : {}

      return ResponseFactory.success(
        {
          size,
          hitRate: 0, // TODO: implement hit rate tracking
          lastCleared: meta.lastSync
        },
        'local'
      )
    } catch (error) {
      return ResponseFactory.error(`Failed to get cache stats: ${error}`)
    }
  }
}
```

#### 4.3 Создать menuPosStore

**Файл**: `src/stores/pos/menu/menuPosStore.ts`

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMenuPosRepository } from '@/repositories/menu'
import type { PosMenuItem } from '../types'
import type { ServiceResponse } from '@/repositories/base'

export const useMenuPosStore = defineStore('menuPos', () => {
  // ===== STATE =====
  const items = ref<PosMenuItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastSync = ref<string | null>(null)
  const initialized = ref(false)

  // ===== REPOSITORY =====
  const repository = useMenuPosRepository()

  // ===== COMPUTED =====
  const availableItems = computed(() => items.value.filter(item => item.isAvailable))

  const itemsByCategory = computed(() => {
    const map = new Map<string, PosMenuItem[]>()

    items.value.forEach(item => {
      if (!map.has(item.categoryId)) {
        map.set(item.categoryId, [])
      }
      map.get(item.categoryId)!.push(item)
    })

    return map
  })

  const isStale = computed(() => {
    if (!lastSync.value) return true

    const syncTime = new Date(lastSync.value).getTime()
    const now = Date.now()
    const hoursSinceSync = (now - syncTime) / (1000 * 60 * 60)

    // Считаем устаревшим если > 24 часов
    return hoursSinceSync > 24
  })

  // ===== ACTIONS =====

  /**
   * Инициализация - загрузить кэш из localStorage
   */
  async function initialize(): Promise<ServiceResponse<void>> {
    if (initialized.value) {
      return { success: true }
    }

    try {
      loading.value = true
      error.value = null

      // Загружаем items из кэша
      const result = await repository.findAll()

      if (result.success && result.data) {
        items.value = result.data
      }

      // Получаем время последней синхронизации
      const syncResult = await repository.getLastSyncTime()
      if (syncResult.success && syncResult.data) {
        lastSync.value = syncResult.data
      }

      initialized.value = true

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize menu'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value = false
    }
  }

  /**
   * Синхронизировать с основным меню (из menuStore)
   */
  async function syncFromMainMenu(menuItems: PosMenuItem[]): Promise<ServiceResponse<void>> {
    try {
      loading.value = true
      error.value = null

      const result = await repository.syncFromMainMenu(menuItems)

      if (result.success) {
        items.value = menuItems
        lastSync.value = new Date().toISOString()
      }

      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sync failed'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value = false
    }
  }

  /**
   * Получить items по категории
   */
  function getItemsByCategory(categoryId: string): PosMenuItem[] {
    return itemsByCategory.value.get(categoryId) || []
  }

  /**
   * Найти item по ID
   */
  function findItemById(itemId: string): PosMenuItem | undefined {
    return items.value.find(item => item.id === itemId)
  }

  /**
   * Очистить кэш
   */
  async function clearCache(): Promise<ServiceResponse<void>> {
    try {
      const result = await repository.clearCache()

      if (result.success) {
        items.value = []
        lastSync.value = null
      }

      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clear cache'
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Получить статистику кэша
   */
  async function getCacheStats() {
    return repository.getCacheStats()
  }

  // ===== RETURN =====

  return {
    // State
    items,
    loading,
    error,
    lastSync,
    initialized,

    // Computed
    availableItems,
    itemsByCategory,
    isStale,

    // Actions
    initialize,
    syncFromMainMenu,
    getItemsByCategory,
    findItemById,
    clearCache,
    getCacheStats
  }
})
```

#### 4.4 Интеграция с PosMainView

**Изменения в** `src/views/pos/PosMainView.vue`:

```typescript
import { useMenuPosStore } from '@/stores/pos/menu/menuPosStore'

const menuPosStore = useMenuPosStore()

const initializePOS = async (): Promise<void> => {
  try {
    isLoading.value = true

    // 1. Initialize POS system
    const posResult = await posStore.initializePOS()
    if (!posResult.success) {
      throw new Error(posResult.error)
    }

    // 2. Initialize menu cache
    const menuResult = await menuPosStore.initialize()
    if (!menuResult.success) {
      throw new Error(menuResult.error)
    }

    // 3. Check if menu is stale
    if (menuPosStore.isStale) {
      console.warn('⚠️ Menu cache is stale (>24h). Consider syncing.')
      // TODO: Show notification to sync menu
    }

    // 4. Check if menu is empty
    if (menuPosStore.items.length === 0) {
      throw new Error('Menu cache is empty. Please sync menu from backoffice.')
    }

    isInitialized.value = true
  } catch (error) {
    initError.value = error.message
  } finally {
    isLoading.value = false
  }
}
```

**MenuSection использует menuPosStore**:

```typescript
// src/views/pos/menu/MenuSection.vue
import { useMenuPosStore } from '@/stores/pos/menu/menuPosStore'

const menuPosStore = useMenuPosStore()

// Use cached menu items
const menuItems = computed(() => menuPosStore.availableItems)
```

#### 4.5 Синхронизация меню (Backoffice → POS)

**Добавить кнопку синхронизации в Backoffice**:

```vue
<!-- src/views/menu/MenuView.vue -->
<template>
  <v-container>
    <v-row>
      <v-col>
        <h1>Menu Management</h1>

        <!-- Sync to POS button -->
        <v-btn color="primary" :loading="syncing" @click="syncMenuToPos">
          <v-icon left>mdi-sync</v-icon>
          Sync to POS
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { useMenuPosStore } from '@/stores/pos/menu/menuPosStore'

const menuStore = useMenuStore()
const menuPosStore = useMenuPosStore()
const syncing = ref(false)

async function syncMenuToPos() {
  try {
    syncing.value = true

    // Convert menu items to PosMenuItem format
    const posMenuItems = menuStore.items.map(item => ({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      price: item.price,
      isAvailable: item.isActive,
      description: item.description,
      imageUrl: item.imageUrl,
      variants: item.variants?.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
        isAvailable: v.isActive
      })),
      modifications: []
    }))

    const result = await menuPosStore.syncFromMainMenu(posMenuItems)

    if (result.success) {
      alert('Menu synced to POS successfully!')
    } else {
      alert(`Sync failed: ${result.error}`)
    }
  } catch (error) {
    console.error('Sync error:', error)
    alert('Sync failed')
  } finally {
    syncing.value = false
  }
}
</script>
```

### Критерии приемки

✅ **MenuPosRepository реализован**:

- `IMenuPosRepository` + `LocalMenuPosRepository`
- Кэширование работает (localStorage)
- Cache stats доступны

✅ **menuPosStore создан**:

- Инициализация загружает кэш
- `isStale` определяет устаревшие данные
- Методы `syncFromMainMenu`, `clearCache` работают

✅ **POS offline support**:

- POS запускается без интернета (если кэш заполнен)
- MenuSection использует `menuPosStore` вместо `menuStore`
- Ошибка если кэш пустой (с инструкцией синхронизации)

✅ **Синхронизация**:

- Кнопка "Sync to POS" в backoffice
- Синхронизация обновляет кэш
- Timestamp последней синхронизации отображается

✅ **Функциональность**:

- POS работает с кэшированным меню
- Добавление items в заказ работает
- Performance не ухудшился

---

## SPRINT 5: Payments & Shifts Repository (Optional)

**Продолжительность**: 4-5 дней
**Приоритет**: Low
**Зависимости**: Sprint 2, Sprint 3 (completed)

### Цели

1. Завершить миграцию всех POS модулей на Repository Pattern
2. `paymentsStore` → PaymentsRepository
3. `shiftsStore` → ShiftsRepository

### Задачи

#### 5.1 PaymentsRepository

- Аналогично OrdersRepository
- localStorage ключ: `kitchen-app:pos:payments`

#### 5.2 ShiftsRepository

- Аналогично OrdersRepository
- localStorage ключ: `kitchen-app:pos:shifts`

### Критерии приемки

✅ Все POS stores используют Repository Pattern
✅ Единый подход к persistence
✅ Все localStorage ключи унифицированы

---

## Дополнительные задачи

### Тестирование

Для каждого спринта добавить:

1. **Unit tests** для repositories:

```typescript
// src/repositories/orders/__tests__/LocalOrdersRepository.spec.ts
describe('LocalOrdersRepository', () => {
  let repository: LocalOrdersRepository

  beforeEach(() => {
    localStorage.clear()
    repository = new LocalOrdersRepository()
  })

  describe('findActiveOrders', () => {
    it('should return orders not in final status', async () => {
      // test implementation
    })
  })

  describe('findTodayOrders', () => {
    it('should return orders created today', async () => {
      // test implementation
    })
  })
})
```

2. **Integration tests** для stores с repositories

3. **E2E tests** для POS workflows

### Документация

1. **API Documentation** для каждого repository
2. **Migration guides** для разработчиков
3. **Architecture diagrams** обновить в CLAUDE.md

### Performance optimization

1. **Batching** для множественных операций
2. **Caching** для часто используемых queries
3. **Debouncing** для save operations

---

## Timeline & Dependencies

```
Week 1: Sprint 1 (Orders Store Simplification)
  └─ Prepare codebase for migration

Week 2-3: Sprint 2 (Orders Repository Migration)
  └─ Core repository pattern established

Week 3-4: Sprint 3 (Tables Repository)
  └─ Parallel with Sprint 2 completion

Week 4-5: Sprint 4 (Menu POS & Offline)
  ├─ Depends on: Sprint 2 ✓
  └─ Critical for offline-first mode

Week 6: Sprint 5 (Payments & Shifts) - Optional
  └─ Complete migration

Week 7: Testing, optimization, documentation
```

---

## Risks & Mitigation

### Risk 1: Breaking changes in localStorage structure

**Impact**: High
**Mitigation**:

- Migration scripts for all changes
- Version tracking in meta
- Rollback capability

### Risk 2: Performance degradation

**Impact**: Medium
**Mitigation**:

- Benchmark before/after
- Optimize repository queries
- Add caching where needed

### Risk 3: Complex nested entities (bills, items)

**Impact**: Medium
**Mitigation**:

- Choose denormalized structure (simpler for POS)
- Document relationships clearly
- Test extensively

### Risk 4: Offline sync conflicts

**Impact**: Medium
**Mitigation**:

- Conflict resolution strategy (last-write-wins for POS)
- Manual conflict resolution UI (future)
- Logging all sync operations

---

## Success Metrics

After all sprints completed:

✅ **Code Quality**:

- Repository Pattern applied consistently
- Store files < 500 lines each
- No direct localStorage usage in stores
- TypeScript strict mode compliance

✅ **Performance**:

- Load time < 1s for POS initialization
- CRUD operations < 100ms
- No memory leaks
- Smooth UI interactions

✅ **Functionality**:

- All existing features work
- No regressions in POS workflows
- Offline mode works (when menu cached)
- Data persistence reliable

✅ **Maintainability**:

- Clear separation of concerns
- Easy to add new features
- Easy to switch storage backend (localStorage → API)
- Well documented

---

## Next Steps

После завершения всех спринтов:

1. **API Integration**: Заменить localStorage на API endpoints
2. **Sync Service**: Реализовать фоновую синхронизацию
3. **Conflict Resolution**: UI для разрешения конфликтов
4. **Real-time Updates**: WebSocket для live updates
5. **Mobile Optimization**: Capacitor storage для мобильных устройств

---

**Статус документа**: Ready for implementation
**Автор**: Claude Code AI
**Дата последнего обновления**: 2025-11-03
