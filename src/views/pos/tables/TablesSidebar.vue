<!-- src/views/pos/tables/TablesSidebar.vue -->
<template>
  <div class="tables-sidebar">
    <!-- New Order Button Section -->
    <div class="new-order-section">
      <v-btn
        class="new-order-btn"
        color="primary"
        block
        icon="mdi-plus"
        :height="UI_CONSTANTS.MIN_BUTTON_HEIGHT"
        @click="handleNewOrder"
      />
    </div>

    <div class="separator" />

    <!-- Scrollable Content -->
    <div class="scrollable-content">
      <!-- Active Delivery/Takeaway Orders Section -->
      <div v-if="deliveryOrders.length > 0" class="orders-section">
        <div class="section-title">Active Orders</div>

        <div class="orders-list" :style="ordersListStyles">
          <!-- Показываем ВСЕ заказы -->
          <div v-for="order in allOrders" :key="order.id" class="order-item">
            <v-card
              class="order-card"
              :color="isOrderActive(order.id) ? 'primary' : undefined"
              :variant="isOrderActive(order.id) ? 'flat' : 'outlined'"
              :style="orderCardStyles"
              @click="handleOrderSelect(order.id)"
            >
              <v-card-text class="order-card-content">
                <v-icon :icon="getOrderTypeIcon(order.type)" :size="UI_CONSTANTS.MIN_ICON_SIZE" />
                <span class="order-number">{{ order.orderNumber }}</span>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </div>
      <!-- Tables Section -->
      <div class="tables-section">
        <div class="section-title">Tables</div>

        <div class="tables-list">
          <TableItem
            v-for="table in tables"
            :key="table.id"
            :table="table"
            :is-active="isTableSelected(table.id)"
            :size="tableItemSize"
            @select="handleTableSelect"
          />
        </div>
      </div>
    </div>

    <!-- Navigation Menu Button -->
    <div class="navigation-section">
      <PosNavigationMenu />
    </div>

    <!-- Order Type Dialog -->
    <OrderTypeDialog
      v-model="showNewOrderDialog"
      @create-order="handleCreateOrder"
      @select-dine-in="handleSelectDineIn"
    />

    <!-- Unsaved Changes Dialog -->
    <v-dialog v-model="showUnsavedDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Несохранённые изменения</v-card-title>
        <v-card-text>У вас есть несохранённые изменения. Продолжить без сохранения?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="handleDialogCancel">Отмена</v-btn>
          <v-btn color="primary" @click="handleDialogConfirm">Продолжить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DebugUtils } from '@/utils'
import type { PosTable } from '@/stores/pos/types'
import type { OrderType } from '@/types/order'

// Composables
import { useTables } from '@/stores/pos/tables/composables/useTables'
import { useOrders } from '@/stores/pos/orders/composables/useOrders'

// Mock data
import { createMockTables, getActiveDeliveryOrders } from '@/stores/pos/mocks/posMockData'

// Components
import TableItem from './TableItem.vue'
import OrderTypeDialog from './dialogs/OrderTypeDialog.vue'
import PosNavigationMenu from '../components/PosNavigationMenu.vue'

const MODULE_NAME = 'TablesSidebar'

// =============================================
// CONSTANTS
// =============================================

const UI_CONSTANTS = {
  MIN_BUTTON_HEIGHT: 44,
  MIN_ICON_SIZE: 20,
  MIN_ORDER_CARD_HEIGHT: 44,
  MAX_VISIBLE_ORDERS: 4,
  ORDERS_LIST_MAX_HEIGHT: 200 // 4 * 44px + gaps + padding
} as const

// =============================================
// PROPS & EMITS
// =============================================

const emit = defineEmits<{
  select: [id: string]
  createOrder: [type: OrderType, data?: any]
  dialogConfirm: []
  dialogCancel: []
}>()

// =============================================
// COMPOSABLES
// =============================================

const { handleTableSelect: handleTableSelectAction, isTableOccupied, canOccupyTable } = useTables()

const {
  getOrderTypeIcon,
  isOrderActive,
  handleOrderSelect: handleOrderSelectAction,
  createDeliveryOrder,
  createTakeawayOrder,
  createDineInOrder,
  selectedOrderId
} = useOrders()

// =============================================
// STATE
// =============================================

const tables = ref<PosTable[]>(createMockTables())
const deliveryOrders = ref(getActiveDeliveryOrders())
const showNewOrderDialog = ref(false)
const showUnsavedDialog = ref(false)
const pendingAction = ref<(() => void) | null>(null)
const selectedTableId = ref<string | null>(null)

