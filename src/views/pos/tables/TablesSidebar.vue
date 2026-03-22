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
        height="44"
        :loading="loading.create"
        @click="handleNewOrder"
      />
    </div>

    <div class="separator" />

    <!-- Scrollable Content - Single scroll for orders and tables -->
    <div class="scrollable-content">
      <!-- Online Orders (from website) -->
      <template v-if="onlineOrders.length > 0">
        <div class="section-title online-section-title">
          <v-icon size="12" color="teal" class="mr-1">mdi-web</v-icon>
          Online ({{ onlineOrders.length }})
        </div>
        <div class="items-list">
          <SidebarItem
            v-for="order in onlineOrders"
            :key="order.id"
            type="order"
            :order="order"
            :is-selected="isOrderSelected(order.id)"
            @select="handleOrderSelect"
          />
        </div>
        <div class="separator" />
      </template>

      <!-- Active Delivery/Takeaway Orders (POS-created) -->
      <template v-if="deliveryOrders.length > 0">
        <div class="section-title">Orders</div>
        <div class="items-list">
          <SidebarItem
            v-for="order in deliveryOrders"
            :key="order.id"
            type="order"
            :order="order"
            :is-selected="isOrderSelected(order.id)"
            @select="handleOrderSelect"
          />
        </div>
        <div class="separator" />
      </template>

      <!-- Tables -->
      <div class="section-title">Tables</div>
      <div class="items-list">
        <SidebarItem
          v-for="table in tables"
          :key="table.id"
          type="table"
          :table="table"
          :is-selected="isTableSelected(table.id)"
          @select="handleTableSelect"
        />
      </div>
    </div>

    <!-- Navigation Menu Button -->
    <div class="navigation-section">
      <PosNavigationMenu />
    </div>

    <!-- Order Type Dialog -->
    <OrderTypeDialog v-model="showNewOrderDialog" @create="handleCreateOrder" />

    <!-- Unsaved Changes Dialog -->
    <v-dialog v-model="showUnsavedDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Unsaved Changes</v-card-title>
        <v-card-text>
          You have unsaved changes in the current order. If you continue, these changes will be
          lost. Do you want to continue without saving?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="handleDialogCancel">Cancel</v-btn>
          <v-btn color="warning" variant="flat" @click="handleDialogConfirm">
            Continue Without Saving
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { useChannelsStore } from '@/stores/channels'
import { DebugUtils } from '@/utils'
import type { PosTable, PosOrder, OrderType } from '@/stores/pos/types'

// Components
import SidebarItem from './components/SidebarItem.vue'
import OrderTypeDialog from './dialogs/OrderTypeDialog.vue'
import PosNavigationMenu from '../components/PosNavigationMenu.vue'

const MODULE_NAME = 'TablesSidebar'

// =============================================
// PROPS
// =============================================

interface Props {
  hasUnsavedChanges?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasUnsavedChanges: false
})

// =============================================
// STORES
// =============================================

const tablesStore = usePosTablesStore()
const ordersStore = usePosOrdersStore()
const channelsStore = useChannelsStore()

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  select: [orderId: string]
  error: [message: string, type: 'error' | 'warning' | 'info']
}>()

// =============================================
// STATE
// =============================================

const showNewOrderDialog = ref(false)
const showUnsavedDialog = ref(false)
const pendingAction = ref<(() => void) | null>(null)
const loading = ref({
  create: false,
  tables: false,
  orders: false
})

// =============================================
// COMPUTED PROPERTIES
// =============================================

/**
 * Список столов из POS Tables Store
 * Сортировка по sortOrder из базы данных (TB 1-5, TI 1-5, Alex)
 */
