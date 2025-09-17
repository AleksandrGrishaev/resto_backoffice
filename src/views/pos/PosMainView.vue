<!-- src/views/pos/PosMainView.vue -->
<template>
  <PosLayout>
    <!-- Sidebar: Tables and Orders -->
    <template #sidebar>
      <TablesSidebar @select="handleOrderSelect" />
    </template>

    <!-- Menu Section -->
    <template #menu>
      <MenuSection @add-item="handleAddItemToOrder" />
    </template>

    <!-- Order Section -->
    <template #order>
      <OrderSection
        ref="orderSectionRef"
        :current-order="currentOrder"
        @order-changed="handleOrderChanged"
      />
    </template>
  </PosLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { DebugUtils } from '@/utils'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'
import type { PosOrder } from '@/stores/pos/types'
import PosLayout from '@/layouts/PosLayout.vue'
import TablesSidebar from './tables/TablesSidebar.vue'
import MenuSection from './menu/MenuSection.vue'
import OrderSection from './order/OrderSection.vue'
import { usePosStore } from '../../stores/pos'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'

const MODULE_NAME = 'PosMainView'

// =============================================
// STORES
// =============================================

const tablesStore = usePosTablesStore()
const ordersStore = usePosOrdersStore()
const posStore = usePosStore()
const shiftsStore = useShiftsStore()

// =============================================
// REFS
// =============================================

const orderSectionRef = ref<InstanceType<typeof OrderSection> | null>(null)

// =============================================
// COMPUTED PROPERTIES
// =============================================

/**
 * Текущий активный заказ
 */
const currentOrder = computed(() => ordersStore.currentOrder)

/**
 * Активный счет текущего заказа
 */
const activeBill = computed(() => ordersStore.activeBill)

/**
 * Текущая смена
 */
const currentShift = computed(() => shiftsStore.currentShift)

/**
 * Есть ли активный заказ
 */
const hasActiveOrder = computed(() => {
  return !!currentOrder.value
})

/**
 * Заголовок текущего заказа
 */
const currentOrderTitle = computed(() => {
  if (!currentOrder.value) return 'No Order Selected'

  switch (currentOrder.value.type) {
    case 'dine_in':
      const table = tablesStore.tables.find(t => t.id === currentOrder.value?.tableId)
      return table ? `Table ${table.number}` : 'Table Order'
    case 'takeaway':
      return 'Takeaway Order'
    case 'delivery':
      return 'Delivery Order'
    default:
      return 'Order'
  }
})

/**
 * Подзаголовок текущего заказа
 */
const currentOrderSubtitle = computed(() => {
  if (!currentOrder.value) return 'Select a table or create a new order'
  return `Order #${currentOrder.value.orderNumber || 'Unknown'}`
})

// =============================================
// METHODS
// =============================================

/**
 * Форматирование цены
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

/**
 * Обработка выбора заказа из TablesSidebar
 */
