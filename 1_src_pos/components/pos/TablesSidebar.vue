<!-- src/components/pos/TablesSidebar.vue -->
<template>
  <div class="tables-sidebar">
    <div class="content">
      <!-- New Order Button Section -->
      <div class="new-order-section px-2 py-3">
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
      <div class="scrollable-content app-scrollbar">
        <!-- Active Delivery/Takeaway Orders Section -->
        <div class="orders-section">
          <div class="section-title px-3 py-2">Active Orders</div>
          <div class="orders-list px-2">
            <sidebar-item
              v-for="order in activeDeliveryOrders"
              :key="order.id"
              :type="getOrderDisplayType(order.type)"
              :label="order.orderNumber"
              :icon="order.type === 'delivery' ? 'mdi-bike-fast' : 'mdi-shopping'"
              :is-active="activeOrder?.id === order.id"
              @select="handleSelect(order.id)"
            />
          </div>
        </div>

        <div class="separator" />

        <!-- Scrollable Content Container -->
        <!-- Tables Section -->
        <div class="tables-section">
          <div class="section-title px-3 py-2">Tables</div>
          <div class="tables-list px-2 app-scrollbar">
            <sidebar-item
              v-for="table in tablesStore.tables"
              :key="table.id"
              :label="table.number"
              :icon="isTableOccupied(table.status) ? 'mdi-table-chair' : 'mdi-table'"
              :icon-color="isTableOccupied(table.status) ? 'warning' : undefined"
              :is-active="activeOrder?.id === table.currentOrderId"
              :table-status="table.status"
              @select="handleTableSelect(table)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- New Order Type Dialog -->
    <v-dialog v-model="showNewOrderDialog" max-width="360">
      <v-card>
        <v-card-title class="text-h6">Select Order Type</v-card-title>
        <v-card-text class="pt-4">
          <v-btn-group class="d-flex" divided>
            <v-btn class="flex-1" @click="createNewOrder('takeaway')">
              <v-icon icon="mdi-shopping" class="mr-2" />
              Takeaway
            </v-btn>
            <v-btn class="flex-1" @click="createNewOrder('delivery')">
              <v-icon icon="mdi-bike-fast" class="mr-2" />
              Delivery
            </v-btn>
          </v-btn-group>
        </v-card-text>
      </v-card>
    </v-dialog>

    <div class="actions">
      <user-actions />
    </div>
  </div>

  <!-- Unsaved Changes Dialog -->
  <UnsavedChangesDialog
    v-model="navigationStore.showUnsavedDialog"
    @confirm="handleDialogConfirm"
    @cancel="handleDialogCancel"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTablesStore } from '@/stores/tables.store'
import { useOrderStore } from '@/stores/order.store'
import { DebugUtils } from '@/utils'
import { Table, TableStatus } from '@/types/table'
import { OrderType } from '@/types/order'
import SidebarItem from './SidebarItem.vue'
import UserActions from './UserActions.vue'
import { useNavigationStore } from '@/stores/navigation.store'
import UnsavedChangesDialog from './dialogs/UnsavedChangesDialog.vue'

const MODULE_NAME = 'TablesSidebar'
const tablesStore = useTablesStore()
const orderStore = useOrderStore()
const pendingAction = ref<(() => void) | null>(null)
const navigationStore = useNavigationStore()

const activeOrder = computed(() => tablesStore.activeOrder)

const emit = defineEmits<{
  select: [id: string]
  dialogConfirm: []
  dialogCancel: []
}>()

const showNewOrderDialog = ref(false)

const getOrderDisplayType = (type: OrderType): 'delivery' | 'takeaway' | 'table' => {
  if (type === 'delivery') return 'delivery'
  if (type === 'takeaway') return 'takeaway'
  return 'table'
}

const activeDeliveryOrders = computed(() =>
  tablesStore.activeOrders.filter(order => order.type === 'delivery' || order.type === 'takeaway')
)

const isTableOccupied = (status: TableStatus): boolean => {
  return status === 'occupied_unpaid' || status === 'occupied_paid'
}

const handleNewOrder = () => {
  DebugUtils.debug(MODULE_NAME, 'New order button clicked')

  if (orderStore.hasUnsavedChanges) {
    pendingAction.value = () => {
      showNewOrderDialog.value = true
    }
    // Вместо локального диалога используем NavigationStore
    navigationStore.confirmNavigation().then(confirmed => {
      if (confirmed) {
        pendingAction.value?.()
      }
      pendingAction.value = null
    })
    return
  }

  showNewOrderDialog.value = true
}

