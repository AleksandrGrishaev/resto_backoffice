<template>
  <div class="d-flex flex-column h-100">
    <!-- Order Info -->
    <OrderInfo v-if="activeOrder" :order="activeOrder" @edit="showOrderTypeEditor = true" />

    <!-- Bills Manager -->
    <BillsManager
      :bills="orderStore.bills"
      :active-bill-id="orderStore.activeBillId"
      @select-bill="handleBillSelect"
    />

    <!-- Order Totals -->
    <OrderTotals />

    <!-- Actions -->
    <OrderActions @save="handleSaveBill" @print="handlePrintBill" />

    <!-- Order Type Editor Dialog -->
    <OrderTypeEditor
      v-if="activeOrder"
      v-model="showOrderTypeEditor"
      @confirm="handleOrderTypeChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useOrderStore } from '@/stores/order.store'
import { useTablesStore } from '@/stores/tables.store'
import { OrderTypeChangeData } from '@/types/order'
import { DebugUtils } from '@/utils'

import OrderInfo from './order/OrderInfo.vue'
import BillsManager from './order/BillsManager.vue'
import OrderTotals from './order/OrderTotals.vue'
import OrderActions from './order/OrderActions.vue'
import OrderTypeEditor from './order/OrderTypeEditor.vue'

const MODULE_NAME = 'OrderSection'
const orderStore = useOrderStore()
const tablesStore = useTablesStore()

const showOrderTypeEditor = ref(false)

const activeOrder = computed(() => tablesStore.activeOrder)

const handlePrintBill = () => {
  DebugUtils.debug(MODULE_NAME, 'Printing bill')
  // TODO: Implement printing functionality
}

const handleBillSelect = (billId: string) => {
  DebugUtils.debug(MODULE_NAME, 'Selecting bill', { billId })
  orderStore.setActiveBill(billId)
}

const handleOrderTypeChange = async (data: OrderTypeChangeData) => {
  DebugUtils.debug(MODULE_NAME, 'Changing order type', data)
  try {
    if (!activeOrder.value) {
      throw new Error('No active order')
    }

    // Если меняем на takeaway/delivery, объединяем все счета
    if (data.orderType !== 'dine-in') {
      await orderStore.mergeBills()
    }

    if (data.targetOrderId) {
      // Перемещаем в существующий заказ
      await tablesStore.moveOrderToTable(activeOrder.value.id, data.targetOrderId)
    } else {
      // Меняем тип заказа или перемещаем на новый стол
      await tablesStore.changeOrderType(activeOrder.value.id, data.orderType, data.tableId)
    }

    // Сохраняем состояние
    const activeBillId = orderStore.activeBillId
    if (activeBillId) {
      if (data.type.startsWith('delivery-')) {
        await orderStore.updateBillType(activeBillId, data.type)
      }
      await orderStore.confirmOrder()
    }
  } catch (error) {
    console.error('Failed to change order type:', error)
    // TODO: Show error notification
  }
}

const handleSaveBill = async () => {
  DebugUtils.debug(MODULE_NAME, 'Saving bill', {
    activeOrder: tablesStore.activeOrder,
    currentBills: orderStore.bills,
    hasUnsavedChanges: orderStore.hasUnsavedChanges
  })

  try {
    await orderStore.confirmOrder()
    DebugUtils.debug(MODULE_NAME, 'Bill saved successfully')
  } catch (error) {
    console.error('Failed to save bill:', error)
  }
}

watch(
  () => tablesStore.activeOrder,
  async newOrder => {
    if (newOrder) {
      DebugUtils.debug(MODULE_NAME, 'Active order changed', {
        orderId: newOrder.id,
        type: newOrder.type,
        tableId: newOrder.tableId
      })

      // Always try to get existing data first
      const existingData = tablesStore.getOrderData(newOrder.id)

      if (existingData) {
        DebugUtils.debug(MODULE_NAME, 'Restoring existing order data', {
          billsCount: existingData.bills.length
        })
        await orderStore.initialize(newOrder.id)
      } else {
        DebugUtils.debug(MODULE_NAME, 'Initializing new order data')
        await orderStore.initialize(newOrder.id)
        // Save initial state for new orders
        await tablesStore.saveOrderData(newOrder.id, orderStore.bills)
      }

      // Ensure we have an active bill
      if (orderStore.bills.length > 0 && !orderStore.activeBillId) {
        orderStore.setActiveBill(orderStore.bills[0].id)
      }
    } else {
      // Reset order store when no active order
      orderStore.reset()
    }
  },
  { immediate: true }
)
</script>
