<!-- src/views/pos/order/OrderSection.vue -->
<template>
  <div class="order-section">
    <!-- Loading Overlay -->
    <div v-if="loading.global" class="loading-overlay">
      <v-progress-circular indeterminate size="48" />
      <div class="text-body-1 mt-2">{{ loadingMessage }}</div>
    </div>

    <!-- Order Content -->
    <template v-if="currentOrder">
      <div class="order-layout">
        <!-- Fixed Header Section -->
        <div class="order-header">
          <!-- Order Info Header -->
          <OrderInfo
            :order="currentOrder"
            :table-number="tableNumber"
            :can-edit="canEditOrder"
            @change-type="handleOrderTypeChange"
            @change-table="handleTableChange"
            @update-customer="handleCustomerUpdate"
          />
        </div>

        <!-- Scrollable Content Area -->
        <div class="order-content">
          <!-- Bills Management -->
          <BillsManager
            :order="currentOrder"
            :bills="bills"
            :active-bill-id="activeBillId"
            :can-add-bill="canAddBill"
            :can-edit-items="canEditItems"
            :has-unsaved-changes="hasUnsavedChanges"
            @select-bill="handleSelectBill"
            @add-bill="handleAddBill"
            @rename-bill="handleRenameBill"
            @remove-bill="handleRemoveBill"
            @update-item-quantity="handleUpdateItemQuantity"
            @modify-item="handleModifyItem"
            @cancel-item="handleCancelItem"
            @add-note="handleAddNote"
            @apply-discount="handleApplyDiscount"
            @send-to-kitchen="handleSendToKitchen"
            @move-items="handleMoveItems"
            @checkout="handleCheckout"
          />
        </div>

        <!-- Fixed Footer Section -->
        <div class="order-footer">
          <!-- Order Totals -->
          <OrderTotals
            :totals="orderTotals"
            :has-selection="calculations.hasSelection.value"
            :selected-items-count="calculations.selectedItemsCount.value"
            :show-taxes="true"
            :service-tax-rate="5"
            :government-tax-rate="10"
          />

          <!-- Order Actions -->
          <OrderActions
            :order="currentOrder"
            :bills="bills"
            :active-bill="activeBill"
            :has-unsaved-changes="hasUnsavedChanges"
            @save="handleSave"
            @send-to-kitchen="handleSendToKitchenFromActions"
            @print="handlePrint"
            @move="handleMoveFromActions"
            @checkout="handleCheckoutFromActions"
            @release-table="handleReleaseTable"
            @complete-order="handleCompleteOrder"
          />
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="empty-state pa-8">
      <div class="text-center">
        <v-icon size="64" color="grey-darken-2" class="mb-4">mdi-receipt-text-outline</v-icon>
        <div class="text-h6 text-grey-darken-1 mb-2">No Order Selected</div>
        <div class="text-body-2 text-grey-darken-1 mb-4">
          Select a table or create a new order to get started
        </div>
        <v-btn color="primary" variant="flat" @click="handleCreateOrder">
          <v-icon start>mdi-plus</v-icon>
          Create New Order
        </v-btn>
      </div>
    </div>

    <!-- Error Notification -->
    <AppNotification
      :show="error.show"
      :message="error.message"
      :type="error.type === 'error' ? 'error' : 'warning'"
      location="top"
      :timeout="error.timeout"
      @close="clearError"
    />

    <!-- Success Notification -->
    <AppNotification
      :show="success.show"
      :message="success.message"
      type="success"
      location="top"
      :timeout="success.timeout"
      @close="success.show = false"
    />

    <!-- Payment Dialog -->
    <PaymentDialog
      v-model="showPaymentDialog"
      :amount="paymentDialogData.amount"
      :discount="paymentDialogData.discount"
      :service-tax="paymentDialogData.serviceTax"
      :government-tax="paymentDialogData.governmentTax"
      :bill-ids="paymentDialogData.billIds"
      :order-id="paymentDialogData.orderId"
      :items="paymentDialogData.items"
      @confirm="handlePaymentConfirm"
      @cancel="handlePaymentCancel"
    />

    <!-- Add Note Dialog -->
    <AddNoteDialog
      v-model="showAddNoteDialog"
      :existing-note="editingItemNote"
      :readonly="editingItemReadonly"
      @save="handleSaveNote"
      @cancel="handleCancelNote"
    />

    <!-- Item Discount Dialog -->
    <ItemDiscountDialog
      v-model="showItemDiscountDialog"
      :item="discountingItem"
      :bill-id="discountingBillId"
      @success="handleDiscountSuccess"
      @cancel="handleDiscountCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { useMenuStore } from '@/stores/menu'
