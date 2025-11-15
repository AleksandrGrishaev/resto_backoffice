# Kitchen Interface - Sprint 1

## Overview

Создание нового интерфейса **Kitchen** для управления кухонными заказами. Это третий основной интерфейс приложения (после Backoffice и POS), предназначенный для поваров и кухонного персонала.

**Цель**: Повара должны видеть поступающие заказы из POS, управлять статусами приготовления, и иметь доступ к информации о полуфабрикатах (Preparation).

## Team Coordination

**⚠️ ВАЖНО**: Kitchen Sprint 1 разрабатывается **параллельно** с Supabase Order Sync.

### Parallel Work Streams

**Team A (Backend)**: Supabase Order Synchronization

- Migrate orders from localStorage → Supabase
- Implement real-time sync for POS orders
- Create Supabase schema for orders table
- Add conflict resolution strategy

**Team B (Frontend - Kitchen)**: Kitchen UI & Logic

- Build Kitchen interface (views + components)
- Create Kitchen composables (useKitchenOrders)
- Implement status management UI
- Use **localStorage temporarily** (same as current POS)

### Integration Timeline

```
Week 1-2: Parallel Development
┌────────────────────┐         ┌────────────────────┐
│  Team A (Backend)  │         │ Team B (Kitchen)   │
│  - Supabase schema │         │ - Kitchen UI       │
│  - Sync service    │         │ - Composables      │
│  - Migrations      │         │ - Status logic     │
└────────────────────┘         └────────────────────┘
         ↓                               ↓
Week 3: Integration
┌──────────────────────────────────────────────────┐
│  Kitchen + Supabase Sync                         │
│  - Replace localStorage with Supabase calls      │
│  - Test multi-device synchronization             │
│  - Enable polling/realtime updates               │
└──────────────────────────────────────────────────┘
```

### Kitchen Sprint 1 Approach

**Phase 1 (Weeks 1-2)**: Kitchen works with **localStorage** (current POS approach)

```typescript
// Kitchen использует posOrdersStore как есть
const posOrdersStore = usePosOrdersStore()
// ↑ сейчас работает с localStorage
```

**Phase 2 (Week 3)**: Switch to **Supabase** when ready

```typescript
// POS store обновится на Supabase
// Kitchen автоматически получит Supabase через posOrdersStore
// ✅ Нет изменений в Kitchen коде!
```

**Преимущество**: Kitchen UI можно разрабатывать **независимо** от Supabase миграции.

---

## Architecture

### Принципы архитектуры

Kitchen интерфейс следует той же архитектурной модели, что и POS:

1. **Single Repository + Role-based UI**: Один код, разные варианты развертывания
2. **Dedicated Store**: `src/stores/kitchen/` - изолированное хранилище данных
3. **Dedicated Views**: `src/views/kitchen/` - независимые компоненты интерфейса
4. **Custom Layout**: `src/layouts/KitchenLayout.vue` - специальный layout без MainLayout
5. **Offline-ready**: Подготовка к offline-first режиму (как в POS)

### Сравнение с существующими интерфейсами

| Aspect     | Backoffice                 | POS            | Kitchen (new)           |
| ---------- | -------------------------- | -------------- | ----------------------- |
| **Layout** | MainLayout                 | PosLayout      | KitchenLayout           |
| **Roles**  | admin, manager             | admin, cashier | admin, kitchen          |
| **Mode**   | Online-first               | Offline-first  | Online-first (Sprint 1) |
| **Store**  | Multiple stores            | pos/ store     | kitchen/ store          |
| **Route**  | `/menu`, `/products`, etc. | `/pos`         | `/kitchen`              |

---

## User Roles & Authentication

### New User: Kitchen

**Создать нового пользователя** в `src/core/users.ts`:

```typescript
{
  name: 'Kitchen User',
  pin: '4567',
  roles: ['kitchen'] as UserRole[],
  isActive: true,
  description: 'Kitchen staff for order preparation'
}
```

### Role Configuration

Роль `kitchen` уже существует в `src/stores/auth/types.ts`:

```typescript
export type UserRole = 'admin' | 'manager' | 'kitchen' | 'bar' | 'cashier'
```

Обновить `DEFAULT_ROUTES` в `src/stores/auth/types.ts`:

```typescript
export const DEFAULT_ROUTES: Record<UserRole, string> = {
  admin: '/menu',
  manager: '/menu',
  cashier: '/pos',
  kitchen: '/kitchen', // ✅ Уже настроено
  bar: '/kitchen'
}
```

