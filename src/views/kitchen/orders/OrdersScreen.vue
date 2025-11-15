<!-- src/views/kitchen/orders/OrdersScreen.vue -->
<template>
  <div class="orders-screen">
    <!-- Header with Stats -->
    <div class="orders-header">
      <h2 class="screen-title">Kitchen Display System</h2>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-label">Total Dishes:</span>
          <span class="stat-value">{{ dishesStats.total }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item waiting">
          <span class="stat-label">Waiting:</span>
          <span class="stat-value">{{ dishesStats.waiting }}</span>
        </div>
        <div class="stat-item cooking">
          <span class="stat-label">Cooking:</span>
          <span class="stat-value">{{ dishesStats.cooking }}</span>
        </div>
        <div class="stat-item ready">
          <span class="stat-label">Ready:</span>
          <span class="stat-value">{{ dishesStats.ready }}</span>
        </div>
      </div>
    </div>

    <!-- Dishes Columns (Kanban) -->
    <div class="orders-columns" :class="{ 'ready-collapsed': readyColumnCollapsed }">
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

      <!-- Cooking Column -->
      <div class="order-column cooking-column">
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
          <v-icon color="green" size="28">mdi-check-circle</v-icon>
          <h3 v-if="!readyColumnCollapsed" class="column-title">Ready</h3>
          <v-badge :content="dishesByStatus.ready.length" color="green" inline />

          <!-- Collapse/Expand button -->
          <v-btn
            icon
            size="small"
            variant="text"
            class="ml-auto"
            @click="readyColumnCollapsed = !readyColumnCollapsed"
          >
            <v-icon>{{ readyColumnCollapsed ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
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
import { ref, onMounted } from 'vue'
import { useKitchenDishes } from '@/stores/kitchen/composables'
import type { KitchenDish } from '@/stores/kitchen/composables'
import { DebugUtils } from '@/utils'
import DishCard from './components/DishCard.vue'

const MODULE_NAME = 'OrdersScreen'

// =============================================
// STATE
// =============================================

const readyColumnCollapsed = ref(true) // Collapsed by default

// =============================================
// COMPOSABLES
// =============================================

const { dishesByStatus, dishesStats, updateDishStatus, getOrderColor } = useKitchenDishes()

// Debug: Log dishes data
onMounted(() => {
  DebugUtils.info(MODULE_NAME, 'Dishes loaded', {
    total: dishesStats.value.total,
    waiting: dishesStats.value.waiting,
    cooking: dishesStats.value.cooking,
    ready: dishesStats.value.ready,
    waitingDishes: dishesByStatus.value.waiting,
    cookingDishes: dishesByStatus.value.cooking,
    readyDishes: dishesByStatus.value.ready
  })
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
  height: 100%;
  width: 100%;
  background-color: var(--v-theme-background);
}

/* Header */
.orders-header {
  padding: var(--spacing-lg);
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.screen-title {
  font-size: var(--text-2xl);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
}

.stats-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);

  &.waiting {
    color: rgb(var(--v-theme-warning));
  }

  &.cooking {
    color: rgb(var(--v-theme-info));
  }

  &.ready {
    color: rgb(var(--v-theme-success));
  }
}

.stat-label {
  font-size: var(--text-sm);
  opacity: 0.7;
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: 600;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.12);
}

/* Kanban Board - 3 Vertical Columns Side by Side */
.orders-columns {
  display: grid;
  grid-template-columns: 1fr 1fr 80px;
  gap: var(--spacing-md);
  flex: 1;
  overflow: hidden;
  padding: var(--spacing-lg);
  height: 100%;

  &.ready-collapsed {
    grid-template-columns: 1fr 1fr 80px;
  }

  &:not(.ready-collapsed) {
    grid-template-columns: 1fr 1fr 1fr;
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

  &.collapsed {
    min-width: 80px;
    max-width: 80px;
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
}

.column-title {
  font-size: var(--text-lg);
  font-weight: 600;
  flex: 1;
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