import { useOrderCalculations } from '@/stores/pos/orders/composables/useOrderCalculations'
import type { PosOrder, PosBill, PosBillItem, OrderType } from '@/stores/pos/types'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'
import AppNotification from '@/components/atoms/feedback/AppNotification.vue'

// Import components
import OrderInfo from './components/OrderInfo.vue'
import BillsManager from './components/BillsManager.vue'
import OrderTotals from './components/OrderTotals.vue'
import OrderActions from './components/OrderActions.vue'
import PaymentDialog from '../payment/PaymentDialog.vue'
import AddNoteDialog from './dialogs/AddNoteDialog.vue'
import ItemDiscountDialog from './dialogs/ItemDiscountDialog.vue'

const MODULE_NAME = 'OrderSection'

// Stores
const ordersStore = usePosOrdersStore()
const tablesStore = usePosTablesStore()
const paymentsStore = usePosPaymentsStore()
const menuStore = useMenuStore()

// Props
interface Props {
  showTaxes?: boolean
  serviceTaxRate?: number
  governmentTaxRate?: number
  debugMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showTaxes: true,
  serviceTaxRate: 5,
  governmentTaxRate: 10,
  debugMode: false
})

// State
const loading = ref({
  global: false,
  calculations: false,
  actions: false
})
const loadingMessage = ref('Processing...')
const error = ref({
  show: false,
  message: '',
  type: 'error' as 'error' | 'warning',
  timeout: 5000
})
const success = ref({
  show: false,
  message: '',
  timeout: 3000
})

const hasUnsavedChanges = ref(false)

// Payment Dialog State
const showPaymentDialog = ref(false)
const paymentDialogData = ref({
  amount: 0,
  discount: 0,
  serviceTax: 0,
  governmentTax: 0,
  billIds: [] as string[],
  orderId: '',
  itemIds: [] as string[],
  items: [] as PosBillItem[]
})

// Add Note Dialog State
const showAddNoteDialog = ref(false)
const editingItemId = ref<string | null>(null)
const editingItemNote = ref('')
const editingItemReadonly = ref(false)

// Item Discount Dialog State
const showItemDiscountDialog = ref(false)
const discountingItemId = ref<string | null>(null)
const discountingBillId = ref<string>('')
const discountingItem = computed(() => {
  if (!discountingItemId.value) return null
  return (
    currentOrder.value?.bills
      .flatMap(bill => bill.items)
      .find(i => i.id === discountingItemId.value) || null
  )
})

// Computed - Main Data
const currentOrder = computed((): PosOrder | null => {
  return ordersStore.currentOrder
})

const bills = computed((): PosBill[] => {
  return currentOrder.value?.bills || []
})

const activeBillId = computed((): string | null => {
  return ordersStore.activeBillId
})

const activeBill = computed((): PosBill | null => {
  return ordersStore.activeBill
})

const tableNumber = computed((): string | null => {
  if (!currentOrder.value?.tableId) return null
  const table = tablesStore.tables.find(t => t.id === currentOrder.value?.tableId)
  return table?.number || null
})