### Permissions

Kitchen роль должна иметь:

- ✅ Доступ к `/kitchen` route
- ✅ Чтение заказов (read-only orders from POS)
- ✅ Обновление статусов заказов (waiting → cooking → ready)
- ❌ Нет доступа к финансам
- ❌ Нет доступа к редактированию меню/продуктов

---

## Store Architecture

### Store Structure

**Упрощенная архитектура** - Kitchen НЕ дублирует данные, использует POS store напрямую.

```
src/stores/kitchen/
├── index.ts              # Minimal coordinator (initialization only)
└── composables/          # Kitchen-specific logic
    ├── useKitchenOrders.ts      # Фильтрация и операции с заказами
    └── useKitchenStatus.ts      # Kitchen статус transitions
```

### Kitchen Store Initialization

Интеграция в `src/core/appInitializer.ts`:

```typescript
private async shouldInitializeKitchen(userRoles: UserRole[]): Promise<boolean> {
  return userRoles.includes('admin') || userRoles.includes('kitchen') || userRoles.includes('bar')
}

private async initializeKitchen(): Promise<void> {
  const kitchenStore = useKitchenStore()
  await kitchenStore.initialize()
}
```

### Data Source & Architecture

**Принцип**: Kitchen НЕ дублирует данные - использует **POS Orders Store напрямую**.

```typescript
// src/stores/kitchen/index.ts - Minimal Coordinator
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'

export const useKitchenStore = defineStore('kitchen', () => {
  const initialized = ref(false)

  async function initialize() {
    if (initialized.value) return { success: true }

    // Проверяем что POS store готов
    const posOrdersStore = usePosOrdersStore()

    if (!posOrdersStore.initialized) {
      await posOrdersStore.loadOrders()
    }

    initialized.value = true
    return { success: true }
  }

  return {
    initialized,
    initialize
  }
})
```

```typescript
// src/stores/kitchen/composables/useKitchenOrders.ts - Kitchen Logic
import { computed } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import type { PosOrder, OrderStatus, ServiceResponse } from '@/stores/pos/types'

export function useKitchenOrders() {
  const posOrdersStore = usePosOrdersStore()

  // Kitchen видит только заказы со статусами: waiting, cooking, ready
  const kitchenOrders = computed(() => {
    return posOrdersStore.orders.filter(order =>
      ['waiting', 'cooking', 'ready'].includes(order.status)
    )
  })

  // Фильтрация по типу заказа
  const filterByType = (type?: OrderType) => {
    if (!type) return kitchenOrders.value
    return kitchenOrders.value.filter(order => order.type === type)
  }

  // Группировка по статусам
  const ordersByStatus = computed(() => ({
    waiting: kitchenOrders.value.filter(o => o.status === 'waiting'),
    cooking: kitchenOrders.value.filter(o => o.status === 'cooking'),
    ready: kitchenOrders.value.filter(o => o.status === 'ready')
  }))

  // Обновление статуса заказа - делегируем в POS
  async function updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus
  ): Promise<ServiceResponse<PosOrder>> {
    const order = posOrdersStore.orders.find(o => o.id === orderId)
    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    order.status = newStatus
    order.updatedAt = new Date().toISOString()

    // Сохраняем через POS store
    return await posOrdersStore.updateOrder(order)
  }

  return {
    kitchenOrders, // все kitchen заказы
    ordersByStatus, // группировка по статусам
    filterByType, // фильтрация
    updateOrderStatus // обновление статуса
  }
}
```

**Важно**:

- Kitchen НЕ создает свои копии заказов
- Все данные живут в **POS Orders Store**
- Kitchen только **фильтрует** и **обновляет статусы**
- Изменения видны в POS **мгновенно** (shared reactive state)

---

## Views Architecture

### View Structure

```
src/views/kitchen/
├── KitchenMainView.vue        # Main kitchen interface entry point
├── orders/                    # Orders screen (default)
│   ├── OrdersScreen.vue       # List of kitchen orders
│   ├── components/
│   │   ├── OrderCard.vue      # Individual order card
│   │   ├── OrderFilters.vue   # Filter by status/type
│   │   └── StatusButton.vue   # Status transition button
│   └── dialogs/
│       └── OrderDetailsDialog.vue  # Order details modal
├── preparation/               # Preparation screen (future)
│   └── PreparationScreen.vue  # Stub for Sprint 1
└── components/                # Shared kitchen components
    ├── KitchenHeader.vue      # Header with menu button
    ├── KitchenSidebar.vue     # Left sidebar navigation
    └── KitchenMenu.vue        # Dropdown menu (logout/login)
```