const tables = computed((): PosTable[] => {
  return [...tablesStore.tables].sort((a, b) => {
    // Sort by sortOrder from database (set in migration 075)
    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
})

/**
 * Online orders from website (source = 'website')
 * Includes both dine_in (unassigned) and takeaway orders
 */
const onlineOrders = computed((): PosOrder[] => {
  return ordersStore.orders
    .filter(order => {
      const isOnline = order.source === 'website'
      const isNotCompleted = !['cancelled', 'delivered', 'collected', 'served'].includes(
        order.status
      )
      // Exclude orders already assigned to a table (they appear in Tables section)
      const isNotAssignedToTable = !order.tableId
      return isOnline && isNotCompleted && isNotAssignedToTable
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
})

/**
 * Активные заказы на доставку и самовывоз (POS-created only)
 * Сортируем по времени создания от старых к новым
 */
const deliveryOrders = computed((): PosOrder[] => {
  return ordersStore.orders
    .filter(order => {
      const isDeliveryOrTakeaway = ['takeaway', 'delivery'].includes(order.type)
      const isNotCompleted = !['cancelled', 'delivered', 'collected', 'served'].includes(
        order.status
      )
      const isNotOnline = order.source !== 'website'

      return isDeliveryOrTakeaway && isNotCompleted && isNotOnline
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
})

/**
 * Проверка выбранного заказа
 */
const isOrderSelected = computed(() => (orderId: string): boolean => {
  return ordersStore.currentOrderId === orderId
})

/**
 * Проверка выбранного стола
 */
const isTableSelected = computed(() => (tableId: string): boolean => {
  const currentOrder = ordersStore.currentOrder
  return currentOrder?.tableId === tableId
})

// =============================================
// METHODS - DIALOG HANDLING
// =============================================

/**
 * Обработка подтверждения диалога
 */
const handleDialogConfirm = (): void => {
  DebugUtils.debug(MODULE_NAME, 'Dialog confirmed')

  if (pendingAction.value) {
    pendingAction.value()
    pendingAction.value = null
  }

  showUnsavedDialog.value = false
}

/**
 * Обработка отмены диалога
 */
const handleDialogCancel = (): void => {
  DebugUtils.debug(MODULE_NAME, 'Dialog cancelled')

  pendingAction.value = null
  showUnsavedDialog.value = false
}

// =============================================
// METHODS - ORDER CREATION
// =============================================

/**
 * Показать диалог создания нового заказа
 */
const handleNewOrder = (): void => {
  DebugUtils.debug(MODULE_NAME, 'New order button clicked')

  // Проверка несохраненных изменений перед созданием нового заказа
  if (props.hasUnsavedChanges) {
    DebugUtils.debug(MODULE_NAME, 'Unsaved changes detected, showing confirmation dialog')

    // Сохраняем действие для выполнения после подтверждения
    pendingAction.value = () => {
      showNewOrderDialog.value = true
    }
    showUnsavedDialog.value = true
    return
  }

  showNewOrderDialog.value = true
}

/**
 * Создание заказа из диалога
 */
const handleCreateOrder = async (type: OrderType, data?: any): Promise<void> => {
  try {
    loading.value.create = true

    DebugUtils.debug(MODULE_NAME, 'Creating new order', { type, data })

    let result

    if (type === 'dine_in') {
      // Для dine-in нужно выбрать стол, закрываем диалог
      showNewOrderDialog.value = false
      DebugUtils.debug(MODULE_NAME, 'Dine-in order - user should select table')
      return
    } else {
      // Dialog now always provides channelId/channelCode from DB
      result = await ordersStore.createOrder({
        type,
        customerName: data?.customerName,
        channelId: data?.channelId,
        channelCode: data?.channelCode
      })
    }

    if (result.success && result.data) {
      DebugUtils.debug(MODULE_NAME, 'Order created successfully', {
        orderId: result.data.id,
        type,
        orderNumber: result.data.orderNumber
      })

      // Выбираем созданный заказ
      emit('select', result.data.id)
      showNewOrderDialog.value = false
    } else {
      throw new Error(result.error || 'Failed to create order')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order'
    DebugUtils.error(MODULE_NAME, 'Error creating order', {
      error: message,
      type,
      data
    })
    console.error('Failed to create order:', message)
  } finally {
    loading.value.create = false
  }
}

// =============================================
// METHODS - TABLE SELECTION
// =============================================

/**
 * Выбор стола через SidebarItem
 */
const handleTableSelect = async (item: PosTable | PosOrder): Promise<void> => {
  // Type guard для стола
  if (!('number' in item)) {
    DebugUtils.error(MODULE_NAME, 'Invalid table item received')
    return
  }

  const table = item as PosTable

  // Проверка несохраненных изменений перед переключением
  if (props.hasUnsavedChanges && table.currentOrderId !== ordersStore.currentOrderId) {
    DebugUtils.debug(MODULE_NAME, 'Unsaved changes detected, showing confirmation dialog')

    // Сохраняем действие для выполнения после подтверждения
    pendingAction.value = () => performTableSelect(table)
    showUnsavedDialog.value = true
    return
  }

  // Если нет несохраненных изменений, выполняем выбор сразу
  await performTableSelect(table)
}

/**
 * Выполнить выбор стола (внутренняя функция)
 * ✅ FIX: Guard against double-tap race condition
 */
let isSelectingTable = false
const performTableSelect = async (table: PosTable): Promise<void> => {
  if (isSelectingTable) {
    DebugUtils.warn(MODULE_NAME, 'Table selection already in progress, ignoring duplicate tap')
    return
  }
  isSelectingTable = true
  try {
    DebugUtils.debug(MODULE_NAME, 'Table selected via SidebarItem', {
      tableId: table.id,
      tableNumber: table.number,
      status: table.status,
      currentOrderId: table.currentOrderId
    })

    if (table.status === 'free') {
      // ✅ Auto-cleanup: if current order is an empty draft, delete it before creating new one
      await autoCleanupCurrentEmptyOrder()

      // Создаем новый заказ для стола с auto-assigned channel
      // Ensure channels are loaded before creating order
      if (!channelsStore.initialized) {
        await channelsStore.initialize()
      }
      const dineInChannel = channelsStore.getChannelByCode('dine_in')
      if (!dineInChannel) {
        console.error('❌ dine_in channel not found! Channels:', channelsStore.channels.length)
      }
      const result = await ordersStore.createOrder({
        type: 'dine_in',
        tableId: table.id,
        channelId: dineInChannel?.id,
        channelCode: 'dine_in'
      })

      if (result.success && result.data) {
        DebugUtils.debug(MODULE_NAME, 'New table order created', {
          orderId: result.data.id,
          tableId: table.id,
          orderNumber: result.data.orderNumber
        })

        emit('select', result.data.id)
      } else {
        throw new Error(result.error || 'Failed to create table order')
      }
    } else if (table.currentOrderId) {
      // Auto-cleanup: if switching away from an empty draft order, delete it
      if (ordersStore.currentOrderId && ordersStore.currentOrderId !== table.currentOrderId) {
        await autoCleanupCurrentEmptyOrder()
      }

      // Выбираем существующий заказ стола
      DebugUtils.debug(MODULE_NAME, 'Selecting existing table order', {
        orderId: table.currentOrderId,
        tableId: table.id
      })

      ordersStore.selectOrder(table.currentOrderId)
      emit('select', table.currentOrderId)
    } else {
      DebugUtils.warn(MODULE_NAME, 'Table has no current order but is not free', {
        tableId: table.id,
        status: table.status
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to select table'
    DebugUtils.error(MODULE_NAME, 'Error selecting table', {
      error: message,
      tableId: table.id
    })

    // ✅ Emit error to parent for user notification
    if (message.includes('No active shift')) {
      emit('error', '⚠️ Please start a shift before creating orders', 'warning')
    } else {
      emit('error', message, 'error')
    }
  } finally {
    isSelectingTable = false
  }
}

// =============================================
// METHODS - ORDER SELECTION
// =============================================

/**
 * Выбор заказа через SidebarItem
 */
const handleOrderSelect = async (item: PosTable | PosOrder): Promise<void> => {
  // Type guard для заказа
  if (!('orderNumber' in item)) {
    DebugUtils.error(MODULE_NAME, 'Invalid order item received')
    return
  }

  const order = item as PosOrder

  // Проверка несохраненных изменений перед переключением
  if (props.hasUnsavedChanges && order.id !== ordersStore.currentOrderId) {
    DebugUtils.debug(MODULE_NAME, 'Unsaved changes detected, showing confirmation dialog')

    // Сохраняем действие для выполнения после подтверждения
    pendingAction.value = () => performOrderSelect(order)
    showUnsavedDialog.value = true
    return
  }

  // Если нет несохраненных изменений, выполняем выбор сразу
  await performOrderSelect(order)
}

/**
 * Выполнить выбор заказа (внутренняя функция)
 */
const performOrderSelect = async (order: PosOrder): Promise<void> => {
  try {
    // Auto-cleanup: if switching away from an empty draft order, delete it
    if (ordersStore.currentOrderId && ordersStore.currentOrderId !== order.id) {
      await autoCleanupCurrentEmptyOrder()
    }

    DebugUtils.debug(MODULE_NAME, 'Order selected via SidebarItem', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status
    })

    // Используем правильный метод из store
    ordersStore.selectOrder(order.id)

    DebugUtils.debug(MODULE_NAME, 'Order set as current', {
      orderId: order.id,
      currentOrderId: ordersStore.currentOrderId
    })

    emit('select', order.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to select order'
    DebugUtils.error(MODULE_NAME, 'Error selecting order', {
      error: message,
      orderId: order.id
    })
    console.error('Failed to select order:', message)
  }
}

// =============================================
// AUTO-CLEANUP: Delete empty draft order when switching tables
// =============================================

/**
 * If the currently selected order is an empty draft dine_in order,
 * delete it automatically before creating a new one.
 * This prevents ghost orders from accumulating.
 */
async function autoCleanupCurrentEmptyOrder(): Promise<void> {
  const currentOrder = ordersStore.currentOrder
  if (!currentOrder) return

  // Only auto-cleanup empty draft dine_in orders
  if (
    currentOrder.type === 'dine_in' &&
    currentOrder.status === 'draft' &&
    ordersStore.canDeleteOrder(currentOrder)
  ) {
    const allItems = currentOrder.bills.flatMap(b => b.items)
    if (allItems.length === 0) {
      DebugUtils.info(MODULE_NAME, 'Auto-cleaning empty draft order', {
        orderId: currentOrder.id,
        tableId: currentOrder.tableId
      })
      const result = await ordersStore.deleteOrder(currentOrder.id)
      if (result.success) {
        DebugUtils.info(MODULE_NAME, 'Empty draft order cleaned up successfully')
      } else {
        DebugUtils.warn(MODULE_NAME, 'Failed to cleanup empty draft order', {
          error: result.error
        })
      }
    }
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'TablesSidebar mounted', {
    tablesCount: tables.value.length,
    ordersCount: deliveryOrders.value.length
  })

  // Дополнительная отладка для диагностики
  console.log('🔍 TablesSidebar Debug Info:', {
    totalOrders: ordersStore.orders.length,
    deliveryOrdersComputed: deliveryOrders.value.length,
    allOrders: ordersStore.orders.map(o => ({
      id: o.id,
      type: o.type,
      status: o.status,
      orderNumber: o.orderNumber
    })),
    filteredDeliveryOrders: deliveryOrders.value.map(o => ({
      id: o.id,
      type: o.type,
      status: o.status,
      orderNumber: o.orderNumber
    }))
  })

  // Stores должны быть уже инициализированы в PosMainView
  try {
    loading.value.tables = true
    loading.value.orders = true

    DebugUtils.debug(MODULE_NAME, 'Data loaded', {
      tablesLoaded: tables.value.length,
      ordersLoaded: deliveryOrders.value.length,
      currentOrder: ordersStore.currentOrder?.id
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load data', { error })
  } finally {
    loading.value.tables = false
    loading.value.orders = false
  }
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
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  scroll-behavior: smooth;
}

/* Scrollbar styling */
.scrollable-content::-webkit-scrollbar {
  width: 6px;
}

.scrollable-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.navigation-section {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

/* =============================================
   SECTIONS
   ============================================= */

.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.6);
  padding: 8px 8px 6px 8px;
  background-color: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
}

.online-section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #009688;
  background-color: rgba(0, 150, 136, 0.06);
  border-bottom-color: rgba(0, 150, 136, 0.15);
}

/* =============================================
   LISTS
   ============================================= */

.items-list {
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  background-color: rgba(255, 255, 255, 0.08);
  margin: 0 8px;
  flex-shrink: 0;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 1200px) {
  .section-title {
    font-size: 0.65rem;
    padding: 8px 6px 5px 6px;
  }

  .items-list {
    padding: 4px 6px;
    gap: 3px;
  }
}

@media (max-width: 768px) {
  .new-order-section {
    padding: 6px;
  }

  .section-title {
    font-size: 0.6rem;
    padding: 6px 6px 4px 6px;
  }

  .items-list {
    padding: 4px 6px;
    gap: 2px;
  }
}
</style>