// =============================================
// COMPUTED PROPERTIES
// =============================================

const allOrders = computed(() => deliveryOrders.value)

const ordersListStyles = computed(() => {
  const orderCount = deliveryOrders.value.length
  const maxHeight = Math.min(orderCount * 48 + 16, 200) // 48px на заказ + padding, макс 200px
  return {
    maxHeight: `${maxHeight}px`
  }
})

// UI Styles

const orderCardStyles = computed(() => ({
  height: `${UI_CONSTANTS.MIN_ORDER_CARD_HEIGHT}px`,
  minHeight: `${UI_CONSTANTS.MIN_ORDER_CARD_HEIGHT}px`
}))

const tableItemSize = computed<'compact' | 'standard' | 'comfortable'>(() => {
  // Определяем размер на основе количества столов или размера экрана
  if (tables.value.length > 15) return 'compact'
  if (tables.value.length > 10) return 'standard'
  return 'comfortable'
})

// Selection state
const isTableSelected = computed(() => (tableId: string) => selectedTableId.value === tableId)

// =============================================
// METHODS
// =============================================

/**
 * Проверить есть ли несохранённые изменения
 */
function checkUnsavedChanges(): boolean {
  // TODO: Интеграция с реальной проверкой
  return false
}

/**
 * Показать диалог несохранённых изменений
 */
async function showUnsavedChangesDialog(): Promise<boolean> {
  return new Promise(resolve => {
    const originalAction = pendingAction.value
    pendingAction.value = () => resolve(true)

    showUnsavedDialog.value = true

    // Таймаут для отмены
    setTimeout(() => {
      if (pendingAction.value === originalAction) {
        resolve(false)
      }
    }, 30000) // 30 секунд на решение
  })
}

/**
 * Обработать создание нового заказа
 */
async function handleNewOrder(): Promise<void> {
  DebugUtils.debug(MODULE_NAME, 'New order button clicked')

  if (checkUnsavedChanges()) {
    const shouldContinue = await showUnsavedChangesDialog()
    if (!shouldContinue) return
  }

  showNewOrderDialog.value = true
}

/**
 * Обработать выбор стола
 */
async function handleTableSelect(tableId: string): Promise<void> {
  DebugUtils.debug(MODULE_NAME, 'Table selected', { tableId })

  const table = tables.value.find(t => t.id === tableId)
  if (!table) return

  await handleTableSelectAction(table, {
    onSelect: id => {
      selectedTableId.value = id
      emit('select', id)
    },
    onError: error => {
      console.error('Table selection error:', error)
    },
    checkUnsavedChanges,
    showUnsavedDialog: showUnsavedChangesDialog
  })
}

/**
 * Обработать выбор заказа
 */
async function handleOrderSelect(orderId: string): Promise<void> {
  DebugUtils.debug(MODULE_NAME, 'Order selected', { orderId })

  await handleOrderSelectAction(orderId, {
    onSelect: id => {
      emit('select', id)
    },
    onError: error => {
      console.error('Order selection error:', error)
    },
    checkUnsavedChanges,
    showUnsavedDialog: showUnsavedChangesDialog
  })
}

/**
 * Обработать создание заказа из диалога
 */
async function handleCreateOrder(type: OrderType, data?: any): Promise<void> {
  DebugUtils.debug(MODULE_NAME, 'Creating order', { type, data })

  try {
    switch (type) {
      case 'delivery':
        await createDeliveryOrder(data, {
          onSuccess: orderId => {
            showNewOrderDialog.value = false
            emit('createOrder', type, { orderId, ...data })
          },
          onError: error => {
            console.error('Delivery order creation error:', error)
          }
        })
        break

      case 'takeaway':
        await createTakeawayOrder(data, {
          onSuccess: orderId => {
            showNewOrderDialog.value = false
            emit('createOrder', type, { orderId, ...data })
          },
          onError: error => {
            console.error('Takeaway order creation error:', error)
          }
        })
        break

      default:
        console.warn('Unknown order type:', type)
    }
  } catch (error) {
    console.error('Order creation error:', error)
  }
}

/**
 * Обработать выбор dine-in (показать столы для выбора)
 */
function handleSelectDineIn(): void {
  DebugUtils.debug(MODULE_NAME, 'Dine-in selected, waiting for table selection')
  showNewOrderDialog.value = false

  // TODO: Показать индикатор ожидания выбора стола
  // Можно добавить состояние waitingForTableSelection
}

