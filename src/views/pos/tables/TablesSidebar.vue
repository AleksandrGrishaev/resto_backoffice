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
        @click="handleNewOrder"
      />
    </div>

    <div class="separator" />

    <!-- Scrollable Content -->
    <div class="scrollable-content">
      <!-- Active Delivery/Takeaway Orders Section -->
      <div v-if="activeDeliveryOrders.length > 0" class="orders-section">
        <div class="section-title">Active Orders</div>
        <div
          class="orders-list"
          :class="{ 'orders-list--scrollable': activeDeliveryOrders.length > 4 }"
        >
          <div
            v-for="order in activeDeliveryOrders.slice(0, maxVisibleOrders)"
            :key="order.id"
            class="order-item"
          >
            <v-card
              class="order-card"
              :color="activeOrder?.id === order.id ? 'primary' : undefined"
              :variant="activeOrder?.id === order.id ? 'flat' : 'outlined'"
              @click="handleSelect(order.id)"
            >
              <v-card-text class="order-card-content">
                <v-icon
                  :icon="order.type === 'delivery' ? 'mdi-bike-fast' : 'mdi-shopping'"
                  size="16"
                />
                <span class="order-number">{{ order.orderNumber }}</span>
              </v-card-text>
            </v-card>
          </div>
          <!-- Show scroll indicator if more than 4 orders -->
          <div v-if="activeDeliveryOrders.length > maxVisibleOrders" class="scroll-indicator">
            <v-icon icon="mdi-chevron-down" size="16" color="grey" />
            <span class="text-caption">
              +{{ activeDeliveryOrders.length - maxVisibleOrders }} more
            </span>
          </div>
        </div>
        <div class="separator" />
      </div>

      <!-- Tables Section -->
      <div class="tables-section">
        <div class="section-title">Tables</div>
        <div class="tables-list">
          <TableItem
            v-for="table in tables"
            :key="table.id"
            :table="table"
            :is-active="activeOrder?.id === table.currentOrderId"
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
      @create-order="createOrder"
      @select-dine-in="handleSelectDineIn"
    />

    <!-- Unsaved Changes Dialog -->
    <v-dialog v-model="showUnsavedDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Unsaved Changes</v-card-title>
        <v-card-text>You have unsaved changes. Do you want to continue without saving?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="handleDialogCancel">Cancel</v-btn>
          <v-btn color="primary" @click="handleDialogConfirm">Continue</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DebugUtils } from '@/utils'
import type { Table } from '@/stores/pos/tables/types'
import type { OrderType } from '@/types/order'
import { isTableOccupied, canCreateOrder, canSelectOrder } from '@/stores/pos/tables/types'
import TableItem from './TableItem.vue'
import OrderTypeDialog from './dialogs/OrderTypeDialog.vue'
import PosNavigationMenu from '../components/PosNavigationMenu.vue'

const MODULE_NAME = 'TablesSidebar'

// Constants
const maxVisibleOrders = 4

// State
const pendingAction = ref<(() => void) | null>(null)
const showNewOrderDialog = ref(false)
const showUnsavedDialog = ref(false)
const waitingForTableSelection = ref(false)

// Mock active order for demo
const activeOrder = ref<{ id: string } | null>(null)

// Mock active delivery orders for demo
const activeDeliveryOrders = ref([
  { id: 'order_1', orderNumber: 'D001', type: 'delivery' as OrderType },
  { id: 'order_2', orderNumber: 'T002', type: 'takeaway' as OrderType },
  { id: 'order_3', orderNumber: 'D003', type: 'delivery' as OrderType },
  { id: 'order_4', orderNumber: 'T004', type: 'takeaway' as OrderType },
  { id: 'order_5', orderNumber: 'D005', type: 'delivery' as OrderType },
  { id: 'order_6', orderNumber: 'T006', type: 'takeaway' as OrderType }
])