### Layout: KitchenLayout.vue

```vue
<!-- src/layouts/KitchenLayout.vue -->
<template>
  <div class="kitchen-layout">
    <!-- Header with menu -->
    <div class="kitchen-header">
      <slot name="header" />
    </div>

    <!-- Main content with sidebar -->
    <div class="kitchen-main">
      <!-- Left sidebar navigation -->
      <div class="kitchen-sidebar">
        <slot name="sidebar" />
      </div>

      <!-- Content area -->
      <div class="kitchen-content">
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.kitchen-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kitchen-header {
  height: 64px;
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.kitchen-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.kitchen-sidebar {
  width: 80px;
  background-color: var(--v-theme-surface);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
}

.kitchen-content {
  flex: 1;
  overflow-y: auto;
}
</style>
```

---

## Screens Design

### Screen 1: Orders (Default)

**Основной экран** - отображает заказы из POS с возможностью управления статусами.

#### Features

1. **Order Cards Grid**

   - Показывать заказы в виде карточек (grid layout)
   - Группировка по статусам: Waiting → Cooking → Ready
   - Каждая карточка содержит:
     - Order number (например, "#ORD-001")
     - Order type (Dine-in Table 5 / Takeaway / Delivery)
     - Items list с количествами
     - Время создания заказа
     - Кнопки смены статуса

2. **Status Transitions**

   - `Waiting` → кнопка "Start Cooking" → переход в `Cooking`
   - `Cooking` → кнопка "Mark Ready" → переход в `Ready`
   - `Ready` → заказ исчезает когда POS меняет статус на `Served`/`Collected`/`Delivered`

3. **Filters**

   - По типу заказа: All / Dine-in / Takeaway / Delivery
   - По статусу: All / Waiting / Cooking / Ready

4. **Real-time Updates**
   - Новые заказы появляются автоматически (когда POS отправляет заказ на кухню)
   - Статусы обновляются в реальном времени

#### UI Components

```vue
<!-- src/views/kitchen/orders/OrdersScreen.vue -->
<template>
  <div class="orders-screen">
    <!-- Filters -->
    <OrderFilters v-model:type="filterType" v-model:status="filterStatus" />

    <!-- Orders Grid -->
    <div class="orders-grid">
      <!-- Waiting Column -->
      <div class="status-column">
        <h3>Waiting ({{ waitingOrders.length }})</h3>
        <OrderCard
          v-for="order in waitingOrders"
          :key="order.id"
          :order="order"
          @update-status="handleStatusUpdate"
        />
      </div>

      <!-- Cooking Column -->
      <div class="status-column">
        <h3>Cooking ({{ cookingOrders.length }})</h3>
        <OrderCard
          v-for="order in cookingOrders"
          :key="order.id"
          :order="order"
          @update-status="handleStatusUpdate"
        />
      </div>

      <!-- Ready Column -->
      <div class="status-column">
        <h3>Ready ({{ readyOrders.length }})</h3>
        <OrderCard
          v-for="order in readyOrders"
          :key="order.id"
          :order="order"
          @update-status="handleStatusUpdate"
        />
      </div>
    </div>
  </div>
</template>
```

```vue
<!-- src/views/kitchen/orders/components/OrderCard.vue -->
<template>
  <v-card class="order-card" elevation="2">
    <v-card-title>
      <div class="order-header">
        <span class="order-number">{{ order.orderNumber }}</span>
        <v-chip :color="getOrderTypeColor(order.type)" size="small">
          {{ getOrderTypeLabel(order.type) }}
        </v-chip>
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Table info for dine-in -->
      <div v-if="order.type === 'dine_in' && tableNumber" class="table-info">
        <v-icon size="small">mdi-table-furniture</v-icon>
        Table {{ tableNumber }}
      </div>

      <!-- Items list -->
      <div class="items-list">
        <div v-for="bill in order.bills" :key="bill.id">
          <div v-for="item in bill.items" :key="item.id" class="item-row">
            <span class="item-quantity">{{ item.quantity }}x</span>
            <span class="item-name">{{ item.menuItemName }}</span>
            <span v-if="item.variantName" class="item-variant">({{ item.variantName }})</span>
          </div>
        </div>
      </div>

      <!-- Time info -->
      <div class="time-info">
        <v-icon size="small">mdi-clock-outline</v-icon>
        {{ formatTimeAgo(order.createdAt) }}
      </div>

      <!-- Kitchen notes -->
      <div v-if="hasKitchenNotes" class="kitchen-notes">
        <v-icon size="small">mdi-note-text</v-icon>
        {{ getKitchenNotes(order) }}
      </div>
    </v-card-text>

    <v-card-actions>
      <StatusButton
        :current-status="order.status"
        @update="$emit('update-status', order.id, $event)"
      />
    </v-card-actions>
  </v-card>
</template>
```