/**
 * Обработать подтверждение диалога
 */
function handleDialogConfirm(): void {
  DebugUtils.debug(MODULE_NAME, 'Dialog confirmed')

  if (pendingAction.value) {
    pendingAction.value()
    pendingAction.value = null
  }

  showUnsavedDialog.value = false
  emit('dialogConfirm')
}

/**
 * Обработать отмену диалога
 */
function handleDialogCancel(): void {
  DebugUtils.debug(MODULE_NAME, 'Dialog cancelled')

  pendingAction.value = null
  showUnsavedDialog.value = false
  emit('dialogCancel')
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  DebugUtils.debug(MODULE_NAME, 'TablesSidebar mounted', {
    tablesCount: tables.value.length,
    ordersCount: deliveryOrders.value.length
  })
})
</script>

<style scoped>
/* =============================================
   LAYOUT STRUCTURE
   ============================================= */

.tables-sidebar {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--v-theme-surface);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.new-order-section {
  padding: 8px;
  flex-shrink: 0;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.navigation-section {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

/* =============================================
   SECTIONS
   ============================================= */

.orders-section {
  flex-shrink: 0;
}

.tables-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.0625em;
  color: rgba(255, 255, 255, 0.7);
  padding: 12px 8px 8px 8px;
  background-color: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* =============================================
   ORDERS LIST
   ============================================= */

.orders-list {
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px; /* фиксированная высота */
  overflow-y: auto; /* всегда скролл */
  overflow-x: hidden;
}

.order-item {
  flex-shrink: 0;
}

.order-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.order-card:hover:not(.order-card--active) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.order-card-content {
  padding: 8px 12px !important;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: inherit;
}

.order-number {
  font-size: 0.875rem;
  font-weight: 500;
  color: inherit;
}

/* =============================================
   SCROLL INDICATOR
   ============================================= */

.scroll-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px 4px 4px;
  color: rgba(255, 255, 255, 0.6);
}

.scroll-text {
  font-size: 0.75rem;
  font-weight: 500;
}

/* =============================================
   TABLES LIST
   ============================================= */

.tables-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

/* =============================================
   BUTTONS
   ============================================= */

.new-order-btn {
  border-radius: 8px !important;
  text-transform: none;
  letter-spacing: 0.0125em;
  font-size: 0.875rem;
  min-height: 44px !important;
}

/* =============================================
   SEPARATORS
   ============================================= */

.separator {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.12);
  margin: 0 8px;
  flex-shrink: 0;
}

/* ===== SCROLLBARS ===== */

.scrollable-content::-webkit-scrollbar,
   .orders-list::-webkit-scrollbar,  /* добавить */
   .tables-list::-webkit-scrollbar {
  width: 4px;
}

.scrollable-content::-webkit-scrollbar-track,
   .orders-list::-webkit-scrollbar-track,  /* добавить */
   .tables-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.scrollable-content::-webkit-scrollbar-thumb,
   .orders-list::-webkit-scrollbar-thumb,  /* добавить */
   .tables-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.scrollable-content::-webkit-scrollbar-thumb:hover,
   .orders-list::-webkit-scrollbar-thumb:hover,  /* добавить */
   .tables-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .new-order-section {
    padding: 6px;
  }

  .section-title {
    padding: 10px 6px 6px 6px;
    font-size: 0.6875rem;
  }

  .orders-list,
  .tables-list {
    padding: 4px 6px;
    gap: 3px;
  }

  .order-card-content {
    padding: 6px 10px !important;
    gap: 6px;
  }

  .order-number {
    font-size: 0.8125rem;
  }
}

/* =============================================
   ACCESSIBILITY
   ============================================= */

.order-card:focus-visible,
.new-order-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* Увеличиваем размер touch-области */
@media (pointer: coarse) {
  .order-card-content {
    min-height: 44px;
  }

  .new-order-btn {
    min-height: 48px !important;
  }
}

/* =============================================
   LOADING STATES
   ============================================= */

.order-card--loading {
  opacity: 0.6;
  pointer-events: none;
}

.tables-list--loading {
  opacity: 0.6;
}

/* =============================================
   DARK MODE ADJUSTMENTS
   ============================================= */

@media (prefers-color-scheme: dark) {
  .section-title {
    background-color: rgba(255, 255, 255, 0.03);
  }
}
</style>
