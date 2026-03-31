<!-- src/views/pos/PosMainView.vue - ПЕРЕРАБОТАННЫЙ с Loading/Error состояниями -->
<template>
  <div class="pos-main-container">
    <!-- Loading состояние -->
    <div v-if="showLoadingState" class="pos-loading">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate size="64" color="primary" />
            <h3 class="mt-4">Initializing POS System...</h3>
            <p class="text-medium-emphasis">Preparing cashier workstation</p>
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
            <h3 class="mb-4">POS System Error</h3>
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
                Try Again
              </v-btn>

              <v-btn v-if="authStore.isAdmin" color="secondary" variant="text" to="/menu">
                Go to Admin Panel
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Основной POS интерфейс (всегда показываем, если инициализирован) -->
    <PosLayout v-else-if="showMainInterface">
      <!-- Sidebar: Tables and Orders -->
      <template #sidebar>
        <TablesSidebar
          :has-unsaved-changes="hasUnsavedChanges"
          @select="handleOrderSelect"
          @error="handleSidebarError"
        />
      </template>

      <!-- Menu Section -->
      <template #menu>
        <MenuSection :channel-id="currentChannelId" @add-item="handleAddItemToOrder" />
      </template>

      <!-- Order Section -->
      <template #order>
        <OrderSection ref="orderSectionRef" @order-changed="handleOrderChanged" />
      </template>
    </PosLayout>

    <!-- Fallback состояние -->
    <div v-else class="pos-fallback">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate size="32" />
            <p class="mt-2">Preparing POS System...</p>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- ✅ NEW: No Active Shift Dialog (non-blocking) -->
    <v-dialog v-model="showNoShiftDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 text-center py-6 bg-warning">
          <v-icon size="48" color="white" class="mr-2">mdi-clock-alert-outline</v-icon>
          <br />
          <span class="text-white">No Active Shift</span>
        </v-card-title>
        <v-card-text class="text-center py-6">
          <p class="text-body-1 mb-4">
            You must start a shift before processing orders and payments.
          </p>
          <p class="text-medium-emphasis">
            Starting a shift helps track your sales, cash flow, and ensures accurate reporting.
          </p>
        </v-card-text>
        <v-card-actions class="justify-center pb-6">
          <v-btn
            color="grey"
            variant="text"
            @click="
              tryUnlockAudio()
              showNoShiftDialog = false
            "
          >
            Continue Without Shift
          </v-btn>
          <v-btn
            color="primary"
            size="large"
            @click="
              tryUnlockAudio()
              goToShiftManagement()
            "
          >
            <v-icon left>mdi-play-circle</v-icon>
            Start Shift
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✅ Snackbar for notifications (same style as ProductsView) -->
    <v-snackbar
      v-model="notification.show"
      :color="notification.color"
      timeout="5000"
      location="top right"
    >
      {{ notification.message }}
      <template #actions>
        <v-btn icon="mdi-close" size="small" @click="notification.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router' // ✅ ADDED for navigation
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosStore } from '@/stores/pos'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { useAuthStore } from '@/stores/auth' // 🆕 ДОБАВЛЕН
import { useChannelsStore } from '@/stores/channels'
import { useWakeLock } from '@/core/pwa'
import { unlockOnlineOrderAudio } from '@/stores/pos/orders/useOrdersRealtime'
import { DebugUtils } from '@/utils'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'
import type { PosOrder } from '@/stores/pos/types'
import PosLayout from '@/layouts/PosLayout.vue'
import TablesSidebar from './tables/TablesSidebar.vue'
import MenuSection from './menu/MenuSection.vue'
import OrderSection from './order/OrderSection.vue'

const MODULE_NAME = 'PosMainView'

// =============================================
// STORES & ROUTER
// =============================================

const router = useRouter() // ✅ ADDED
const tablesStore = usePosTablesStore()
const ordersStore = usePosOrdersStore()
const posStore = usePosStore()
const shiftsStore = useShiftsStore()
const authStore = useAuthStore() // 🆕 ДОБАВЛЕН
const channelsStore = useChannelsStore()