// Mock tables data - TODO: заменить на реальные данные из store
const tables = ref<Table[]>([
  {
    id: 'table_t1',
    number: 'T1',
    status: 'free',
    capacity: 4,
    floor: 1,
    section: 'main',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_t2',
    number: 'T2',
    status: 'occupied_unpaid',
    capacity: 2,
    floor: 1,
    section: 'main',
    currentOrderId: 'order_mock_1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_t3',
    number: 'T3',
    status: 'free',
    capacity: 6,
    floor: 1,
    section: 'main',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_t4',
    number: 'T4',
    status: 'reserved',
    capacity: 4,
    floor: 1,
    section: 'main',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_t5',
    number: 'T5',
    status: 'free',
    capacity: 8,
    floor: 1,
    section: 'main',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_t6',
    number: 'T6',
    status: 'free',
    capacity: 4,
    floor: 1,
    section: 'main',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_t7',
    number: 'T7',
    status: 'free',
    capacity: 2,
    floor: 1,
    section: 'main',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_t8',
    number: 'T8',
    status: 'free',
    capacity: 6,
    floor: 1,
    section: 'main',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
])

// Emits
const emit = defineEmits<{
  select: [id: string]
  dialogConfirm: []
  dialogCancel: []
}>()

// Methods
const handleNewOrder = () => {
  DebugUtils.debug(MODULE_NAME, 'New order button clicked')

  // Mock check for unsaved changes
  const hasUnsavedChanges = false // TODO: заменить на реальную проверку

  if (hasUnsavedChanges) {
    pendingAction.value = () => {
      showNewOrderDialog.value = true
    }
    showUnsavedDialog.value = true
    return
  }

  showNewOrderDialog.value = true
}

const createOrder = (orderType: OrderType) => {
  DebugUtils.debug(MODULE_NAME, 'Creating order', { orderType })
  console.log(`Creating ${orderType} order`)
  showNewOrderDialog.value = false
  // TODO: Интеграция с реальными stores
}

const handleSelectDineIn = () => {
  DebugUtils.debug(MODULE_NAME, 'Dine-in selected, waiting for table selection')
  waitingForTableSelection.value = true
  showNewOrderDialog.value = false
}

const handleTableSelect = async (table: Table) => {
  DebugUtils.debug(MODULE_NAME, 'Table selected', { tableId: table.id, status: table.status })

  const proceed = async () => {
    if (waitingForTableSelection.value) {
      // Creating new dine-in order for this table
      console.log(`Creating dine-in order for table ${table.number}`)
      waitingForTableSelection.value = false
      return
    }

    if (canSelectOrder(table.status) && table.currentOrderId) {
      console.log(`Selecting existing order for table ${table.number}`)
      activeOrder.value = { id: table.currentOrderId }
      emit('select', table.currentOrderId)
    } else if (canCreateOrder(table.status)) {
      console.log(`Table ${table.number} is free, could create new order`)
    } else {
      DebugUtils.warn(MODULE_NAME, 'Cannot interact with table in current status', {
        tableId: table.id,
        status: table.status
      })
      console.log(`Cannot interact with table ${table.number} (status: ${table.status})`)
    }
  }

  // Mock check for unsaved changes
  const hasUnsavedChanges = false // TODO: заменить на реальную проверку

  if (hasUnsavedChanges) {
    pendingAction.value = proceed
    showUnsavedDialog.value = true
    return
  }

  await proceed()
}

const handleSelect = async (orderId: string) => {
  DebugUtils.debug(MODULE_NAME, 'Order selected', { orderId })
  console.log(`Selecting order: ${orderId}`)
  activeOrder.value = { id: orderId }

  // TODO: Интеграция с реальными stores
  emit('select', orderId)
}

const handleDialogConfirm = () => {
  DebugUtils.debug(MODULE_NAME, 'Dialog confirmed')

  if (pendingAction.value) {
    pendingAction.value()
    pendingAction.value = null
  }

  showUnsavedDialog.value = false
  emit('dialogConfirm')
}

const handleDialogCancel = () => {
  DebugUtils.debug(MODULE_NAME, 'Dialog cancelled')

  pendingAction.value = null
  showUnsavedDialog.value = false
  emit('dialogCancel')
}

// Lifecycle
onMounted(() => {
  DebugUtils.debug(MODULE_NAME, 'TablesSidebar mounted with tables:', tables.value.length)
})
</script>

<style scoped>
.tables-sidebar {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--v-theme-surface);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
}

.new-order-section {
  padding: 8px;
  flex-shrink: 0;
}

.new-order-btn {
  border-radius: 8px !important;
  text-transform: none;
  letter-spacing: 0.0125em;
  font-size: 0.875rem;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
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

.orders-section {
  flex-shrink: 0;
}

.orders-list {
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px; /* Limit height for 4 items + scroll indicator */
}

.orders-list--scrollable {
  overflow-y: auto;
}

.order-item {
  flex-shrink: 0;
}

.order-card {
  height: 44px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.order-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.order-card-content {
  padding: 8px 12px !important;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}

.order-number {
  font-size: 0.875rem;
  font-weight: 500;
}

.scroll-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
}

.tables-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tables-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.navigation-section {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.separator {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.12);
  margin: 0 8px;
  flex-shrink: 0;
}

/* Стили для скроллбара */
.tables-list::-webkit-scrollbar,
.orders-list--scrollable::-webkit-scrollbar {
  width: 4px;
}

.tables-list::-webkit-scrollbar-track,
.orders-list--scrollable::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.tables-list::-webkit-scrollbar-thumb,
.orders-list--scrollable::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.tables-list::-webkit-scrollbar-thumb:hover,
.orders-list--scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