// Order Calculations - using composable
const calculations = useOrderCalculations(() => currentOrder.value?.bills || [], {
  serviceTaxRate: 5,
  governmentTaxRate: 10,
  includeServiceTax: true,
  includeGovernmentTax: true,
  selectedItemIds: () => ordersStore.selectedItemIds,
  activeBillId: () => ordersStore.activeBillId
})

// Computed - Formatted data for OrderTotals
const orderTotals = computed(() => ({
  subtotal: calculations.subtotal.value,
  totalDiscounts: calculations.totalDiscounts.value,
  serviceTax: calculations.serviceTax.value,
  governmentTax: calculations.governmentTax.value,
  finalTotal: calculations.finalTotal.value
}))

const billsBreakdown = computed(() => {
  return (
    calculations.billsBreakdown.value?.map(breakdown => ({
      id: breakdown.id,
      name: breakdown.name,
      itemsCount: breakdown.itemsCount,
      subtotal: breakdown.subtotal || 0,
      totalDiscounts: breakdown.totalDiscounts || 0,
      finalTotal: breakdown.finalTotal || 0,
      paymentStatus: breakdown.paymentStatus || 'unpaid'
    })) || []
  )
})

const orderStats = computed(() => calculations.orderStats?.value)

// Computed - Capabilities
const canEditOrder = computed((): boolean => {
  return !!currentOrder.value && currentOrder.value.status !== 'cancelled'
})

const canAddBill = computed((): boolean => {
  return !!currentOrder.value && currentOrder.value.status === 'draft'
})

const canRemoveBill = computed((): boolean => {
  return !!currentOrder.value && bills.value.length > 1
})

const canEditItems = computed((): boolean => {
  return (
    !!currentOrder.value &&
    currentOrder.value.status !== 'cancelled' &&
    currentOrder.value.paymentStatus !== 'paid'
  )
})

// Methods - Notifications
const showSuccess = (message: string): void => {
  success.value = { show: true, message, timeout: 3000 }
  setTimeout(() => {
    success.value.show = false
  }, 3000)
}

const showError = (message: string, type: 'error' | 'warning' = 'error'): void => {
  error.value = { show: true, message, type, timeout: 5000 }
}

const clearError = (): void => {
  error.value.show = false
}

// Methods - Order Management
const handleCreateOrder = async (): Promise<void> => {
  try {
    loading.value.global = true
    loadingMessage.value = 'Creating new order...'

    // TODO: Implement order creation logic
    showSuccess('New order created successfully')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create order'
    showError(message)
  } finally {
    loading.value.global = false
  }
}

