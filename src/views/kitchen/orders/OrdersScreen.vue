<!-- src/views/kitchen/orders/OrdersScreen.vue -->
<template>
  <div class="orders-screen">
    <!-- New Order Notifications -->
    <NewOrderNotification ref="notificationComponent" />

    <!-- Dishes Columns (Kanban) -->
    <div
      class="orders-columns"
      :class="{
        'ready-collapsed': readyColumnCollapsed,
        'two-columns': !showCookingColumn
      }"
    >
      <!-- Waiting Column -->
      <div class="order-column waiting-column">
        <div class="column-header">
          <v-icon color="orange" size="28">mdi-clock-outline</v-icon>
          <h3 class="column-title">Waiting</h3>
          <v-badge :content="dishesByStatus.waiting.length" color="orange" inline />
        </div>

        <div class="column-content">
          <div v-if="dishesByStatus.waiting.length === 0" class="empty-state">
            <v-icon size="64" color="grey">mdi-check-circle-outline</v-icon>
            <p class="text-medium-emphasis">No dishes waiting</p>
          </div>

          <DishCard
            v-for="dish in dishesByStatus.waiting"
            :key="dish.id"
            :dish="dish"
            :order-color="getOrderColor(dish.orderNumber)"
            @status-update="handleDishStatusUpdate"
          />
        </div>
      </div>

      <!-- Cooking Column (conditionally shown for kitchen/all) -->
      <div v-if="showCookingColumn" class="order-column cooking-column">
        <div class="column-header">
          <v-icon color="blue" size="28">mdi-fire</v-icon>
          <h3 class="column-title">Cooking</h3>
          <v-badge :content="dishesByStatus.cooking.length" color="blue" inline />
        </div>

        <div class="column-content">
          <div v-if="dishesByStatus.cooking.length === 0" class="empty-state">
            <v-icon size="64" color="grey">mdi-chef-hat</v-icon>
            <p class="text-medium-emphasis">No dishes cooking</p>
          </div>

          <DishCard
            v-for="dish in dishesByStatus.cooking"
            :key="dish.id"
            :dish="dish"
            :order-color="getOrderColor(dish.orderNumber)"
            @status-update="handleDishStatusUpdate"
          />
        </div>
      </div>

      <!-- Ready Column (Collapsible) -->
      <div class="order-column ready-column" :class="{ collapsed: readyColumnCollapsed }">
        <div class="column-header">
          <template v-if="!readyColumnCollapsed">
            <v-icon color="green" size="28">mdi-check-circle</v-icon>
            <h3 class="column-title">Ready</h3>
            <v-badge :content="dishesByStatus.ready.length" color="green" inline />
          </template>

          <!-- Collapse/Expand button -->
          <v-btn
            icon
            size="x-small"
            variant="flat"
            color="green"
            :class="readyColumnCollapsed ? '' : 'ml-auto'"
            class="expand-btn"
            @click="readyColumnCollapsed = !readyColumnCollapsed"
          >
            <v-icon>
              {{ readyColumnCollapsed ? 'mdi-chevron-double-left' : 'mdi-chevron-double-right' }}
            </v-icon>
          </v-btn>
        </div>

        <div v-if="!readyColumnCollapsed" class="column-content">
          <div v-if="dishesByStatus.ready.length === 0" class="empty-state">
            <v-icon size="64" color="grey">mdi-silverware-fork-knife</v-icon>
            <p class="text-medium-emphasis">No dishes ready</p>
          </div>

          <DishCard
            v-for="dish in dishesByStatus.ready"
            :key="dish.id"
            :dish="dish"
            :order-color="getOrderColor(dish.orderNumber)"
            @status-update="handleDishStatusUpdate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useKitchenDishes } from '@/stores/kitchen/composables'
import type { KitchenDish } from '@/stores/kitchen/composables'
import { useAuthStore } from '@/stores/auth'
import { DebugUtils } from '@/utils'
import DishCard from './components/DishCard.vue'
import NewOrderNotification from './components/NewOrderNotification.vue'