const createNewOrder = async (type: OrderType) => {
  DebugUtils.debug(MODULE_NAME, 'Creating new order', { type })
  const orderId = tablesStore.createOrder(type, 'delivery')
  await orderStore.initialize(orderId)

  if (orderStore.bills.length > 0) {
    orderStore.setActiveBill(orderStore.bills[0].id)
    DebugUtils.debug(MODULE_NAME, 'Setting first bill as active', {
      billId: orderStore.bills[0].id
    })
  }
  showNewOrderDialog.value = false
  emit('select', orderId)
}

const handleSelect = async (orderId: string) => {
  DebugUtils.debug(MODULE_NAME, 'Order selected', { orderId })

  const proceed = async () => {
    // Сохраняем текущий orderId для последующей проверки
    const previousOrderId = tablesStore.activeOrder?.id

    // Устанавливаем новый активный заказ
    tablesStore.setActiveOrder(orderId)

    // Дожидаемся инициализации
    await orderStore.initialize(orderId)

    // Теперь, когда счета точно загружены, устанавливаем активный счет
    if (orderStore.bills.length > 0) {
      orderStore.setActiveBill(orderStore.bills[0].id)
      DebugUtils.debug(MODULE_NAME, 'Setting first bill as active', {
        billId: orderStore.bills[0].id
      })
    }

    // Проверяем предыдущий заказ на необходимость очистки
    if (previousOrderId && previousOrderId !== orderId) {
      await tablesStore.checkAndCleanupOrder(previousOrderId)
    }

    emit('select', orderId)
  }

  if (orderStore.hasUnsavedChanges) {
    pendingAction.value = proceed
    navigationStore.confirmNavigation().then(confirmed => {
      if (confirmed) {
        pendingAction.value?.()
      }
      pendingAction.value = null
    })
    return
  }

  proceed()
}

const handleTableSelect = async (table: Table) => {
  DebugUtils.debug(MODULE_NAME, 'Table selected', { tableId: table.id })

  const proceed = async () => {
    // Сохраняем текущий orderId для последующей проверки
    const previousOrderId = tablesStore.activeOrder?.id

    if (isTableOccupied(table.status) && table.currentOrderId) {
      tablesStore.setActiveOrder(table.currentOrderId)
      await orderStore.initialize(table.currentOrderId)

      if (orderStore.bills.length > 0) {
        orderStore.setActiveBill(orderStore.bills[0].id)
        DebugUtils.debug(MODULE_NAME, 'Setting first bill as active', {
          billId: orderStore.bills[0].id
        })
      }

      // Проверяем предыдущий заказ на необходимость очистки
      if (previousOrderId && previousOrderId !== table.currentOrderId) {
        await tablesStore.checkAndCleanupOrder(previousOrderId)
      }

      emit('select', table.currentOrderId)
    } else if (table.status === 'free') {
      // Если был предыдущий заказ, проверяем его перед созданием нового
      if (previousOrderId) {
        await tablesStore.checkAndCleanupOrder(previousOrderId)
      }

      const orderId = tablesStore.createOrder('dine-in', table.id)
      await orderStore.initialize(orderId)

      if (orderStore.bills.length > 0) {
        orderStore.setActiveBill(orderStore.bills[0].id)
        DebugUtils.debug(MODULE_NAME, 'Setting first bill as active', {
          billId: orderStore.bills[0].id
        })
      }
      emit('select', orderId)
    }
  }

  if (orderStore.hasUnsavedChanges) {
    pendingAction.value = proceed
    navigationStore.confirmNavigation().then(confirmed => {
      if (confirmed) {
        pendingAction.value?.()
      }
      pendingAction.value = null
    })
    return
  }

  proceed()
}

// dialog
const handleDialogConfirm = () => {
  if (pendingAction.value) {
    pendingAction.value()
    pendingAction.value = null
  }
  navigationStore.handleConfirm()
  emit('dialogConfirm')
}

const handleDialogCancel = () => {
  pendingAction.value = null
  navigationStore.handleCancel()
  emit('dialogCancel')
}
</script>

<style scoped>
.tables-sidebar {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--app-surface);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.new-order-section {
  flex-shrink: 0;
}

.new-order-btn {
  border-radius: 8% !important; /* Закругление углов */
  text-transform: none;
  letter-spacing: 0.0125em;
  font-size: 0.875rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.0625em;
  color: rgba(255, 255, 255, 0.7);
}

.orders-section,
.tables-section {
  display: flex;
  flex-direction: column;
}

.orders-list,
.tables-list {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-unit);
  padding-bottom: var(--app-spacing-unit);
}

.tables-list {
  flex: 1;
  overflow-y: auto;
}

.separator {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.12);
  margin: 0 var(--app-spacing-unit);
}

.actions {
  padding: var(--app-spacing-unit);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
</style>