#### Order Status Flow

```typescript
// src/stores/kitchen/orders/composables.ts
export function useKitchenOrderStatus() {
  /**
   * Получить следующий статус для заказа
   */
  function getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
    const transitions: Record<OrderStatus, OrderStatus | null> = {
      waiting: 'cooking',
      cooking: 'ready',
      ready: null // Kitchen не меняет дальше
      // ... остальные статусы kitchen не касаются
    }
    return transitions[currentStatus] || null
  }

  /**
   * Получить текст кнопки для статуса
   */
  function getStatusButtonText(currentStatus: OrderStatus): string {
    const texts: Record<OrderStatus, string> = {
      waiting: 'Start Cooking',
      cooking: 'Mark Ready',
      ready: 'Ready' // disabled button
    }
    return texts[currentStatus] || ''
  }

  return {
    getNextStatus,
    getStatusButtonText
  }
}
```

---

### Screen 2: Preparation (Stub)

**Заглушка** для будущего функционала управления полуфабрикатами.

```vue
<!-- src/views/kitchen/preparation/PreparationScreen.vue -->
<template>
  <div class="preparation-screen">
    <v-container fluid class="fill-height">
      <v-row justify="center" align="center">
        <v-col cols="12" class="text-center">
          <v-icon size="64" color="primary" class="mb-4">mdi-flask-outline</v-icon>
          <h2 class="mb-4">Preparation Management</h2>
          <p class="text-medium-emphasis">
            This screen will allow managing semi-finished products (preparations).
          </p>
          <p class="text-medium-emphasis">Coming soon in Sprint 2...</p>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
// Placeholder for future implementation
</script>
```

---

## Navigation & UI Components

### KitchenHeader Component

```vue
<!-- src/views/kitchen/components/KitchenHeader.vue -->
<template>
  <div class="kitchen-header">
    <div class="header-left">
      <h2>Kitchen Display</h2>
    </div>

    <div class="header-right">
      <!-- User info -->
      <span class="user-name">{{ userName }}</span>

      <!-- Menu button -->
      <v-menu offset-y>
        <template #activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item @click="handleLogout">
            <template #prepend>
              <v-icon>mdi-logout</v-icon>
            </template>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => authStore.userName)

async function handleLogout() {
  await authStore.logout()
  router.push('/auth/login')
}
</script>
```

### KitchenSidebar Component

```vue
<!-- src/views/kitchen/components/KitchenSidebar.vue -->
<template>
  <div class="kitchen-sidebar">
    <v-list density="compact">
      <!-- Orders screen -->
      <v-list-item :active="currentScreen === 'orders'" @click="navigateTo('orders')">
        <template #prepend>
          <v-icon>mdi-chef-hat</v-icon>
        </template>
        <v-list-item-title>Orders</v-list-item-title>
      </v-list-item>

      <!-- Preparation screen -->
      <v-list-item :active="currentScreen === 'preparation'" @click="navigateTo('preparation')">
        <template #prepend>
          <v-icon>mdi-flask-outline</v-icon>
        </template>
        <v-list-item-title>Preparation</v-list-item-title>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const currentScreen = ref<'orders' | 'preparation'>('orders')

const emit = defineEmits<{
  (e: 'navigate', screen: 'orders' | 'preparation'): void
}>()

function navigateTo(screen: 'orders' | 'preparation') {
  currentScreen.value = screen
  emit('navigate', screen)
}
</script>
```

---

## Router Configuration

### Routes

```typescript
// src/router/index.ts

// ===== KITCHEN ROUTES =====
{
  path: '/kitchen',
  name: 'kitchen',
  component: () => import('@/views/kitchen/KitchenMainView.vue'),
  meta: {
    requiresAuth: true,
    allowedRoles: ['admin', 'kitchen', 'bar'],
    title: 'Kitchen Display'
  }
}
```

