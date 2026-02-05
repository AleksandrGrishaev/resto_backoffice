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
            @move-selected-bill="handleMoveSelectedBill"
            @move-selected-items="handleMoveSelectedItems"
            @delete-order="handleDeleteOrder"
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
            @add-item="handleAddOneMore"
          />
        </div>

        <!-- Fixed Footer Section -->
        <div class="order-footer">
          <!-- Order Totals (always in footer for visibility) -->
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
      @pre-bill-printed="handlePreBillPrinted"
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

    <!-- Item Cancel Dialog -->
    <BillItemCancelDialog
      v-model="showCancelDialog"
      :cancellation-item="cancellationItem"
      @confirm="handleConfirmCancel"
      @cancel="handleCancelDialogClose"
    />

    <!-- Move Items Dialog -->
    <MoveItemsDialog
      v-model="showMoveDialog"
      :source-bill="moveDialogData.sourceBill"
      :target-bills="moveDialogData.targetBills"
      :selected-items="moveDialogData.selectedItems"
      @confirm="handleMoveConfirm"
      @cancel="handleMoveCancel"
    />

    <!-- Order Type Change Dialog -->
    <OrderTypeDialog
      v-model="showOrderTypeDialog"
      :current-order="currentOrder"
      :available-tables="tablesStore.tables"
      @confirm="handleOrderTypeConfirm"
    />

    <!-- Table Selection Dialog (for dine-in orders) -->
    <TableSelectionDialog
      v-model="showTableSelectionDialog"
      :tables="tablesStore.tables"
      :current-table-id="currentOrder?.tableId"
      title="Move Order to Table"
      subtitle="Select a table to move this order to:"
      @confirm="handleTableSelectionConfirm"
      @cancel="handleTableSelectionCancel"
    />

    <!-- Print Receipt Dialog (after payment) -->
    <PrintReceiptDialog
      v-model="showPrintReceiptDialog"
      :receipt-data="printReceiptData.receiptData"
      :payment-method="printReceiptData.paymentMethod"
      :amount="printReceiptData.amount"
      :received-amount="printReceiptData.receivedAmount"
      :change="printReceiptData.change"
      @close="handlePrintReceiptClose"
      @printed="handleReceiptPrinted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useVuetifyBreakpoints } from '@/composables/useVuetifyBreakpoints'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { useMenuStore } from '@/stores/menu'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { useAuthStore } from '@/stores/auth'
import { useAlertsStore } from '@/stores/alerts'
import { useOrderCalculations } from '@/stores/pos/orders/composables/useOrderCalculations'
import type { PosOrder, PosBill, PosBillItem, OrderType, PreBillSnapshot } from '@/stores/pos/types'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'
import {
  compareWithSnapshot,
  requiresRePrint,
  getTimeSincePreBill
} from '@/stores/pos/utils/preBillTracking'
import AppNotification from '@/components/atoms/feedback/AppNotification.vue'

// Import components
import OrderInfo from './components/OrderInfo.vue'
import BillsManager from './components/BillsManager.vue'
import OrderTotals from './components/OrderTotals.vue'
import OrderActions from './components/OrderActions.vue'
import PaymentDialog from '../payment/PaymentDialog.vue'
import PrintReceiptDialog from '../payment/dialogs/PrintReceiptDialog.vue'
import type { ReceiptData } from '@/core/printing/types'
import { usePrinter } from '@/core/printing'
import AddNoteDialog from './dialogs/AddNoteDialog.vue'
import ItemDiscountDialog from './dialogs/ItemDiscountDialog.vue'
import BillItemCancelDialog from './dialogs/BillItemCancelDialog.vue'
import MoveItemsDialog from './dialogs/MoveItemsDialog.vue'
import OrderTypeDialog from './dialogs/OrderTypeDialog.vue'
import TableSelectionDialog from './dialogs/TableSelectionDialog.vue'

const MODULE_NAME = 'OrderSection'

// Viewport detection for responsive layout
const breakpoints = useVuetifyBreakpoints()
const isSmallScreen = computed(() => breakpoints.isSmallScreen.value)

// Stores
const ordersStore = usePosOrdersStore()
const tablesStore = usePosTablesStore()
const paymentsStore = usePosPaymentsStore()
const menuStore = useMenuStore()
const shiftsStore = useShiftsStore()
const authStore = useAuthStore()
const alertsStore = useAlertsStore()

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

