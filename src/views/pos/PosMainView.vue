<!-- src/views/pos/PosMainView.vue - ПЕРЕРАБОТАННЫЙ с Loading/Error состояниями -->
<template>
  <div class="pos-main-container">
    <!-- Loading состояние -->
    <div v-if="showLoadingState" class="pos-loading">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate size="64" color="primary" />
            <h3 class="mt-4">Инициализация POS системы...</h3>
            <p class="text-medium-emphasis">Подготовка рабочего места кассира</p>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Error состояние -->
    <div v-else-if="showErrorState" class="pos-error">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" sm="6" class="text-center">
            <v-icon size="64" color="error" class="mb-4">mdi-cash-register</v-icon>
            <h3 class="mb-4">Проблема с POS системой</h3>
            <p class="text-medium-emphasis mb-6">
              {{ initError }}
            </p>

            <div class="d-flex gap-4 justify-center">
              <v-btn
                color="primary"
                variant="outlined"
                :loading="isLoading"
                @click="retryInitialization"
              >
                Попробовать снова
              </v-btn>

              <v-btn v-if="authStore.isAdmin" color="secondary" variant="text" to="/menu">
                Перейти в админ панель
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Основной POS интерфейс -->
    <PosLayout v-else-if="showMainInterface">
      <!-- Sidebar: Tables and Orders -->
      <template #sidebar>
        <TablesSidebar :has-unsaved-changes="hasUnsavedChanges" @select="handleOrderSelect" />
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

    <!-- Fallback состояние -->
    <div v-else class="pos-fallback">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate size="32" />
            <p class="mt-2">Подготовка POS системы...</p>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosStore } from '@/stores/pos'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { useAuthStore } from '@/stores/auth' // 🆕 ДОБАВЛЕН
import { DebugUtils } from '@/utils'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'
import type { PosOrder } from '@/stores/pos/types'
import PosLayout from '@/layouts/PosLayout.vue'
import TablesSidebar from './tables/TablesSidebar.vue'
import MenuSection from './menu/MenuSection.vue'
import OrderSection from './order/OrderSection.vue'

const MODULE_NAME = 'PosMainView'

// =============================================
// STORES
// =============================================

const tablesStore = usePosTablesStore()
const ordersStore = usePosOrdersStore()
const posStore = usePosStore()
const shiftsStore = useShiftsStore()
const authStore = useAuthStore() // 🆕 ДОБАВЛЕН

// =============================================
// REFS
// =============================================

const orderSectionRef = ref<InstanceType<typeof OrderSection> | null>(null)

// 🆕 НОВЫЕ STATE для инициализации
const isLoading = ref(false)
const initError = ref<string | null>(null)
const isInitialized = ref(false)

// =============================================
// COMPUTED PROPERTIES
// =============================================

// 🆕 НОВЫЕ COMPUTED для состояний
/**
 * Может ли пользователь использовать POS систему
 */
const canUsePOS = computed(() => {
  const roles = authStore.userRoles
  return roles.includes('admin') || roles.includes('cashier')
})

/**
 * Показать ли состояние ошибки
 */
const showErrorState = computed(() => {
  return initError.value || !canUsePOS.value
})

/**
 * Показать ли состояние загрузки
 */
const showLoadingState = computed(() => {
  return isLoading.value && !initError.value
})

/**
 * Показать ли основной интерфейс
 */
const showMainInterface = computed(() => {
  return isInitialized.value && !showErrorState.value && !showLoadingState.value
})

// СУЩЕСТВУЮЩИЕ COMPUTED (сохранены без изменений)
/**
 * Текущий активный заказ
 */
const currentOrder = computed(() => ordersStore.currentOrder)

/**
 * Активный счет текущего заказа
 */
const activeBill = computed(() => ordersStore.activeBill)

/**
 * Есть ли несохраненные изменения в текущем заказе
 */