const MODULE_NAME = 'OrdersScreen'
const authStore = useAuthStore()

// =============================================
// PROPS
// =============================================

interface Props {
  selectedDepartment?: 'all' | 'kitchen' | 'bar'
}

const props = defineProps<Props>()

// =============================================
// STATE
// =============================================

const readyColumnCollapsed = ref(true) // Collapsed by default
const notificationComponent = ref<InstanceType<typeof NewOrderNotification>>()

// Track previous order numbers to detect new orders
const previousOrderNumbers = ref<Set<string>>(new Set())

// Track recently shown notifications with cooldown (prevent duplicates)
const recentNotifications = ref<Map<string, number>>(new Map())
const NOTIFICATION_COOLDOWN_MS = 5000 // 5 seconds cooldown

// =============================================
// COMPOSABLES
// =============================================

/**
 * Pass selectedDepartment as computed ref to useKitchenDishes
 * This allows dynamic filtering when admin changes department tab
 */
const selectedDepartmentRef = computed(() => props.selectedDepartment)

const { dishesByStatus, dishesByOrder, dishesStats, updateDishStatus, getOrderColor } =
  useKitchenDishes(selectedDepartmentRef)

/**
 * Determine if we should show the Cooking column
 * Bar-only view: Hide cooking column (bar items skip cooking)
 * Kitchen or All: Show cooking column
 */
const showCookingColumn = computed(() => {
  const roles = authStore.userRoles
  const isBarUser = roles.includes('bar') && !roles.includes('admin')

  // Bar user (non-admin) → hide cooking column
  if (isBarUser) {
    return false
  }

  // Admin selected bar-only → hide cooking column
  if (props.selectedDepartment === 'bar') {
    return false
  }

  // Otherwise, show cooking (kitchen or all)
  return true
})

/**
 * Create a stable snapshot of order numbers for change detection
 * This prevents false positives when Map references change
 */
const orderNumbersSnapshot = computed(() => {
  return Array.from(dishesByOrder.value.keys()).sort().join(',')
})

/**
 * Check if notification was recently shown (within cooldown period)
 */
const wasRecentlyNotified = (orderNumber: string): boolean => {
  const now = Date.now()
  const lastShown = recentNotifications.value.get(orderNumber)

  if (lastShown && now - lastShown < NOTIFICATION_COOLDOWN_MS) {
    return true
  }

  return false
}

/**
 * Mark order as notified and cleanup old entries
 */
const markAsNotified = (orderNumber: string): void => {
  const now = Date.now()
  recentNotifications.value.set(orderNumber, now)

  // Cleanup old entries (older than cooldown period)
  for (const [key, timestamp] of recentNotifications.value.entries()) {
    if (now - timestamp > NOTIFICATION_COOLDOWN_MS) {
      recentNotifications.value.delete(key)
    }
  }
}

// Debug: Log dishes data
onMounted(() => {
  const roles = authStore.userRoles
  DebugUtils.info(MODULE_NAME, 'Dishes loaded', {
    total: dishesStats.value.total,
    waiting: dishesStats.value.waiting,
    cooking: dishesStats.value.cooking,
    ready: dishesStats.value.ready,
    waitingDishes: dishesByStatus.value.waiting,
    cookingDishes: dishesByStatus.value.cooking,
    readyDishes: dishesByStatus.value.ready,
    showCookingColumn: showCookingColumn.value,
    userRoles: roles,
    selectedDepartment: props.selectedDepartment
  })

  // Initialize with current order numbers
  const currentOrders = new Set<string>(Array.from(dishesByOrder.value.keys()))
  previousOrderNumbers.value = currentOrders
})