// Print Receipt Dialog State
const showPrintReceiptDialog = ref(false)
const printReceiptData = ref<{
  receiptData: ReceiptData | null
  paymentMethod: string
  amount: number
  receivedAmount: number
  change: number
}>({
  receiptData: null,
  paymentMethod: 'cash',
  amount: 0,
  receivedAmount: 0,
  change: 0
})

// Printer
const { settings: printerSettings, isConnected: isPrinterConnected } = usePrinter()

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

// Item Cancel Dialog State
const showCancelDialog = ref(false)
const cancellingItemId = ref<string | null>(null)
const cancellationItem = computed(() => {
  if (!cancellingItemId.value || !currentOrder.value || !activeBillId.value) return null

  const item = currentOrder.value.bills
    .flatMap(bill => bill.items)
    .find(i => i.id === cancellingItemId.value)

  if (!item) return null

  return {
    item,
    orderId: currentOrder.value.id,
    billId: activeBillId.value
  }
})

// Move Items Dialog State
const showMoveDialog = ref(false)
const moveSourceBillId = ref<string | null>(null)
const moveItemIds = ref<string[]>([])
const moveDialogData = computed(() => {
  if (!currentOrder.value || !moveSourceBillId.value) {
    return { sourceBill: null, targetBills: [], selectedItems: [] }
  }

  const sourceBill = currentOrder.value.bills.find(b => b.id === moveSourceBillId.value)
  const targetBills = currentOrder.value.bills.filter(b => b.id !== moveSourceBillId.value)
  const selectedItems = sourceBill?.items.filter(i => moveItemIds.value.includes(i.id)) || []

  return { sourceBill, targetBills, selectedItems }
})

// Order Type Dialog State
const showOrderTypeDialog = ref(false)

// Table Selection Dialog State
const showTableSelectionDialog = ref(false)

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
  if (!currentOrder.value) return false
  // Can add bill while order is not closed/cancelled and not fully paid
  const closedStatuses = ['served', 'collected', 'delivered', 'cancelled']
  return (
    !closedStatuses.includes(currentOrder.value.status) &&
    currentOrder.value.paymentStatus !== 'paid'
  )
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

const handleOrderTypeChange = (): void => {
  if (!currentOrder.value) return
  // Open order type dialog
  showOrderTypeDialog.value = true
}

const handleTableChange = (): void => {
  if (!currentOrder.value) return

  // Validate it's a dine-in order
  if (currentOrder.value.type !== 'dine_in') {
    showError('Only dine-in orders can be moved to a different table', 'warning')
    return
  }

  // Open table selection dialog
  showTableSelectionDialog.value = true
}