const handleOrderSelect = async (orderId: string): Promise<void> => {
  try {
    DebugUtils.debug(MODULE_NAME, 'Order selected from sidebar', { orderId })

    // Выбираем заказ в store
    ordersStore.selectOrder(orderId)

    DebugUtils.debug(MODULE_NAME, 'Order selected successfully', {
      orderId,
      currentOrderId: ordersStore.currentOrderId,
      activeBillId: ordersStore.activeBillId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to select order'
    DebugUtils.error(MODULE_NAME, 'Error selecting order', { error: message, orderId })
    console.error('Failed to select order:', message)
  }
}

/**
 * Обработка изменений в заказе
 */
const handleOrderChanged = (order: PosOrder): void => {
  DebugUtils.debug(MODULE_NAME, 'Order changed', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    billsCount: order.bills.length
  })
}

/**
 * Получить название счета по типу заказа
 */
const getBillNameForOrderType = (orderType: string): string => {
  switch (orderType) {
    case 'dine_in':
      return 'Bill 1'
    case 'takeaway':
      return 'Takeaway Bill'
    case 'delivery':
      return 'Delivery Bill'
    default:
      return 'Bill'
  }
}

/**
 * Обработка добавления товара из MenuSection
 */
const handleAddItemToOrder = async (item: MenuItem, variant: MenuItemVariant): Promise<void> => {
  try {
    DebugUtils.debug(MODULE_NAME, 'Adding item to order from menu', {
      itemId: item.id,
      itemName: item.name,
      variantId: variant.id,
      variantName: variant.name,
      price: variant.price,
      hasCurrentOrder: !!currentOrder.value,
      currentOrderId: currentOrder.value?.id,
      hasActiveBill: !!activeBill.value,
      activeBillId: activeBill.value?.id
    })

    // Проверяем есть ли активный заказ
    if (!currentOrder.value) {
      console.error('❌ No active order. Please select a table first.')
      alert('No active order. Please select a table first.')
      return
    }

    console.log('🔍 Current order found:', {
      id: currentOrder.value.id,
      type: currentOrder.value.type,
      billsCount: currentOrder.value.bills?.length || 0
    })

    // Проверяем есть ли активный счет
    if (!activeBill.value) {
      DebugUtils.debug(MODULE_NAME, 'No active bill, creating first bill')

      // Создаем первый счет если его нет
      const billName = getBillNameForOrderType(currentOrder.value.type)
      console.log('🧾 Creating first bill:', billName)

      const result = await ordersStore.addBillToOrder(currentOrder.value.id, billName)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create bill')
      }

      console.log('✅ Bill created successfully')
    }

    // Получаем активный счет после возможного создания
    const targetBillId = activeBill.value?.id || ordersStore.activeBillId
    if (!targetBillId) {
      throw new Error('No active bill available after creation')
    }

    console.log('🎯 Target bill ID:', targetBillId)

    // Создаем объект PosMenuItem из MenuItem
    const posMenuItem = {
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      categoryName: item.categoryName || '',
      price: variant.price,
      isAvailable: item.isActive,
      stockQuantity: undefined,
      preparationTime: undefined,
      description: item.description,
      imageUrl: item.imageUrl,
      variants: item.variants?.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
        isAvailable: v.isActive
      })),
      modifications: []
    }

    console.log('📦 Adding POS menu item:', posMenuItem)

    // ИСПРАВЛЕННЫЙ ВЫЗОВ: используем правильную сигнатуру метода
    const addResult = await ordersStore.addItemToBill(
      currentOrder.value.id, // orderId
      targetBillId, // billId
      posMenuItem, // menuItem: PosMenuItem
      1, // quantity
      [] // modifications
    )

    if (!addResult.success) {
      throw new Error(addResult.error || 'Failed to add item to bill')
    }

    DebugUtils.debug(MODULE_NAME, 'Item added to order successfully', {
      itemName: item.name,
      billId: targetBillId,
      billName: activeBill.value?.name
    })

    // Показываем уведомление об успехе
    console.log(`✅ ${item.name} added to ${activeBill.value?.name || 'order'}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add item to order'
    DebugUtils.error(MODULE_NAME, 'Error adding item to order', {
      error: message,
      itemId: item.id,
      itemName: item.name,
      hasCurrentOrder: !!currentOrder.value,
      currentOrderId: currentOrder.value?.id
    })
    console.error('Failed to add item to order:', message)

    // Показываем уведомление об ошибке
    alert(`Error: ${message}`)
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'PosMainView mounted')

  // Инициализируем POS систему
  try {
    const result = await posStore.initializePOS()
    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize POS')
    }

    DebugUtils.debug(MODULE_NAME, 'POS system initialized successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize POS system', { error })
    console.error('POS initialization failed:', error)
  }
})

// =============================================
// WATCHERS
// =============================================

// Отслеживание изменений текущего заказа
watch(
  currentOrder,
  (newOrder, oldOrder) => {
    if (newOrder?.id !== oldOrder?.id) {
      DebugUtils.debug(MODULE_NAME, 'Current order changed', {
        oldOrderId: oldOrder?.id,
        newOrderId: newOrder?.id,
        newOrderType: newOrder?.type,
        billsCount: newOrder?.bills.length || 0
      })
    }
  },
  { deep: true }
)

// Отслеживание статуса смены
watch(
  currentShift,
  shift => {
    if (!shift) {
      DebugUtils.warn(MODULE_NAME, 'No active shift detected')
      console.log('⚠️ No active shift - start shift to continue')
      // TODO: Показать toast notification
    } else {
      DebugUtils.debug(MODULE_NAME, 'Active shift detected', {
        shiftId: shift.id,
        cashierName: shift.cashierName
      })
    }
  },
  { immediate: true } // Проверить сразу при загрузке
)

// Отслеживание статуса сети
watch(
  () => posStore.isOnline,
  isOnline => {
    if (!isOnline) {
      DebugUtils.warn(MODULE_NAME, 'System went offline')
      console.log('⚠️ System is offline')
      // TODO: Показать toast notification
    } else {
      DebugUtils.debug(MODULE_NAME, 'System is online')
    }
  }
)
</script>

<style scoped>
/* Стили обрабатываются PosLayout */
</style>