// Watch for new orders using stable snapshot (prevents duplicate triggers)
watch(orderNumbersSnapshot, (newSnapshot, oldSnapshot) => {
  // Skip if no change
  if (newSnapshot === oldSnapshot) return

  const currentOrderNumbers = new Set<string>(Array.from(dishesByOrder.value.keys()))

  // Find new orders
  const newOrders = Array.from(currentOrderNumbers).filter(
    (orderNumber: string) => !previousOrderNumbers.value.has(orderNumber)
  )

  // Show notification for each new order (with cooldown)
  newOrders.forEach((orderNumber: string) => {
    // Check cooldown to prevent duplicate notifications
    if (wasRecentlyNotified(orderNumber)) {
      DebugUtils.debug(MODULE_NAME, 'Skipping duplicate notification (cooldown active)', {
        orderNumber
      })
      return
    }

    const orderDishes = dishesByOrder.value.get(orderNumber)
    if (!orderDishes || orderDishes.length === 0) return

    const firstDish = orderDishes[0]
    const itemsCount = orderDishes.length

    DebugUtils.info(MODULE_NAME, 'New order detected', {
      orderNumber,
      itemsCount,
      tableNumber: firstDish.tableNumber
    })

    // Show notification
    notificationComponent.value?.showNotification({
      orderNumber,
      itemsCount,
      tableNumber: firstDish.tableNumber,
      color: getOrderColor(orderNumber)
    })

    // Mark as notified
    markAsNotified(orderNumber)
  })

  // Update tracked order numbers
  previousOrderNumbers.value = currentOrderNumbers
})

// =============================================
// METHODS
// =============================================

const handleDishStatusUpdate = async (
  dish: KitchenDish,
  newStatus: 'waiting' | 'cooking' | 'ready'
) => {
  DebugUtils.debug(MODULE_NAME, 'Updating dish status', {
    dishId: dish.id,
    dishName: dish.name,
    orderNumber: dish.orderNumber,
    oldStatus: dish.status,
    newStatus
  })

  const result = await updateDishStatus(dish, newStatus)

  if (result.success) {
    DebugUtils.info(MODULE_NAME, 'Dish status updated successfully', {
      dishId: dish.id,
      dishName: dish.name,
      newStatus
    })
  } else {
    DebugUtils.error(MODULE_NAME, 'Failed to update dish status', {
      dishId: dish.id,
      error: result.error
    })
  }
}
</script>

<style scoped lang="scss">
.orders-screen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  max-width: 100%;
  background-color: var(--v-theme-background);
  overflow: hidden;
  box-sizing: border-box;
}

/* Kanban Board - 3 Vertical Columns Side by Side */
.orders-columns {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--spacing-md);
  flex: 1;
  overflow: hidden;
  padding: var(--spacing-lg);
  min-height: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  /* Two-column layout (bar mode: waiting + ready) */
  &.two-columns {
    grid-template-columns: 1fr 1fr;

    &.ready-collapsed {
      grid-template-columns: 1fr 60px;
    }
  }

  /* Three-column layout (kitchen/all mode: waiting + cooking + ready) */
  &:not(.two-columns) {
    &.ready-collapsed {
      grid-template-columns: 1fr 1fr 60px;
    }

    &:not(.ready-collapsed) {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }
}

.order-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: var(--v-theme-surface);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
  box-sizing: border-box;

  &.collapsed {
    min-width: 60px;
    max-width: 60px;
  }
}

.column-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.2);
  border-bottom: 2px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;

  .collapsed & {
    justify-content: center;
    padding: var(--spacing-sm);
  }
}

.column-title {
  font-size: var(--text-lg);
  font-weight: 600;
  flex: 1;
}

.expand-btn {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
  transition: all 0.2s ease !important;

  :deep(.v-icon) {
    font-size: 18px !important;
  }

  &:hover {
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.4) !important;
    box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3) !important;
  }
}

.column-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  align-items: stretch;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  text-align: center;
  opacity: 0.5;
}

/* Responsive */
@media (max-width: 1200px) {
  .orders-columns {
    flex-direction: column;
    overflow-y: auto;
  }

  .order-column {
    min-height: 300px;
    flex: 0 0 auto;

    &.collapsed {
      min-height: 80px;
    }
  }
}

/* Custom scrollbar for columns */
.column-content::-webkit-scrollbar {
  width: 6px;
}

.column-content::-webkit-scrollbar-track {
  background: transparent;
}

.column-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.column-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