**Примечание**: Kitchen использует свой layout, не MainLayout (аналогично POS).

---

## Integration with POS

### Data Flow (Simplified Architecture)

```
POS Device:
  POS UI → Create Order → posOrdersStore.orders[]
                                    ↓
                            (send to kitchen)
                                    ↓
                        posOrdersStore.sendOrderToKitchen(orderId)
                                    ↓
                        order.status = 'waiting'
                                    ↓
                           Save to Supabase
                                    ↓
                                    ↓
Kitchen Device (polling every 5 sec):
                           Load from Supabase
                                    ↓
                        posOrdersStore.loadOrders()
                                    ↓
  Kitchen UI ← useKitchenOrders() ← posOrdersStore.orders[]
                                    ↓
              (computed filter: status in ['waiting', 'cooking', 'ready'])
                                    ↓
  Kitchen updates status → useKitchenOrders().updateOrderStatus()
                                    ↓
                        posOrdersStore.updateOrder() (delegation)
                                    ↓
                           Save to Supabase
                                    ↓
POS Device (polling):
                           Load from Supabase
                                    ↓
                        POS sees updated status
```

**Ключевые моменты**:

- ✅ Kitchen и POS используют **один и тот же store** (`posOrdersStore`)
- ✅ Синхронизация через **Supabase** (Sprint 1 online-first)
- ✅ Изменения видны через **polling** (5 сек)
- ✅ Нет дублирования данных

### POS Integration Point

В `src/stores/pos/orders/ordersStore.ts` уже существует метод:

```typescript
async function sendOrderToKitchen(
  orderId: string,
  itemIds?: string[]
): Promise<ServiceResponse<PosOrder>>
```

Kitchen использует этот же store напрямую:

```typescript
// Kitchen View
import { useKitchenOrders } from '@/stores/kitchen/composables'

const { kitchenOrders, updateOrderStatus } = useKitchenOrders()
// ↑ kitchenOrders читает из posOrdersStore.orders
```

### Status Synchronization (Same Device Reactivity)

**На одном устройстве** (например, development или single-device deployment):

```typescript
// Kitchen и POS видят изменения МГНОВЕННО через Vue reactivity
POS: posOrdersStore.orders[0].status = 'cooking'
     ↓ (reactive state)
Kitchen: kitchenOrders computed автоматически обновляется
```

**На разных устройствах** (production):

```typescript
// Синхронизация через Supabase + polling
Kitchen: updateOrderStatus('order_1', 'cooking')
         ↓
         posOrdersStore.updateOrder() → Supabase
         ↓ (5 sec delay)
POS:     posOrdersStore.loadOrders() ← Supabase (polling)
         ↓
         POS видит обновленный статус
```

---

## Testing Strategy

### Mock Data

```typescript
// src/stores/kitchen/mocks/kitchenMockData.ts
export const MOCK_KITCHEN_ORDERS: PosOrder[] = [
  {
    id: 'order_1',
    orderNumber: 'ORD-001',
    type: 'dine_in',
    status: 'waiting',
    tableId: 'table_1',
    bills: [
      {
        id: 'bill_1',
        items: [
          {
            id: 'item_1',
            menuItemName: 'Nasi Goreng',
            variantName: 'Regular',
            quantity: 2,
            status: 'waiting'
          },
          {
            id: 'item_2',
            menuItemName: 'Mie Goreng',
            variantName: 'Spicy',
            quantity: 1,
            status: 'waiting'
          }
        ]
      }
    ],
    createdAt: new Date().toISOString()
  }
  // ... more mock orders
]
```

### Unit Tests

```typescript
// src/stores/kitchen/orders/ordersStore.spec.ts
describe('KitchenOrdersStore', () => {
  it('should filter orders by kitchen statuses', () => {
    const store = useKitchenOrdersStore()
    expect(store.kitchenOrders).toHaveLength(3) // only waiting, cooking, ready
  })

  it('should update order status', async () => {
    const store = useKitchenOrdersStore()
    const result = await store.updateOrderStatus('order_1', 'cooking')
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('cooking')
  })
})
```

---

## Development Checklist

### ⚡ CURRENT PHASE: Weeks 1-2 (Parallel Development)

**Team B Focus**: Build Kitchen UI with localStorage (same as current POS)