// Handler for OrderTypeDialog confirmation
const handleOrderTypeConfirm = async (data: {
  orderType: OrderType
  tableId?: string
  channelId?: string
  channelCode?: string
}): Promise<void> => {
  if (!currentOrder.value) return

  try {
    loading.value.global = true
    showOrderTypeDialog.value = false

    // Case 1: Converting takeaway/delivery to dine-in (with table selection)
    if (data.orderType === 'dine_in' && currentOrder.value.type !== 'dine_in' && data.tableId) {
      loadingMessage.value = 'Converting order to dine-in...'

      const result = await ordersStore.convertOrderToDineIn(currentOrder.value.id, data.tableId)

      if (result.success) {
        showSuccess('Order converted to dine-in successfully')
      } else {
        throw new Error(result.error || 'Failed to convert order to dine-in')
      }
    }
    // Case 2: Other order type changes (dine-in to takeaway/delivery, etc.)
    else {
      loadingMessage.value = `Changing order type to ${data.orderType}...`

      // Update order type directly
      currentOrder.value.type = data.orderType

      // Set channel info if provided (delivery channel)
      if (data.channelId) currentOrder.value.channelId = data.channelId
      if (data.channelCode) currentOrder.value.channelCode = data.channelCode

      // If converting from dine-in to takeaway/delivery, clear table assignment
      if (data.orderType !== 'dine_in' && currentOrder.value.tableId) {
        const tableId = currentOrder.value.tableId
        currentOrder.value.tableId = undefined

        // Free the table
        await tablesStore.freeTable(tableId)
      }

      // Save updated order
      const result = await ordersStore.updateOrder(currentOrder.value)

      if (result.success) {
        showSuccess(`Order type changed to ${data.orderType}`)
      } else {
        throw new Error(result.error || 'Failed to change order type')
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to change order type'
    showError(message)
  } finally {
    loading.value.global = false
    loadingMessage.value = ''
  }
}

// Handler for TableSelectionDialog confirmation
const handleTableSelectionConfirm = async (tableId: string): Promise<void> => {
  if (!currentOrder.value) return

  try {
    loading.value.global = true
    showTableSelectionDialog.value = false

    // Case 1: Moving a selected bill to table
    if (ordersStore.selectedBillsCount === 1) {
      loadingMessage.value = 'Moving bill to table...'

      const selectedBillId = Array.from(ordersStore.selectedBills)[0]
      const result = await ordersStore.moveBillToTable(selectedBillId, tableId)

      if (result.success) {
        showSuccess('Bill moved to table successfully')
        // Deselect the bill after moving
        ordersStore.deselectBill(selectedBillId)
      } else {
        throw new Error(result.error || 'Failed to move bill to table')
      }
    }
    // Case 2: Moving entire order to table
    else {
      loadingMessage.value = 'Moving order to new table...'

      const result = await ordersStore.moveOrderToTable(currentOrder.value.id, tableId)

      if (result.success) {
        showSuccess('Order moved to new table successfully')
      } else {
        throw new Error(result.error || 'Failed to move order to table')
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to move to table'
    showError(message)
  } finally {
    loading.value.global = false
    loadingMessage.value = ''
  }
}

// Handler for TableSelectionDialog cancel
const handleTableSelectionCancel = (): void => {
  showTableSelectionDialog.value = false
}

// Handler for moving selected bill to table
const handleMoveSelectedBill = (): void => {
  if (!currentOrder.value) return

  // Check if exactly one bill is selected
  if (ordersStore.selectedBillsCount !== 1) {
    showError('Please select exactly one bill to move', 'warning')
    return
  }

  // Open table selection dialog
  showTableSelectionDialog.value = true
}

// Handler for moving selected items to table
const handleMoveSelectedItems = (): void => {
  if (!currentOrder.value) return

  // Check if items are selected
  if (ordersStore.selectedItemsCount === 0) {
    showError('Please select items to move', 'warning')
    return
  }

  showError('Moving individual items to another table is not yet implemented', 'warning')
  // TODO: Implement this feature - create new order with selected items on target table
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
  if (!currentOrder.value) return

  try {
    const result = await ordersStore.renameBill(currentOrder.value.id, billId, newName)
    if (result.success) {
      showSuccess('Bill renamed successfully')
    } else {
      showError(result.error || 'Failed to rename bill')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rename bill'
    showError(message)
  }
}

const handleRemoveBill = async (billId: string): Promise<void> => {
  if (!currentOrder.value) return

  try {
    const result = await ordersStore.removeBill(currentOrder.value.id, billId)
    if (result.success) {
      showSuccess('Bill removed successfully')
      // No need to mark unsaved - already saved to DB
    } else {
      showError(result.error || 'Failed to remove bill')
    }
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

const handleCancelItem = (itemId: string): void => {
  if (!currentOrder.value || !activeBillId.value) return

  // Open cancel dialog
  cancellingItemId.value = itemId
  showCancelDialog.value = true
}

const handleConfirmCancel = async (data: {
  itemId: string
  reason?: string
  notes?: string
  shouldWriteOff: boolean
}): Promise<void> => {
  if (!currentOrder.value || !activeBillId.value || !cancellationItem.value) return

  // Close dialog immediately for better UX
  const orderId = currentOrder.value.id
  const item = cancellationItem.value.item
  const itemName = item.menuItemName
  handleCancelDialogClose()

  try {
    // Import and use the cancellation composable
    const { useCancellation } = await import('@/stores/pos/orders/composables')
    const { cancelItem } = useCancellation()

    const result = await cancelItem(
      orderId,
      activeBillId.value!,
      item,
      item.status === 'draft'
        ? undefined
        : {
            reason: data.reason as any,
            notes: data.notes,
            shouldWriteOff: data.shouldWriteOff
          },
      // Write-off callbacks (runs in background)
      data.shouldWriteOff
        ? {
            onSuccess: (operationId: string) => {
              showSuccess(`Write-off completed for ${itemName}`)
              console.log('✅ Background write-off created:', operationId)
            },
            onError: (error: string) => {
              showError(`Write-off failed: ${error}`)
              console.error('❌ Background write-off failed:', error)
            }
          }
        : undefined
    )

    if (result.success) {
      const message = item.status === 'draft' ? 'Item removed' : 'Item cancelled'
      showSuccess(result.writeOffPending ? `${message} (write-off in progress...)` : message)
      hasUnsavedChanges.value = true

      // Recalculate order totals
      await ordersStore.recalculateOrderTotals(orderId)
    } else {
      throw new Error(result.error || 'Failed to cancel item')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel item'
    showError(message)
  }
}

const handleCancelDialogClose = (): void => {
  showCancelDialog.value = false
  cancellingItemId.value = null
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

const handleDiscountSuccess = (): void => {
  // ✅ EGRESS FIX: Don't call recalculateOrderTotals here
  // applyItemDiscount/applyBillDiscount already handles recalculation and persistence
  showSuccess('Discount applied successfully')
  hasUnsavedChanges.value = true
  discountingItemId.value = null
  discountingBillId.value = ''
}

const handleDiscountCancel = (): void => {
  discountingItemId.value = null
  discountingBillId.value = ''
}

// Methods - Add One More Item
const handleAddOneMore = async (itemData: {
  menuItemId: string
  variantId?: string
  variantName?: string
  unitPrice: number
  selectedModifiers?: any[]
  department?: string
}): Promise<void> => {
  if (!currentOrder.value || !activeBillId.value) {
    showError('No active order or bill')
    return
  }

  try {
    // Find the menu item from the menu store
    const menuItem = menuStore.menuItems.find(item => item.id === itemData.menuItemId)
    if (!menuItem) {
      showError('Menu item not found')
      return
    }

    // Find the variant
    const variant = menuItem.variants?.find(v => v.id === itemData.variantId) || {
      id: itemData.variantId || 'default',
      name: itemData.variantName || 'Standard',
      price: itemData.unitPrice,
      isActive: true
    }

    // Create PosMenuItem from MenuItem
    const posMenuItem = {
      id: menuItem.id,
      name: menuItem.name,
      categoryId: menuItem.categoryId,
      categoryName: menuItem.categoryName || '',
      price: variant.price,
      isAvailable: menuItem.isActive,
      stockQuantity: undefined,
      preparationTime: undefined,
      description: menuItem.description,
      imageUrl: menuItem.imageUrl,
      department: itemData.department || menuItem.department || 'kitchen',
      variants: menuItem.variants?.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
        isAvailable: v.isActive
      })),
      modifications: []
    }

    // Add item to bill
    const result = await ordersStore.addItemToBill(
      currentOrder.value.id,
      activeBillId.value,
      posMenuItem,
      variant as any,
      1,
      [],
      itemData.selectedModifiers
    )

    if (result.success) {
      showSuccess(`Added one more ${menuItem.name}`)
      hasUnsavedChanges.value = true
    } else {
      throw new Error(result.error || 'Failed to add item')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add item'
    showError(message)
  }
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
  if (!currentOrder.value || bills.value.length < 2) {
    showError('Need at least 2 bills to move items')
    return
  }

  moveItemIds.value = itemIds
  moveSourceBillId.value = sourceBillId
  showMoveDialog.value = true
}

const handleMoveFromActions = (): void => {
  const selectedCount = ordersStore.selectedItemsCount

  if (selectedCount === 0) {
    showError('Please select items to move', 'warning')
    return
  }

  if (bills.value.length < 2) {
    showError('Need at least 2 bills to move items')
    return
  }

  if (activeBillId.value) {
    handleMoveItems(ordersStore.selectedItemIds, activeBillId.value)
  }
}

const handleMoveConfirm = async (targetBillId: string): Promise<void> => {
  if (!currentOrder.value || !moveSourceBillId.value) return

  try {
    // Move items from source bill to target bill
    for (const itemId of moveItemIds.value) {
      // Find item in source bill
      const sourceBill = currentOrder.value.bills.find(b => b.id === moveSourceBillId.value)
      const itemIndex = sourceBill?.items.findIndex(i => i.id === itemId) ?? -1

      if (sourceBill && itemIndex !== -1) {
        const [item] = sourceBill.items.splice(itemIndex, 1)
        const targetBill = currentOrder.value.bills.find(b => b.id === targetBillId)
        if (targetBill && item) {
          // Update item's billId to new bill
          item.billId = targetBillId
          targetBill.items.push(item)
        }
      }
    }

    // Recalculate totals and save to database (with await!)
    await ordersStore.recalculateOrderTotals(currentOrder.value.id)

    // Clear selection
    ordersStore.clearSelection()

    showSuccess(`Moved ${moveItemIds.value.length} item(s) successfully`)
    hasUnsavedChanges.value = false // Changes are now saved
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to move items'
    showError(message)
  } finally {
    showMoveDialog.value = false
    moveItemIds.value = []
    moveSourceBillId.value = null
  }
}

const handleMoveCancel = (): void => {
  showMoveDialog.value = false
  moveItemIds.value = []
  moveSourceBillId.value = null
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

    // Check for pre-bill modifications before processing payment
    // This runs for each bill being paid
    for (const billId of paymentDialogData.value.billIds) {
      await checkPreBillModifications(billId)
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

      // Show print receipt dialog
      const receiptData = buildPaymentReceiptData(
        paymentData.method,
        paymentData.amount,
        paymentData.receivedAmount || 0,
        paymentData.change || 0
      )

      printReceiptData.value = {
        receiptData,
        paymentMethod: paymentData.method,
        amount: paymentData.amount,
        receivedAmount: paymentData.receivedAmount || 0,
        change: paymentData.change || 0
      }

      showPrintReceiptDialog.value = true
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

// Handle pre-bill printed event - save snapshot to bill for fraud tracking
const handlePreBillPrinted = async (data: {
  billId: string
  snapshot: PreBillSnapshot
  printedAt: string
}): Promise<void> => {
  if (!currentOrder.value) return

  try {
    console.log('📋 [OrderSection] Pre-bill printed, saving snapshot:', {
      billId: data.billId,
      itemCount: data.snapshot.itemCount,
      total: data.snapshot.total
    })

    // Find the bill and update it with pre-bill tracking data
    const bill = currentOrder.value.bills.find((b: PosBill) => b.id === data.billId)
    if (bill) {
      bill.preBillPrintedAt = data.printedAt
      bill.preBillPrintedBy = authStore.currentUser?.id
      bill.preBillSnapshot = data.snapshot
      bill.preBillModifiedAfterPrint = false

      // Save to database
      await ordersStore.updateOrder(currentOrder.value)

      console.log('✅ [OrderSection] Pre-bill snapshot saved successfully')
    }
  } catch (err) {
    console.error('❌ [OrderSection] Failed to save pre-bill snapshot:', err)
    // Don't show error to user - this is a background operation
  }
}

// Check for pre-bill modifications before payment and create alerts if needed
const checkPreBillModifications = async (billId: string): Promise<void> => {
  if (!currentOrder.value) return

  const bill = currentOrder.value.bills.find((b: PosBill) => b.id === billId)
  if (!bill || !bill.preBillSnapshot || !bill.preBillPrintedAt) {
    // No pre-bill was printed, nothing to check
    return
  }

  try {
    // Calculate current total with taxes
    const activeItems = bill.items.filter((item: PosBillItem) => item.status !== 'cancelled')
    const subtotal = activeItems.reduce(
      (sum: number, item: PosBillItem) => sum + item.totalPrice,
      0
    )
    const afterDiscount = subtotal - (bill.discountAmount || 0)
    const currentTotalWithTaxes = afterDiscount + afterDiscount * 0.05 + afterDiscount * 0.1

    // Compare with snapshot
    const changeInfo = compareWithSnapshot(bill, currentTotalWithTaxes, bill.preBillSnapshot)

    if (changeInfo.hasChanges) {
      console.log('⚠️ [OrderSection] Pre-bill modifications detected:', changeInfo)

      // Mark bill as modified
      bill.preBillModifiedAfterPrint = true

      if (requiresRePrint(changeInfo)) {
        // Critical changes - create alert
        await alertsStore.createAlert({
          category: 'shift',
          type: 'pre_bill_modified',
          severity: 'critical',
          title: 'Pre-bill modified before payment',
          description: changeInfo.summary,
          metadata: {
            changes: changeInfo.changes,
            originalTotal: bill.preBillSnapshot.total,
            currentTotal: currentTotalWithTaxes,
            timeSincePrint: getTimeSincePreBill(bill.preBillPrintedAt),
            orderNumber: currentOrder.value.orderNumber,
            tableNumber: tableNumber.value
          },
          shiftId: shiftsStore.currentShift?.id,
          orderId: currentOrder.value.id,
          billId: bill.id,
          userId: authStore.currentUser?.id
        })

        console.log('🚨 [OrderSection] Created pre-bill modification alert')
      }
    }
  } catch (err) {
    console.error('❌ [OrderSection] Failed to check pre-bill modifications:', err)
    // Don't block payment on error
  }
}

// Build receipt data for printing
function buildPaymentReceiptData(
  paymentMethod: string,
  _amount: number, // Used for logging, actual amount comes from paymentDialogData
  receivedAmount: number,
  change: number
): ReceiptData | null {
  if (!currentOrder.value) return null

  const order = currentOrder.value
  const items = paymentDialogData.value.items

  // Build receipt items from order items
  const receiptItems = items.map((item: PosBillItem) => ({
    name: item.menuItemName + (item.variantName ? ` (${item.variantName})` : ''),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    discount: item.discountAmount,
    notes: item.kitchenNotes
  }))

  // Calculate totals
  const subtotal = paymentDialogData.value.amount
  const discount = paymentDialogData.value.discount
  const serviceTax = paymentDialogData.value.serviceTax
  const governmentTax = paymentDialogData.value.governmentTax
  const total = subtotal - discount + serviceTax + governmentTax

  // Generate receipt number with timestamp (YYYYMMDDHHmmss format)
  const now = new Date()
  const timestamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')

  return {
    receiptNumber: `PAY-${timestamp}`,
    orderNumber: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
    tableNumber: tableNumber.value || undefined,
    serverName: order.createdBy || 'Staff',
    dateTime: now,
    items: receiptItems,
    subtotal,
    discount,
    discountReason: undefined,
    serviceTax,
    governmentTax,
    total,
    paymentMethod: paymentMethod as 'cash' | 'card' | 'qr',
    receivedAmount: paymentMethod === 'cash' ? receivedAmount : undefined,
    change: paymentMethod === 'cash' ? change : undefined,
    cashierName: order.createdBy || 'Staff'
  }
}

// Print Receipt Dialog Handlers
const handlePrintReceiptClose = (): void => {
  showPrintReceiptDialog.value = false
  // Reset print receipt data
  printReceiptData.value = {
    receiptData: null,
    paymentMethod: 'cash',
    amount: 0,
    receivedAmount: 0,
    change: 0
  }
}

const handleReceiptPrinted = (): void => {
  console.log('🖨️ Receipt printed successfully')
}

const handleCheckoutFromActions = (itemIds: string[], _amount: number): void => {
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

const handleDeleteOrder = async (): Promise<void> => {
  if (!currentOrder.value) {
    showError('No active order')
    return
  }

  // Verify order can be deleted
  if (!ordersStore.canDeleteOrder(currentOrder.value)) {
    showError('Cannot delete this order. It may have active or paid items.')
    return
  }

  try {
    loading.value.actions = true
    loadingMessage.value = 'Deleting order...'

    console.log('🗑️ [OrderSection] Deleting order:', {
      orderId: currentOrder.value.id,
      orderType: currentOrder.value.type
    })

    const result = await ordersStore.deleteOrder(currentOrder.value.id)

    if (result.success) {
      showSuccess('Order deleted successfully')
      // Order is already cleared from store, UI will update automatically
    } else {
      showError(result.error || 'Failed to delete order')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete order'
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
        activeBill.value?.items.some((item: PosBillItem) => item.status === 'draft') || false
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

    hasUnsavedChanges.value = bills.some((bill: PosBill) =>
      bill.items.some((item: PosBillItem) => item.status === 'draft')
    )
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
  overflow: hidden; /* На десктопе - scroll внутри BillsManager */
  min-height: 0; /* Важно для flexbox */
}

.order-footer {
  flex-shrink: 0; /* Фиксированная высота - никогда не сжимается */
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  z-index: 10;
  padding: 8px; /* Padding для всего footer */
  display: flex;
  flex-direction: column;
  gap: 8px;
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

@media (max-width: 959px) {
  .order-section {
    padding: 0;
  }

  /* На мобильных scroll переходит на уровень order-content */
  .order-content {
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
  }

  /* Стилизация скроллбара для order-content (мобильные) */
  .order-content::-webkit-scrollbar {
    width: 6px;
  }

  .order-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .order-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .order-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Footer остается фиксированным - не скроллится */
  .order-footer {
    padding: 4px; /* Меньше padding на мобильных */
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