// PWA: Wake Lock to keep screen on
const wakeLock = useWakeLock()

// =============================================
// REFS
// =============================================

const orderSectionRef = ref<InstanceType<typeof OrderSection> | null>(null)

// 🆕 НОВЫЕ STATE для инициализации
const isLoading = ref(false)
const initError = ref<string | null>(null)
const isInitialized = ref(false)
const showNoShiftDialog = ref(false) // ✅ NEW: Dialog instead of overlay

// ✅ Snackbar notification system (same pattern as ProductsView)
const notification = ref({
  show: false,
  message: '',
  color: 'success' as 'success' | 'error' | 'warning' | 'info'
})

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
 * Channel ID текущего заказа (для channel-aware menu pricing)
 */
const currentChannelId = computed(() => currentOrder.value?.channelId ?? undefined)

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
    initError.value = 'You do not have access to the POS system'
    return
  }

  try {
    isLoading.value = true
    initError.value = null

    DebugUtils.debug(MODULE_NAME, 'Starting POS initialization...')

    const result = await posStore.initializePOS()

    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize POS system')
    }

    isInitialized.value = true
    DebugUtils.debug(MODULE_NAME, 'POS system initialized successfully')

    // Register cancellation request notification handler
    posStore.onCancellationRequested(order => {
      showNotification(
        `Customer requests cancellation for Order #${order.orderNumber}${order.reason ? ': ' + order.reason : ''}`,
        'warning'
      )
    })

    // Register customer linked via invite QR handler
    posStore.onCustomerLinkedToOrder(info => {
      const name = info.customerName || 'Customer'
      showNotification(`${name} linked to Order #${info.orderNumber}`, 'success')
    })

    // Register online order received handler (sound is auto-played by realtime)
    posStore.onOnlineOrderReceived(order => {
      const name = order.customerName || 'Customer'
      const method = order.fulfillmentMethod === 'self_pickup' ? 'Pickup' : 'Delivery'
      showNotification(
        `New online order #${order.orderNumber} from ${name} (${method}, ${order.itemCount} items)`,
        'info'
      )
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
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

/**
 * ✅ CRITICAL: Перейти к управлению сменами
 */
const goToShiftManagement = (): void => {
  router.push('/pos/shift-management')
}

/**
 * ✅ Show notification to user (same pattern as ProductsView)
 */
const showNotification = (
  message: string,
  color: 'success' | 'error' | 'warning' | 'info' = 'error'
): void => {
  notification.value = {
    show: true,
    message,
    color
  }
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
  // Unlock audio on first interaction (must be FIRST call — before any await)
  tryUnlockAudio()

  try {
    DebugUtils.debug(MODULE_NAME, 'Order selected from sidebar', { orderId })

    // Skip if already selected (TablesSidebar or createOrder already called selectOrder)
    if (ordersStore.currentOrderId === orderId) return

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

    // ✅ Show error notification to user
    showNotification(message, 'error')
  }
}

/**
 * ✅ Handle errors from TablesSidebar
 */
const handleSidebarError = (message: string, type: 'error' | 'warning' | 'info'): void => {
  showNotification(message, type)

  // If it's a shift warning, also show the shift dialog
  if (type === 'warning' && message.includes('shift')) {
    showNoShiftDialog.value = true
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
 * Guard against double-tap on tablets (touch + click = two events)
 */
const addItemInProgress = ref(false)

const handleAddItemToOrder = async (
  item: MenuItem,
  variant: MenuItemVariant,
  selectedModifiers?: import('@/stores/menu/types').SelectedModifier[]
): Promise<void> => {
  // Unlock audio on first interaction (must be FIRST call — before any await)
  tryUnlockAudio()

  if (addItemInProgress.value) return
  addItemInProgress.value = true

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
      const errorMsg = 'No active order. Please select a table first.'
      console.error('❌', errorMsg)
      showNotification(errorMsg, 'warning')
      return
    }

    // 🆕 Валидация консистентности между столом и заказом
    if (currentOrder.value.type === 'dine_in' && currentOrder.value.tableId) {
      const table = tablesStore.getTableById(currentOrder.value.tableId)
      if (table && table.currentOrderId && table.currentOrderId !== currentOrder.value.id) {
        // Рассинхронизация! Стол указывает на другой заказ
        console.warn('⚠️ Table/Order sync mismatch detected, switching to table order', {
          tableOrderId: table.currentOrderId,
          storeOrderId: currentOrder.value.id
        })
        ordersStore.selectOrder(table.currentOrderId)
        showNotification('Order switched to match table state', 'info')
        return // Пользователь должен повторить добавление
      }
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

    // Channel-aware pricing: use channel price if order has a channel
    let effectivePrice = variant.price
    if (currentOrder.value?.channelId) {
      const cp = channelsStore.getChannelPrice(
        currentOrder.value.channelId,
        item.id,
        variant.id,
        variant.price
      )
      effectivePrice = cp.netPrice
    }

    // Создаем объект PosMenuItem из MenuItem
    const posMenuItem = {
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      categoryName: item.categoryName || '',
      price: effectivePrice,
      isAvailable: item.isActive,
      stockQuantity: undefined,
      preparationTime: undefined,
      description: item.description,
      imageUrl: item.imageUrl,
      department: item.department || 'kitchen', // 🔧 FIX: Copy department from menu item
      variants: item.variants?.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
        isAvailable: v.isActive
      })),
      modifications: []
    }

    console.log('📦 Adding POS menu item:', posMenuItem)

    // Create a variant with effective price for the service layer
    const effectiveVariant =
      effectivePrice !== variant.price ? { ...variant, price: effectivePrice } : variant

    // ИСПРАВЛЕННЫЙ ВЫЗОВ: используем правильную сигнатуру метода с поддержкой модификаторов
    const addResult = await ordersStore.addItemToBill(
      currentOrder.value.id, // orderId
      targetBillId, // billId
      posMenuItem,
      effectiveVariant, // variant with channel price
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

    // ✅ Show success notification
    showNotification(`${item.name} added to ${activeBill.value?.name || 'order'}`, 'success')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add item to order'
    DebugUtils.error(MODULE_NAME, 'Error adding item to order', {
      error: message,
      itemId: item.id,
      itemName: item.name,
      hasCurrentOrder: !!currentOrder.value,
      currentOrderId: currentOrder.value?.id
    })

    // ✅ Show user-friendly error notification
    // Check if it's a shift validation error
    if (message.includes('No active shift')) {
      showNotification('⚠️ Please start a shift before adding items to orders', 'warning')
      // Also show the shift dialog
      showNoShiftDialog.value = true
    } else {
      showNotification(message, 'error')
    }
  } finally {
    setTimeout(() => {
      addItemInProgress.value = false
    }, 500)
  }
}

// =============================================
// LIFECYCLE
// =============================================

// Unlock audio on first real user interaction (browser autoplay policy).
// Calls Audio.play() synchronously in the click handler call stack — no async.
const tryUnlockAudio = () => {
  unlockOnlineOrderAudio()
}

onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'PosMainView mounted')

  // 🔄 ИЗМЕНЕНО: Вызываем новый метод инициализации
  initializePOS()

  // PWA: Request wake lock to keep screen on during POS operations
  const wakeLockAcquired = await wakeLock.request()
  if (wakeLockAcquired) {
    DebugUtils.info(MODULE_NAME, 'Screen will stay on during POS session')
  }
})

onUnmounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'PosMainView unmounting')

  // PWA: Release wake lock when leaving POS
  await wakeLock.release()
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

// ✅ UPDATED: Отслеживание статуса смены с показом диалога
watch(
  currentShift,
  shift => {
    if (!shift && isInitialized.value) {
      // Только показываем диалог если инициализация завершена
      DebugUtils.warn(MODULE_NAME, 'No active shift detected')
      console.log('⚠️ No active shift - showing dialog')
      showNoShiftDialog.value = true
    } else if (shift) {
      DebugUtils.debug(MODULE_NAME, 'Active shift detected', {
        shiftId: shift.id,
        cashierName: shift.cashierName
      })
      // Закрываем диалог если смена стала активной
      showNoShiftDialog.value = false
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