### Phase 1: Setup & Authentication (1-2 hours)

- [ ] Create `src/stores/kitchen/` directory structure
- [ ] Create `src/views/kitchen/` directory structure
- [ ] Add Kitchen user with PIN 4567 to `src/core/users.ts`
- [ ] Update router with `/kitchen` route
- [ ] Create `KitchenLayout.vue`
- [ ] Update `appInitializer.ts` for Kitchen initialization

### Phase 2: Composables Implementation (2-3 hours)

**Note**: Uses localStorage through posOrdersStore (Team A will migrate to Supabase)

- [ ] Create `src/stores/kitchen/index.ts` (minimal coordinator)
- [ ] Create `src/stores/kitchen/composables/useKitchenOrders.ts` (main logic)
- [ ] Create `src/stores/kitchen/composables/useKitchenStatus.ts` (status helpers)
- [ ] Create `src/stores/kitchen/composables/index.ts` (exports)

### Phase 3: Views Implementation (4-5 hours)

- [ ] Create `KitchenMainView.vue` (entry point)
- [ ] Create `KitchenSidebar.vue` component (based on TablesSidebar pattern)
- [ ] Create `KitchenNavigationMenu.vue` component (based on PosNavigationMenu pattern)
- [ ] Create `OrdersScreen.vue`
- [ ] Create `OrderCard.vue` component
- [ ] Create `OrderFilters.vue` component
- [ ] Create `StatusButton.vue` component
- [ ] Create `PreparationScreen.vue` (stub)

### Phase 4: Integration & Testing (2-3 hours)

**Note**: Testing with localStorage (same device only for now)

- [ ] Test Kitchen login flow
- [ ] Test order filtering by status
- [ ] Test status transitions (waiting → cooking → ready)
- [ ] Test real-time updates from POS (same device)
- [ ] Test navigation between screens
- [ ] Test logout/login from menu

### Phase 5: Polish & Documentation (1-2 hours)

- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty states
- [ ] Add localStorage polling fallback (temporary)
- [ ] Update CLAUDE.md with Kitchen documentation
- [ ] Document Supabase integration points for Team A

**Team B Estimate**: 10-15 hours

---

### 🔄 INTEGRATION PHASE: Week 3 (After Supabase Ready)

**Team A + Team B**: Integrate Kitchen with Supabase

- [ ] Team A: Provide Supabase orders sync API
- [ ] Team B: Test Kitchen with Supabase backend
- [ ] Replace localStorage polling with Supabase polling
- [ ] Test multi-device synchronization
- [ ] Enable real-time updates (if available)
- [ ] Performance testing
- [ ] User acceptance testing

**Integration Estimate**: 4-6 hours

**Total Sprint Estimate**: 14-21 hours

---

## Future Enhancements (Sprint 2+)

1. **Offline Mode (PRIORITY)** 🔥

   - Kitchen localStorage для локальной копии заказов
   - Sync Queue для offline updates
   - Automatic sync при восстановлении сети
   - Conflict resolution (server-wins / manual)
   - WebSocket/Supabase Realtime для real-time updates

2. **Preparation Management**

   - View preparation inventory
   - Create/update preparations
   - Track preparation batches
   - Low stock alerts

3. **Kitchen Analytics**

   - Average cooking time per dish
   - Orders per hour
   - Popular items
   - Peak hours tracking

4. **Notifications**

   - Sound alerts for new orders
   - Flash alerts for urgent orders
   - Push notifications (mobile)
   - Custom alert rules

5. **Multi-Station Support**
   - Separate displays for grill, wok, desserts, etc.
   - Station-specific order filtering
   - Station assignment for dishes
   - Load balancing between stations

---

## Technical Notes

### Order Status Types

Kitchen работает только с этими статусами из `OrderStatus`:

```typescript
type KitchenOrderStatus = 'waiting' | 'cooking' | 'ready'
```

Остальные статусы (`draft`, `served`, `collected`, `delivered`, `cancelled`) Kitchen не касается.

### Offline/Online Behavior

**Проблема**: Kitchen и POS обычно на **разных устройствах** (POS на кассе, Kitchen на iPad в кухне).

#### Sprint 1: Online-First (требует интернет)

```typescript
// Kitchen и POS синхронизируются через Supabase
┌─────────────┐         ┌──────────────┐
│  POS Device │         │ Kitchen iPad │
│  (Касса)    │ WiFi OK │  (Кухня)     │
└─────────────┘ ←─────→ └──────────────┘
       ↓                       ↓
   Supabase ←──────────────────┘
```