const hasUnsavedChanges = computed(() => {
  if (!currentOrder.value?.bills) return false
  return currentOrder.value.bills.some(bill => bill.items.some(item => item.status === 'draft'))
})

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

// 🆕 НОВЫЙ МЕТОД: Инициализация POS системы
/**
 * Инициализация POS системы с проверками и обработкой ошибок
 */
const initializePOS = async (): Promise<void> => {
  if (!canUsePOS.value) {
    initError.value = 'У вас нет прав доступа к POS системе'
    return
  }

  try {
    isLoading.value = true
    initError.value = null

    DebugUtils.debug(MODULE_NAME, 'Starting POS initialization...')

    const result = await posStore.initializePOS()

    if (!result.success) {
      throw new Error(result.error || 'Не удалось инициализировать POS систему')
    }

    isInitialized.value = true
    DebugUtils.debug(MODULE_NAME, 'POS system initialized successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    initError.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'POS initialization failed', { error: errorMessage })
  } finally {
    isLoading.value = false
  }
}

// 🆕 НОВЫЙ МЕТОД: Повторная попытка инициализации
/**
 * Повторная попытка инициализации POS системы
 */
const retryInitialization = (): void => {
  initializePOS()
}

// СУЩЕСТВУЮЩИЕ МЕТОДЫ (сохранены без изменений)

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
const handleAddItemToOrder = async (
  item: MenuItem,
  variant: MenuItemVariant,
  selectedModifiers?: import('@/stores/menu/types').SelectedModifier[]
): Promise<void> => {
  try {
    DebugUtils.debug(MODULE_NAME, 'Adding item to order from menu', {
      itemId: item.id,
      itemName: item.name,
      variantId: variant.id,
      variantName: variant.name,
      price: variant.price,
      hasModifiers: !!selectedModifiers?.length,
      modifiersCount: selectedModifiers?.length || 0,
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

    // ИСПРАВЛЕНО: проверяем наличие счетов в заказе, а не activeBill
    if (!currentOrder.value.bills || currentOrder.value.bills.length === 0) {
      DebugUtils.debug(MODULE_NAME, 'No bills in order, creating first bill')

      // Создаем первый счет если его нет
      const billName = getBillNameForOrderType(currentOrder.value.type)
      console.log('🧾 Creating first bill:', billName)

      const result = await ordersStore.addBillToOrder(currentOrder.value.id, billName)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create bill')
      }

      console.log('✅ Bill created successfully')
    } else if (!activeBill.value) {
      // Если счета есть, но activeBillId не установлен, выбираем первый счет
      DebugUtils.debug(MODULE_NAME, 'Bills exist but no active bill, selecting first bill')
      ordersStore.selectBill(currentOrder.value.bills[0].id)
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

    // ИСПРАВЛЕННЫЙ ВЫЗОВ: используем правильную сигнатуру метода с поддержкой модификаторов
    const addResult = await ordersStore.addItemToBill(
      currentOrder.value.id, // orderId
      targetBillId, // billId
      posMenuItem,
      variant, // menuItem: PosMenuItem
      1, // quantity
      [], // modifications (deprecated)
      selectedModifiers // ✨ NEW: selectedModifiers
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

onMounted(() => {
  DebugUtils.debug(MODULE_NAME, 'PosMainView mounted')

  // 🔄 ИЗМЕНЕНО: Вызываем новый метод инициализации
  initializePOS()
})

// =============================================
// WATCHERS (сохранены без изменений)
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

<style lang="scss" scoped>
.pos-main-container {
  height: 100vh;
  overflow: hidden;
}

.pos-loading,
.pos-error,
.pos-fallback {
  height: 100vh;
}

.pos-error {
  .v-icon {
    opacity: 0.6;
  }
}

// Обеспечиваем что POS интерфейс занимает всю высоту
:deep(.pos-layout) {
  height: 100vh;
}

/* Стили обрабатываются PosLayout */
</style>
