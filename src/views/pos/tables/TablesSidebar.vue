<!-- src/views/pos/tables/TablesSidebar.vue -->
<template>
  <div class="tables-sidebar">
    <!-- New Order Button -->
    <div class="new-order-section pa-3">
      <v-btn color="primary" variant="flat" size="large" block @click="handleNewOrder">
        <v-icon icon="mdi-plus" class="me-2" />
        New Order
      </v-btn>
    </div>

    <v-divider />

    <!-- Active Delivery/Takeaway Orders -->
    <div v-if="activeDeliveryOrders.length > 0" class="delivery-orders-section">
      <div class="section-title pa-3">
        <span class="text-caption text-medium-emphasis">ACTIVE ORDERS</span>
      </div>

      <div class="delivery-orders pa-2">
        <div class="orders-grid">
          <div v-for="order in activeDeliveryOrders" :key="order.id" class="delivery-order-item">
            <v-card
              class="order-card"
              :color="activeOrder?.id === order.id ? 'primary' : undefined"
              :variant="activeOrder?.id === order.id ? 'flat' : 'outlined'"
              @click="handleSelect(order.id)"
            >
              <v-card-text class="pa-2 text-center">
                <v-icon
                  :icon="order.type === 'delivery' ? 'mdi-bike-fast' : 'mdi-shopping'"
                  size="20"
                  class="mb-1"
                />
                <div class="text-caption font-weight-bold">
                  {{ order.orderNumber }}
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </div>
    </div>

    <v-divider v-if="activeDeliveryOrders.length > 0" />

    <!-- Tables Section -->
    <div class="tables-section flex-grow-1">
      <div class="section-title pa-3">
        <span class="text-caption text-medium-emphasis">TABLES</span>
      </div>

      <div class="tables pa-2">
        <div class="tables-grid">
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

    <!-- Order Type Dialog -->
    <OrderTypeDialog
      v-model="showNewOrderDialog"
      @create-order="createOrder"
      @select-dine-in="handleSelectDineIn"
    />

    <!-- Simple Confirmation Dialog for unsaved changes -->
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

const MODULE_NAME = 'TablesSidebar'

// State
const pendingAction = ref<(() => void) | null>(null)
const showNewOrderDialog = ref(false)
const showUnsavedDialog = ref(false)
const waitingForTableSelection = ref(false)

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
    id: 'table_i1',
    number: 'I1',
    status: 'free',
    capacity: 2,
    floor: 1,
    section: 'island',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_i2',
    number: 'I2',
    status: 'occupied_paid',
    capacity: 2,
    floor: 1,
    section: 'island',
    currentOrderId: 'order_mock_3',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_i3',
    number: 'I3',
    status: 'free',
    capacity: 2,
    floor: 1,
    section: 'island',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_i4',
    number: 'I4',
    status: 'free',
    capacity: 2,
    floor: 1,
    section: 'island',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'table_i5',
    number: 'I5',
    status: 'free',
    capacity: 2,
    floor: 1,
    section: 'island',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
])

// Mock active order - TODO: заменить на реальные данные
const activeOrder = ref(null)

// Mock delivery orders - TODO: заменить на реальные данные
const activeDeliveryOrders = computed(() => {
  return [
    {
      id: 'order_delivery_1',
      orderNumber: 'D001',
      type: 'delivery' as OrderType
    },
    {
      id: 'order_takeaway_1',
      orderNumber: 'T001',
      type: 'takeaway' as OrderType
    }
  ]
})

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

const createOrder = async (type: OrderType) => {
  DebugUtils.debug(MODULE_NAME, 'Creating order', { type })

  // For takeaway and delivery, create order immediately
  console.log(`Creating ${type} order`)

  // TODO: Интеграция с реальными stores
  // const orderId = tablesStore.createOrder(type, 'delivery')
  // await orderStore.initialize(orderId)

  showNewOrderDialog.value = false
  emit('select', `mock_order_${type}_${Date.now()}`)
}

const handleSelectDineIn = () => {
  DebugUtils.debug(MODULE_NAME, 'Dine-in selected, waiting for table selection')
  waitingForTableSelection.value = true
}

const handleTableSelect = async (table: Table) => {
  DebugUtils.debug(MODULE_NAME, 'Table selected', {
    tableId: table.id,
    status: table.status,
    currentOrderId: table.currentOrderId,
    waitingForTableSelection: waitingForTableSelection.value
  })

  const proceed = async () => {
    if (canCreateOrder(table.status)) {
      // Create new dine-in order for free table
      DebugUtils.debug(MODULE_NAME, 'Creating new dine-in order for table', { tableId: table.id })

      console.log(`Creating dine-in order for table ${table.number}`)

      // TODO: Интеграция с реальными stores
      // const orderId = tablesStore.createOrder('dine-in', table.id)
      // await orderStore.initialize(orderId)

      waitingForTableSelection.value = false
      emit('select', `mock_order_dine_in_${table.id}`)
    } else if (canSelectOrder(table.status) && table.currentOrderId) {
      // Select existing order for occupied table
      DebugUtils.debug(MODULE_NAME, 'Selecting existing order for table', {
        tableId: table.id,
        orderId: table.currentOrderId
      })

      console.log(`Selecting existing order ${table.currentOrderId} for table ${table.number}`)

      await handleSelect(table.currentOrderId)
      waitingForTableSelection.value = false
    } else {
      DebugUtils.debug(MODULE_NAME, 'Cannot interact with table in current status', {
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
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--v-theme-surface);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
}

.section-title {
  background-color: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.tables-grid,
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
  padding: 4px;
}

.delivery-orders-section,
.tables-section {
  overflow-y: auto;
}

.tables-section {
  flex-grow: 1;
}

.order-card {
  width: 80px;
  height: 80px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.order-card:hover {
  transform: translateY(-2px);
}

.table-item,
.delivery-order-item {
  min-height: 80px;
}
</style>