**Ограничения Sprint 1**:

- ❌ При offline Kitchen НЕ видит новые заказы
- ❌ При offline статусы НЕ синхронизируются
- ✅ Polling каждые 5 секунд для обновлений

**Реализация**:

```typescript
// Kitchen polling для получения обновлений
setInterval(async () => {
  if (navigator.onLine) {
    await posOrdersStore.loadOrders() // Загружает из Supabase
  }
}, 5000)
```

#### Sprint 2+: Offline-First (полная поддержка offline)

```typescript
┌─────────────┐         ┌──────────────┐
│  POS Device │         │ Kitchen iPad │
│ localStorage│  WiFi   │ localStorage │
└─────────────┘ ←──X──→ └──────────────┘
       ↓         offline       ↓
   Sync Queue              Sync Queue
       ↓         online        ↓
   Supabase ←──────────────────┘
```

**Улучшения Sprint 2+**:

- ✅ Kitchen хранит локальную копию заказов (localStorage)
- ✅ Обновления статусов работают offline (sync queue)
- ✅ Автоматическая синхронизация при восстановлении сети
- ✅ Conflict resolution (server-wins / manual)
- ✅ WebSocket/Supabase Realtime для мгновенных обновлений

**Что это значит для Sprint 1**: Kitchen должен быть онлайн для работы. Это приемлемо для MVP.

### Real-time Updates

**Sprint 1**: Polling каждые 5 секунд для обновления заказов.

**Sprint 2+**: WebSocket/Supabase Realtime для мгновенных обновлений.

### Performance Considerations

- Kitchen может иметь много заказов в пиковое время
- Используйте виртуальный скроллинг для больших списков
- Кэшируйте filtered orders в computed properties
- Ограничьте количество отображаемых заказов (например, последние 50)

### Accessibility

- Крупные кнопки для touch screens
- Четкие цветовые коды для статусов
- Доступность для клавиатуры (Tab navigation)

---

## Questions for Clarification

1. **Order Item Details**: Нужно ли показывать модификаторы и notes для каждого item?
2. **Kitchen Stations**: Нужна ли фильтрация по станциям (grill, wok, etc.) в Sprint 1?
3. **Audio Alerts**: Нужны ли звуковые уведомления для новых заказов в Sprint 1?
4. **Preparation Screen**: Какой именно функционал нужен в Sprint 2? (view only / edit / create)
5. **Multi-language**: Нужна ли поддержка нескольких языков для Kitchen интерфейса?

---

## Acceptance Criteria

### Must Have (Sprint 1)

✅ Kitchen пользователь может войти с PIN 4567
✅ Kitchen видит заказы из POS (статусы: waiting, cooking, ready)
✅ Kitchen использует POS store напрямую (NO duplication)
✅ Kitchen может менять статус заказа через кнопки
✅ Изменения статусов видны в POS мгновенно (shared state)
✅ Заказы группируются по статусам в колонках
✅ Есть фильтрация по типу заказа (dine-in/takeaway/delivery)
✅ Есть sidebar с icon-кнопками Orders и Preparation (как в POS)
✅ Есть navigation menu внизу sidebar с dropdown и logout (как PosNavigationMenu)
✅ Preparation screen показывает заглушку
✅ Layout работает без MainLayout (full-screen, как POS)
✅ Polling каждые 5 сек для обновления заказов (online-first)

### Nice to Have (Sprint 1)

🔲 Звуковые уведомления для новых заказов
🔲 Показ kitchen notes для items
🔲 Показ estimated time для заказов
🔲 Drag & drop для смены статусов

### Out of Scope (Sprint 1)

❌ Редактирование полуфабрикатов
❌ Offline mode (требует интернет для работы)
❌ Multi-station filtering
❌ Analytics dashboard
❌ Kitchen localStorage (все через POS store)
❌ Sync queue (будет в Sprint 2)
❌ WebSocket/Realtime (будет в Sprint 2)

---

## References

- POS Architecture: `CLAUDE.md` → POS System Architecture
- Order Types: `src/stores/pos/types.ts` → OrderStatus, OrderType
- Authentication: `src/stores/auth/` → User roles and permissions
- Layout Pattern: `src/layouts/PosLayout.vue` → Full-screen layout reference
