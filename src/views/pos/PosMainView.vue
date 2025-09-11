<!-- src/views/pos/PosMainView.vue -->
<template>
  <PosLayout>
    <!-- Sidebar: Tables and Orders -->
    <template #sidebar>
      <TablesSidebar @select="handleOrderSelect" />
    </template>

    <!-- Menu Section -->
    <template #menu>
      <MenuSection @add-item="handleAddItem" />
    </template>

    <!-- Order Section -->
    <template #order>
      <OrderSection />
    </template>
  </PosLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { DebugUtils } from '@/utils'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'
import PosLayout from '@/layouts/PosLayout.vue'
import TablesSidebar from './tables/TablesSidebar.vue'
import MenuSection from './menu/MenuSection.vue'
import OrderSection from './order/OrderSection.vue'

const MODULE_NAME = 'PosMainView'

// Stores
const tablesStore = usePosTablesStore()
const ordersStore = usePosOrdersStore()

// State
const mockOrderItems = ref<
  Array<{
    id: string
    name: string
    variant?: string
    quantity: number
    price: number
    notes?: string
  }>
>([])

// Computed
const hasActiveOrder = computed(() => {
  return (
    mockOrderItems.value.length > 0 || tablesStore.currentOrder || ordersStore.currentOrder !== null
  )
})

const currentOrderTitle = computed(() => {
  const activeOrder = ordersStore.currentOrder
  if (activeOrder) {
    return `Table Order`
  }
  return 'No Order Selected'
})

const currentOrderSubtitle = computed(() => {
  const activeOrder = ordersStore.currentOrder
  if (activeOrder) {
    return `Order #${activeOrder.orderNumber || 'Unknown'}`
  }
  return 'Select a table or create a new order'
})

const subtotal = computed(() => {
  return mockOrderItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
})

const serviceTax = computed(() => {
  return subtotal.value * 0.05
})

const governmentTax = computed(() => {
  return subtotal.value * 0.1
})

const total = computed(() => {
  return subtotal.value + serviceTax.value + governmentTax.value
})

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const handleOrderSelect = (orderId: string) => {
  DebugUtils.debug(MODULE_NAME, 'Order selected', { orderId })
  // TODO: Загрузить данные заказа
}

const handleAddItem = (item: MenuItem, variant: MenuItemVariant) => {
  DebugUtils.debug(MODULE_NAME, 'Adding item to order', {
    itemId: item.id,
    itemName: item.name,
    variantId: variant.id,
    variantName: variant.name,
    price: variant.price
  })

  // Проверяем, есть ли уже такая позиция
  const existingItemIndex = mockOrderItems.value.findIndex(
    orderItem => orderItem.id === item.id && orderItem.variant === variant.name
  )

  if (existingItemIndex >= 0) {
    // Увеличиваем количество существующей позиции
    mockOrderItems.value[existingItemIndex].quantity += 1
  } else {
    // Добавляем новую позицию
    mockOrderItems.value.push({
      id: `${item.id}-${variant.id}`,
      name: item.name,
      variant: variant.name,
      quantity: 1,
      price: variant.price
    })
  }

  // TODO: Интеграция с реальными stores
  // await billStore.addItem({
  //   dishId: item.id,
  //   variantId: variant.id,
  //   quantity: 1,
  //   price: variant.price,
  //   status: 'pending'
  // })
}

const incrementItem = (index: number) => {
  if (mockOrderItems.value[index]) {
    mockOrderItems.value[index].quantity += 1
  }
}

const decrementItem = (index: number) => {
  if (mockOrderItems.value[index]) {
    if (mockOrderItems.value[index].quantity > 1) {
      mockOrderItems.value[index].quantity -= 1
    } else {
      // Удаляем позицию если количество становится 0
      mockOrderItems.value.splice(index, 1)
    }
  }
}

const handleSaveBill = () => {
  DebugUtils.debug(MODULE_NAME, 'Saving bill')
  console.log('Save bill clicked')
  // TODO: Сохранение заказа
}

const handlePrintBill = () => {
  DebugUtils.debug(MODULE_NAME, 'Printing bill')
  console.log('Print bill clicked')
  // TODO: Печать чека
}

const handleCheckout = () => {
  DebugUtils.debug(MODULE_NAME, 'Checkout clicked')
  console.log('Checkout clicked - total:', total.value)
  // TODO: Переход к оплате
}

// Provide data and methods to child components
provide('mockOrderItems', mockOrderItems)
provide('incrementItem', incrementItem)
provide('decrementItem', decrementItem)
provide('handleSaveBill', handleSaveBill)
provide('handlePrintBill', handlePrintBill)
provide('handleCheckout', handleCheckout)
provide('formatPrice', formatPrice)
provide('subtotal', subtotal)
provide('serviceTax', serviceTax)
provide('governmentTax', governmentTax)
provide('total', total)
provide('hasActiveOrder', hasActiveOrder)
provide('currentOrderTitle', currentOrderTitle)
provide('currentOrderSubtitle', currentOrderSubtitle)

// Lifecycle
onMounted(() => {
  DebugUtils.debug(MODULE_NAME, 'PosMainView mounted')
})
</script>