const handleOrderTypeChange = async (newType: OrderType): Promise<void> => {
  if (!currentOrder.value) return

  try {
    loading.value.actions = true
    loadingMessage.value = 'Changing order type...'

    // TODO: Implement order type change logic
    showSuccess(`Order type changed to ${newType}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to change order type'
    showError(message)
  } finally {
    loading.value.actions = false
  }
}

const handleTableChange = async (newTableId: string): Promise<void> => {
  if (!currentOrder.value) return

  try {
    loading.value.actions = true
    loadingMessage.value = 'Moving order to new table...'

    // TODO: Implement table change logic
    showSuccess('Order moved to new table')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to move order'
    showError(message)
  } finally {
    loading.value.actions = false
  }
}

const handleCustomerUpdate = async (customerInfo: any): Promise<void> => {
  if (!currentOrder.value) return

  try {
    // TODO: Implement customer update logic
    showSuccess('Customer information updated')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update customer'
    showError(message)
  }
}

// Methods - Bills Management
const handleSelectBill = (billId: string): void => {
  ordersStore.selectBill(billId)
}

const handleAddBill = async (): Promise<void> => {
  if (!currentOrder.value) return

  try {
    loading.value.actions = true
    loadingMessage.value = 'Adding new bill...'

    const result = await ordersStore.addBillToOrder(currentOrder.value.id, 'New Bill')

    if (result.success) {
      showSuccess('New bill added successfully')
      hasUnsavedChanges.value = true
    } else {
      throw new Error(result.error || 'Failed to add bill')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add bill'
    showError(message)
  } finally {
    loading.value.actions = false
  }
}

const handleRenameBill = async (billId: string, newName: string): Promise<void> => {
  try {
    // TODO: Implement bill rename logic
    showSuccess('Bill renamed successfully')
    hasUnsavedChanges.value = true
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rename bill'
    showError(message)
  }
}

const handleRemoveBill = async (billId: string): Promise<void> => {
  if (!canRemoveBill.value) return

  try {
    // TODO: Implement bill removal logic
    showSuccess('Bill removed successfully')
    hasUnsavedChanges.value = true
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove bill'
    showError(message)
  }
}

// Methods - Items Management
const handleUpdateItemQuantity = async (itemId: string, quantity: number): Promise<void> => {
  if (!currentOrder.value || !activeBillId.value) return

  try {
    const result = await ordersStore.updateItemQuantity(
      currentOrder.value.id,
      activeBillId.value,
      itemId,
      quantity
    )

    if (result.success) {
      showSuccess('Item quantity updated')
      hasUnsavedChanges.value = true

      // Пересчитываем итоги заказа
      await ordersStore.recalculateOrderTotals(currentOrder.value.id)
    } else {
      throw new Error(result.error || 'Failed to update quantity')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update item quantity'
    showError(message)
  }
}

const handleModifyItem = async (itemId: string): Promise<void> => {
  try {
    // TODO: Implement item modification dialog
    console.log('🔧 Modify item:', itemId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to modify item'
    showError(message)
  }
}

const handleCancelItem = async (itemId: string): Promise<void> => {
  if (!currentOrder.value || !activeBillId.value) return

  try {
    const result = await ordersStore.removeItemFromBill(
      currentOrder.value.id,
      activeBillId.value,
      itemId
    )

    if (result.success) {
      showSuccess('Item cancelled successfully')
      hasUnsavedChanges.value = true

      // Пересчитываем итоги заказа
      await ordersStore.recalculateOrderTotals(currentOrder.value.id)
    } else {
      throw new Error(result.error || 'Failed to cancel item')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel item'
    showError(message)
  }
}

const handleAddNote = async (itemId: string): Promise<void> => {
  try {
    console.log('📝 Add note to item:', itemId)

    // Find the item to get existing note and status
    const item = currentOrder.value?.bills.flatMap(bill => bill.items).find(i => i.id === itemId)

    if (!item) {
      showError('Item not found')
      return
    }

    editingItemId.value = itemId
    editingItemNote.value = item.kitchenNotes || ''
    // Set readonly if item has been sent to kitchen (status !== 'draft')
    editingItemReadonly.value = item.status !== 'draft'
    showAddNoteDialog.value = true
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to open note dialog'
    showError(message)
  }
}

const handleSaveNote = async (note: string): Promise<void> => {
  try {
    if (!editingItemId.value || !currentOrder.value) {
      showError('No item selected')
      return
    }

    console.log('💾 Saving note for item:', editingItemId.value, note)

    // Find the bill that contains this item
    const bill = currentOrder.value.bills.find(b => b.items.some(i => i.id === editingItemId.value))

    if (!bill) {
      showError('Bill not found')
      return
    }

    // Update the item with the new note
    const result = await ordersStore.updateItemNote(
      currentOrder.value.id,
      bill.id,
      editingItemId.value,
      note
    )

    if (result.success) {
      showSuccess('Note saved successfully')
    } else {
      showError(result.error || 'Failed to save note')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save note'
    showError(message)
  } finally {
    editingItemId.value = null
    editingItemNote.value = ''
    editingItemReadonly.value = false
  }
}

const handleCancelNote = (): void => {
  editingItemId.value = null
  editingItemNote.value = ''
  editingItemReadonly.value = false
}

const handleApplyDiscount = async (itemId: string): Promise<void> => {
  try {
    console.log('💰 Apply discount to item:', itemId)

    // Find the item and its bill
    const bill = currentOrder.value?.bills.find(b => b.items.some(i => i.id === itemId))

    if (!bill) {
      showError('Bill not found')
      return
    }

    const item = bill.items.find(i => i.id === itemId)

    if (!item) {
      showError('Item not found')
      return
    }

    discountingItemId.value = itemId
    discountingBillId.value = bill.id
    showItemDiscountDialog.value = true
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to open discount dialog'
    showError(message)
  }
}

const handleDiscountSuccess = async (): Promise<void> => {
  try {
    showSuccess('Discount applied successfully')
    hasUnsavedChanges.value = true

    // Recalculate order totals
    if (currentOrder.value) {
      await ordersStore.recalculateOrderTotals(currentOrder.value.id)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to recalculate totals'
    showError(message)
  } finally {
    discountingItemId.value = null
    discountingBillId.value = ''
  }
}

const handleDiscountCancel = (): void => {
  discountingItemId.value = null
  discountingBillId.value = ''
}

// Methods - Actions
const handleSave = async (): Promise<void> => {
  if (!currentOrder.value) return

  try {
    loading.value.actions = true
    loadingMessage.value = 'Saving order...'

    // ИСПРАВИТЬ - переименовать переменную:
    const currentTableNumber = tableNumber.value

    const result = await ordersStore.saveAndNotifyOrder(currentOrder.value.id, currentTableNumber)

    if (result.success && result.data) {
      const { order, notificationsSent } = result.data

      if (notificationsSent) {
        showSuccess('Order saved and sent to kitchen/bar')
      } else {
        showSuccess('Order saved successfully')
      }

      hasUnsavedChanges.value = false // теперь будет работать

      await ordersStore.recalculateOrderTotals(currentOrder.value.id)
    } else {
      throw new Error(result.error || 'Failed to save order')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save order'
    showError(message)
  } finally {
    loading.value.actions = false
    loadingMessage.value = ''
  }
}

const handleSendToKitchen = async (itemIds: string[]): Promise<void> => {
  if (!currentOrder.value) return

  try {
    loading.value.actions = true
    loadingMessage.value = 'Sending to kitchen...'

    const result = await ordersStore.sendOrderToKitchen(currentOrder.value.id, itemIds)

    if (result.success) {
      showSuccess(`${itemIds.length} items sent to kitchen`)
      hasUnsavedChanges.value = true
    } else {
      throw new Error(result.error || 'Failed to send to kitchen')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send to kitchen'
    showError(message)
  } finally {
    loading.value.actions = false
  }
}

const handleSendToKitchenFromActions = async (): Promise<void> => {
  // Send all new items from active bill or selected items
  const itemIds = ordersStore.selectedItemIds

  if (itemIds.length > 0) {
    await handleSendToKitchen(itemIds)
  } else if (activeBill.value) {
    // Send all new items from active bill
    const newItems = activeBill.value.items.filter(item => item.status === 'draft')
    if (newItems.length > 0) {
      await handleSendToKitchen(newItems.map(item => item.id))
    }
  }
}

const handleMoveItems = (itemIds: string[], sourceBillId: string): void => {
  console.log('📦 Move items action:', {
    itemIds,
    sourceBillId,
    count: itemIds.length
  })

  // TODO: Implement move dialog
  showSuccess(`Moving ${itemIds.length} items`)
}

const handleMoveFromActions = (): void => {
  const selectedCount = ordersStore.selectedItemsCount

  if (selectedCount === 0) {
    showError('Please select items to move', 'warning')
    return
  }

  if (activeBillId.value) {
    handleMoveItems(ordersStore.selectedItemIds, activeBillId.value)
  }
}

const handlePrint = (): void => {
  if (!currentOrder.value) return

  console.log('🖨️ Print bill action')

  // TODO: Implement print functionality
  showSuccess('Bill sent to printer')
}

const handleCheckout = async (itemIds: string[], billId: string): Promise<void> => {
  try {
    if (!currentOrder.value) {
      showError('No active order')
      return
    }

    console.log('💳 [OrderSection] Checkout action received:', {
      itemIds,
      billId,
      amount: orderTotals.value.finalTotal,
      itemCount: itemIds.length
    })

    console.log('🔍 [OrderSection] Current selection state:', {
      hasSelection: ordersStore.hasSelection,
      selectedItemsCount: ordersStore.selectedItemsCount,
      selectedItemIds: ordersStore.selectedItemIds,
      calculationScope: calculations.calculationScope.value
    })

    // Найти bills которые нужно оплатить на основе itemIds
    const billIds: string[] = []
    if (itemIds.length > 0) {
      // Оплата выбранных items - найти их bills
      for (const bill of currentOrder.value.bills) {
        const hasSelectedItems = bill.items.some(item => itemIds.includes(item.id))
        if (hasSelectedItems && !billIds.includes(bill.id)) {
          billIds.push(bill.id)
        }
      }
    } else {
      // Оплата всех непоплаченных счетов
      billIds.push(
        ...currentOrder.value.bills
          .filter(bill => bill.paymentStatus !== 'paid')
          .map(bill => bill.id)
      )
    }

    if (billIds.length === 0) {
      showError('No bills to checkout')
      return
    }

    // Собрать items по itemIds для отображения в dialog
    const itemsToShow: PosBillItem[] = []
    for (const bill of currentOrder.value.bills) {
      for (const item of bill.items) {
        if (itemIds.includes(item.id) && item.status !== 'cancelled') {
          itemsToShow.push(item)
        }
      }
    }

    // Пересчитать суммы ТОЛЬКО для unpaid items (itemsToShow)
    // Это важно, потому что itemIds уже отфильтрованы от paid items в OrderActions
    const checkoutSubtotal = itemsToShow.reduce((sum, item) => sum + item.totalPrice, 0)

    // Пропорциональный расчет скидок счетов для выбранных items
    let checkoutDiscount = 0
    for (const billId of billIds) {
      const bill = currentOrder.value.bills.find(b => b.id === billId)
      if (!bill || !bill.discountAmount) continue

      // Найти items из этого счета, которые оплачиваются
      const billItemsToCheckout = itemsToShow.filter(item =>
        bill.items.some(billItem => billItem.id === item.id)
      )

      if (billItemsToCheckout.length === 0) continue

      // Рассчитать пропорцию: сумма оплачиваемых items / общая сумма счета
      const billTotal = bill.items
        .filter(item => item.status !== 'cancelled')
        .reduce((sum, item) => sum + item.totalPrice, 0)

      const checkoutBillTotal = billItemsToCheckout.reduce((sum, item) => sum + item.totalPrice, 0)

      if (billTotal > 0) {
        const proportion = checkoutBillTotal / billTotal
        checkoutDiscount += bill.discountAmount * proportion
      }
    }

    const discountedAmount = checkoutSubtotal - checkoutDiscount
    const checkoutServiceTax = discountedAmount * 0.05
    const checkoutGovernmentTax = discountedAmount * 0.1

    console.log('💳 [OrderSection] Checkout amounts recalculated for unpaid items only:', {
      itemsCount: itemsToShow.length,
      itemIds: itemIds,
      billIds: billIds,
      subtotal: checkoutSubtotal,
      discount: checkoutDiscount,
      serviceTax: checkoutServiceTax,
      governmentTax: checkoutGovernmentTax,
      total: discountedAmount + checkoutServiceTax + checkoutGovernmentTax
    })

    // Открыть Payment Dialog с правильными данными
    paymentDialogData.value = {
      amount: checkoutSubtotal,
      discount: checkoutDiscount,
      serviceTax: checkoutServiceTax,
      governmentTax: checkoutGovernmentTax,
      billIds,
      orderId: currentOrder.value.id,
      itemIds,
      items: itemsToShow
    }

    showPaymentDialog.value = true
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to prepare checkout'
    showError(message)
  }
}

const handlePaymentConfirm = async (paymentData: {
  method: 'cash' | 'card' | 'qr'
  amount: number
  receivedAmount?: number
  change?: number
  billDiscount?: {
    amount: number
    reason: string
    type: string
    value: number
  }
}): Promise<void> => {
  try {
    if (!currentOrder.value) {
      showError('No active order')
      return
    }

    // Save bill discount to order (NOT as item discounts)
    if (paymentData.billDiscount && paymentData.billDiscount.amount > 0) {
      console.log('💰 Saving bill discount to order:', paymentData.billDiscount)
      await ordersStore.saveBillDiscount(
        paymentDialogData.value.billIds[0],
        paymentData.billDiscount.amount,
        paymentData.billDiscount.reason
      )
    }

    // ✅ OPTIMISTIC UI: Close dialog immediately
    showPaymentDialog.value = false

    // Show loading indicator (non-blocking)
    loading.value.actions = true
    loadingMessage.value = 'Processing payment...'

    console.log('💰 Payment confirmed:', {
      ...paymentData,
      billIds: paymentDialogData.value.billIds,
      orderId: paymentDialogData.value.orderId
    })

    // ✅ OPTIMISTIC UI: Update UI immediately (before payment completes)
    // User sees immediate feedback instead of waiting 6 seconds
    const billIds = paymentDialogData.value.billIds

    // Show optimistic success message
    showSuccess(
      `Payment processing... ${billIds.length} bill(s). ${
        paymentData.change ? `Change: Rp ${paymentData.change.toLocaleString('id-ID')}` : ''
      }`
    )

    // Clear selection immediately (optimistic)
    ordersStore.clearSelection()

    // 🔄 Process payment (critical operations only - fast ~500ms)
    // Heavy operations (sales recording, write-offs) run in background
    const result = await paymentsStore.processSimplePayment(
      paymentDialogData.value.orderId,
      paymentDialogData.value.billIds,
      paymentDialogData.value.itemIds,
      paymentData.method,
      paymentData.amount,
      paymentData.receivedAmount
    )

    if (result.success) {
      // Update success message after critical operations complete
      showSuccess(
        `Payment successful! ${billIds.length} bill(s) paid. ${
          paymentData.change ? `Change: Rp ${paymentData.change.toLocaleString('id-ID')}` : ''
        }`
      )
    } else {
      // ❌ Rollback UI on failure
      showError(result.error || 'Payment failed')
      // TODO: Implement full rollback if needed
    }
  } catch (err) {
    // ❌ Rollback UI on error
    const message = err instanceof Error ? err.message : 'Failed to process payment'
    showError(message)
    // TODO: Implement full rollback if needed
  } finally {
    loading.value.actions = false
  }
}

const handlePaymentCancel = (): void => {
  showPaymentDialog.value = false
  console.log('💳 Payment cancelled by user')
}

const handleCheckoutFromActions = (itemIds: string[], amount: number): void => {
  if (activeBillId.value) {
    handleCheckout(itemIds, activeBillId.value)
  }
}

const handleReleaseTable = async (): Promise<void> => {
  if (!currentOrder.value) {
    showError('No active order')
    return
  }

  try {
    loading.value.actions = true
    loadingMessage.value = 'Releasing table...'

    console.log('🍽️ [OrderSection] Releasing table for order:', {
      orderId: currentOrder.value.id,
      tableId: currentOrder.value.tableId,
      orderType: currentOrder.value.type,
      paymentStatus: currentOrder.value.paymentStatus
    })

    // Call the releaseTable method from ordersStore
    const result = await ordersStore.releaseTable(currentOrder.value.id)

    if (result.success) {
      showSuccess('Table released successfully. Guests can now leave.')

      // Clear current order selection (table is now free)
      ordersStore.currentOrderId = null
      ordersStore.activeBillId = null
    } else {
      showError(result.error || 'Failed to release table')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to release table'
    showError(message)
  } finally {
    loading.value.actions = false
    loadingMessage.value = ''
  }
}

const handleCompleteOrder = async (): Promise<void> => {
  if (!currentOrder.value) {
    showError('No active order')
    return
  }

  try {
    loading.value.actions = true
    const orderType = currentOrder.value.type
    loadingMessage.value =
      orderType === 'delivery' ? 'Marking as delivered...' : 'Marking as collected...'

    console.log('📦 [OrderSection] Completing order:', {
      orderId: currentOrder.value.id,
      orderType,
      paymentStatus: currentOrder.value.paymentStatus
    })

    // Call the completeOrder method from ordersStore
    const result = await ordersStore.completeOrder(currentOrder.value.id)

    if (result.success) {
      const message =
        orderType === 'delivery'
          ? 'Order marked as delivered successfully!'
          : 'Order marked as collected successfully!'
      showSuccess(message)

      // Clear current order selection (order is now complete)
      ordersStore.currentOrderId = null
      ordersStore.activeBillId = null
    } else {
      showError(result.error || 'Failed to complete order')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete order'
    showError(message)
  } finally {
    loading.value.actions = false
    loadingMessage.value = ''
  }
}

// Watchers
watch(
  () => currentOrder.value?.id,
  (newOrderId, oldOrderId) => {
    if (newOrderId !== oldOrderId) {
      // При смене заказа сбрасываем состояние
      hasUnsavedChanges.value = false
      ordersStore.clearSelection()
    }
  }
)

watch(
  () => activeBill.value?.items.length,
  (newLength, oldLength) => {
    if (newLength !== undefined && oldLength !== undefined && newLength !== oldLength) {
      // При изменении количества элементов проверяем наличие несохраненных изменений
      hasUnsavedChanges.value =
        activeBill.value?.items.some(item => item.status === 'draft') || false
    }
  }
)

watch(
  () => currentOrder.value?.bills,
  bills => {
    if (!bills) {
      hasUnsavedChanges.value = false
      return
    }

    hasUnsavedChanges.value = bills.some(bill => bill.items.some(item => item.status === 'draft'))
  },
  { deep: true, immediate: true }
)

// Lifecycle
onMounted(() => {
  if (props.debugMode) {
    console.log('🔍 OrderSection mounted in debug mode')
  }
})
</script>

<style scoped>
/* =============================================
   ORDER SECTION LAYOUT
   ============================================= */

.order-section {
  position: relative;
  height: 100vh; /* Занимаем всю высоту viewport */
  background: rgb(var(--v-theme-background));
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Предотвращаем scroll на уровне секции */
}

.order-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* =============================================
   FIXED SECTIONS
   ============================================= */

.order-header {
  flex-shrink: 0; /* Фиксированная высота */
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  z-index: 10;
}

.order-content {
  flex: 1; /* Занимает все доступное пространство */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Контролируем overflow на уровне content */
}

.order-footer {
  flex-shrink: 0; /* Фиксированная высота */
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  z-index: 10;
}

/* =============================================
   LOADING OVERLAY
   ============================================= */

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* =============================================
   EMPTY STATE
   ============================================= */

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .order-section {
    padding: 0;
  }

  .empty-state {
    padding: var(--spacing-lg);
    min-height: 300px;
  }
}

/* =============================================
   ANIMATIONS
   ============================================= */

.order-section {
  animation: fadeIn 0.3s ease;
}

.loading-overlay {
  animation: fadeIn 0.2s ease;
}

.empty-state {
  animation: slideUp 0.4s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =============================================
   FOCUS MANAGEMENT
   ============================================= */

.order-section:focus-within {
  outline: none;
}

/* =============================================
   PRINT STYLES
   ============================================= */

@media print {
  .order-section {
    background: white;
  }

  .loading-overlay,
  .empty-state {
    display: none;
  }
}
</style>
