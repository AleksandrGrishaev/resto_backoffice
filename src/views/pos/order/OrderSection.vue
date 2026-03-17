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

          <!-- Online Order Details Bar -->
          <div v-if="currentOrder.source === 'website'" class="online-order-bar">
            <div class="online-order-bar-content">
              <div class="online-field">
                <v-icon size="14" class="mr-1">mdi-account</v-icon>
                {{ currentOrder.customerName || 'Guest' }}
              </div>
              <div v-if="currentOrder.customerPhone" class="online-field">
                <v-icon size="14" class="mr-1">mdi-phone</v-icon>
                {{ currentOrder.customerPhone }}
              </div>
              <div v-if="onlineFulfillmentLabel" class="online-field">
                <v-icon size="14" class="mr-1">{{ onlineFulfillmentIcon }}</v-icon>
                {{ onlineFulfillmentLabel }}
              </div>
              <div v-if="onlinePickupLabel" class="online-field">
                <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                {{ onlinePickupLabel }}
              </div>
              <div v-if="currentOrder.comment" class="online-field online-comment">
                <v-icon size="14" class="mr-1" color="warning">mdi-message-text</v-icon>
                {{ currentOrder.comment }}
              </div>
            </div>
          </div>

          <!-- Cancellation Request Banner (website orders) -->
          <CancellationRequestBanner
            v-if="currentOrder.cancellationRequestedAt && !currentOrder.cancellationResolvedAt"
            :order="currentOrder"
            @resolved="handleCancellationResolved"
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
            @open-loyalty="handleOpenBillLoyalty"
            @detach-loyalty="handleDetachBillLoyalty"
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
            @cancel-order="showCancelOrderDialog = true"
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
      :bill-ids="paymentDialogData.billIds"
      :order-id="paymentDialogData.orderId"
      :items="paymentDialogData.items"
      :channel-id="paymentDialogData.channelId"
      :customer-id="paymentBillCustomerId"
      :customer-balance="paymentBillCustomerBalance"
      :customer-name="paymentBillCustomerName"
      :customer-personal-discount="paymentBillPersonalDiscount"
      :customer-discount-note="paymentBillDiscountNote"
      :stamp-card-info="paymentBillLoyaltyCard"
      @confirm="handlePaymentConfirm"
      @cancel="handlePaymentCancel"
      @pre-bill-printed="handlePreBillPrinted"
      @update:customer="handlePaymentLoyaltyCustomer"
      @update:card="handlePaymentLoyaltyCard"
      @open-loyalty="handlePaymentOpenLoyalty"
    />

    <!-- Loyalty Dialog (per-bill: search/attach customer or stamp card) -->
    <LoyaltyDialog
      v-model="showLoyaltyDialog"
      :order-id="currentOrder?.id"
      :customer-id="loyaltyDialogBill?.customerId"
      :stamp-card-id="loyaltyDialogBill?.stampCardId"
      :initial-tab="loyaltyDialogTab"
      @update:customer="handleLoyaltyCustomer"
      @update:card="handleLoyaltyCard"
      @convert-card="handleConvertCard"
    />

    <!-- Convert Card Dialog -->
    <ConvertCardDialog
      v-model="showConvertCardDialog"
      :card-number="loyaltyCard?.cardNumber || ''"
      :customer-id="convertCardCustomerId"
      :customer-name="convertCardCustomerName"
      :stamps="loyaltyCard?.stamps || 0"
      @converted="handleCardConverted"
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

    <!-- Cancel Order Dialog -->
    <CancelOrderDialog
      v-model="showCancelOrderDialog"
      :order="currentOrder"
      @confirm="handleCancelOrderConfirm"
      @cancel="showCancelOrderDialog = false"
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
import { useChannelsStore } from '@/stores/channels'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import { useLoyaltyStore } from '@/stores/loyalty'
import { useCustomersStore, customersService } from '@/stores/customers'
import type { Customer } from '@/stores/customers'
import type { StampCardInfo } from '@/stores/loyalty'
import { formatIDR } from '@/utils'
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
import LoyaltyDialog from '../loyalty/LoyaltyDialog.vue'
import ConvertCardDialog from '../loyalty/ConvertCardDialog.vue'
import PaymentDialog from '../payment/PaymentDialog.vue'
import PrintReceiptDialog from '../payment/dialogs/PrintReceiptDialog.vue'
import type { ReceiptData } from '@/core/printing/types'
import { usePrinter } from '@/core/printing'
import AddNoteDialog from './dialogs/AddNoteDialog.vue'
import ItemDiscountDialog from './dialogs/ItemDiscountDialog.vue'
import BillItemCancelDialog from './dialogs/BillItemCancelDialog.vue'
import MoveItemsDialog from './dialogs/MoveItemsDialog.vue'
import CancelOrderDialog from './dialogs/CancelOrderDialog.vue'
import OrderTypeDialog from './dialogs/OrderTypeDialog.vue'
import TableSelectionDialog from './dialogs/TableSelectionDialog.vue'
import CancellationRequestBanner from './components/CancellationRequestBanner.vue'

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
const channelsStore = useChannelsStore()
const loyaltyStore = useLoyaltyStore()
const customersStore = useCustomersStore()

// Props
interface Props {
  showTaxes?: boolean
  debugMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showTaxes: true,
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
  billIds: [] as string[],
  orderId: '',
  itemIds: [] as string[],
  items: [] as PosBillItem[],
  channelId: ''
})

// Per-bill customer/card for payment dialog (falls back to order-level)
const paymentBill = computed(() => {
  if (!paymentDialogData.value.billIds.length || !currentOrder.value) return null
  return currentOrder.value.bills.find(b => b.id === paymentDialogData.value.billIds[0]) || null
})

const paymentBillCustomerId = computed(() => {
  // Use bill-level customer first
  if (paymentBill.value?.customerId) return paymentBill.value.customerId
  // For multi-bill: check if all bills share the same customer
  const billIds = paymentDialogData.value.billIds
  if (billIds.length > 1 && currentOrder.value) {
    const bills = billIds
      .map(id => currentOrder.value!.bills.find(b => b.id === id))
      .filter(Boolean)
    const cids = [...new Set(bills.map(b => b!.customerId).filter(Boolean))]
    if (cids.length === 1) return cids[0]
  }
  // Fallback to order-level customer (e.g. customer attached before bill creation)
  return currentOrder.value?.customerId || null
})

const paymentBillCustomerName = computed(() => {
  if (paymentBill.value?.customerName) return paymentBill.value.customerName
  const cid = paymentBillCustomerId.value
  if (cid) {
    const c = customersStore.getById(cid)
    if (c) return c.name
  }
  return ''
})

const paymentBillCustomerBalance = computed(() => {
  const cid = paymentBillCustomerId.value
  if (!cid) return 0
  const customer = customersStore.getById(cid)
  return customer?.loyaltyBalance ?? 0
})

const paymentBillPersonalDiscount = computed(() => {
  const cid = paymentBillCustomerId.value
  if (!cid) return 0
  const customer = customersStore.getById(cid)
  return customer?.personalDiscount ?? 0
})

const paymentBillDiscountNote = computed(() => {
  const cid = paymentBillCustomerId.value
  if (!cid) return ''
  const customer = customersStore.getById(cid)
  return customer?.discountNote ?? ''
})

const paymentBillLoyaltyCard = computed(() => {
  // loyaltyCard ref is set when card attached via dialog
  // Only return if the card belongs to this bill
  if (loyaltyCard.value && paymentBill.value?.stampCardId) {
    return loyaltyCard.value
  }
  // If bill has stampCardId but loyaltyCard wasn't loaded yet,
  // trigger async load (the computed will re-evaluate when loyaltyCard updates)
  if (paymentBill.value?.stampCardId && !loyaltyCard.value) {
    loadLoyaltyCardForBill(paymentBill.value.stampCardId)
  }
  return null
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

// Loyalty state (per-bill)
const loyaltyCard = ref<StampCardInfo | null>(null)
const showConvertCardDialog = ref(false)
const showLoyaltyDialog = ref(false)
const loyaltyDialogTab = ref<'scan' | 'card' | 'customer'>('card')
const loyaltyBillId = ref<string | null>(null) // which bill the loyalty dialog is for
let _loadingCardForBillId: string | null = null // prevent duplicate loads

/**
 * Load stamp card info from stampCardId (async, updates loyaltyCard ref).
 * Called when bill has stampCardId but loyaltyCard wasn't hydrated.
 */
async function loadLoyaltyCardForBill(stampCardId: string): Promise<void> {
  if (_loadingCardForBillId === stampCardId) return // already loading
  _loadingCardForBillId = stampCardId
  try {
    const card = await loyaltyStore.getCardById(stampCardId)
    if (card) {
      loyaltyCard.value = card
      console.log('🎯 Auto-loaded stamp card for bill:', card.cardNumber)
    }
  } catch (err) {
    console.error('🎯 Failed to auto-load stamp card:', err)
  } finally {
    _loadingCardForBillId = null
  }
}

/**
 * Auto-hydrate bill customer data from order-level customer (for online orders).
 * Also auto-attach stamp card if customer has one.
 */
async function hydrateOnlineOrderBills(
  order: import('@/stores/pos/types').PosOrder
): Promise<void> {
  if (!order.customerId) return

  let updated = false
  for (const bill of order.bills) {
    // Copy customer from order to bill if missing
    if (!bill.customerId && order.customerId) {
      bill.customerId = order.customerId
      bill.customerName = order.customerName
      updated = true
    }

    // Auto-attach stamp card if customer is on stamps program and bill doesn't have one
    if (bill.customerId && !bill.stampCardId) {
      const billCustomer = customersStore.getById(bill.customerId)
      if (billCustomer?.loyaltyProgram === 'stamps') {
        try {
          const card = await loyaltyStore.getActiveCardByCustomerId(bill.customerId)
          if (card) {
            bill.stampCardId = card.cardId
            updated = true
            console.log('🎯 Auto-attached stamp card to bill:', card.cardNumber, bill.name)
          }
        } catch {
          // Not critical
        }
      }
    }
  }

  if (updated) {
    await ordersStore.updateOrder(order)
  }
}

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

// Cancel Order Dialog State
const showCancelOrderDialog = ref(false)

// Table Selection Dialog State
const showTableSelectionDialog = ref(false)

// Computed - Main Data
const currentOrder = computed((): PosOrder | null => {
  return ordersStore.currentOrder
})

// P1 FIX: Clear loyaltyCard when switching orders + hydrate online order bills
watch(
  () => currentOrder.value?.id,
  newId => {
    loyaltyCard.value = null
    loyaltyBillId.value = null

    // Auto-hydrate bills for online orders (copy customer to bills, attach stamp card)
    if (newId && currentOrder.value?.source === 'website' && currentOrder.value.customerId) {
      hydrateOnlineOrderBills(currentOrder.value)
    }
  }
)

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

// Online order info
const FULFILLMENT_LABELS: Record<string, { label: string; icon: string }> = {
  self_pickup: { label: 'Self Pickup', icon: 'mdi-walk' },
  goshop: { label: 'GoShop', icon: 'mdi-moped' },
  courier: { label: 'Courier', icon: 'mdi-bike-fast' }
}

const onlineFulfillmentLabel = computed(() => {
  const fm = currentOrder.value?.fulfillmentMethod
  return fm ? FULFILLMENT_LABELS[fm]?.label || fm : null
})

const onlineFulfillmentIcon = computed(() => {
  const fm = currentOrder.value?.fulfillmentMethod
  return fm ? FULFILLMENT_LABELS[fm]?.icon || 'mdi-package' : 'mdi-package'
})

const onlinePickupLabel = computed(() => {
  const pt = currentOrder.value?.pickupTime
  if (!pt) return null
  return pt === 'asap' ? 'ASAP' : pt
})

// Order Calculations - using composable
const calculations = useOrderCalculations(() => currentOrder.value?.bills || [], {
  channelId: () => currentOrder.value?.channelId,
  includeTaxes: true,
  selectedItemIds: () => ordersStore.selectedItemIds,
  activeBillId: () => ordersStore.activeBillId
})

// Computed - Formatted data for OrderTotals
const orderTotals = computed(() => ({
  subtotal: calculations.subtotal.value,
  totalDiscounts: calculations.totalDiscounts.value,
  totalTaxes: calculations.totalTaxes.value,
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

// Methods - Cancellation Request
const handleCancellationResolved = (action: 'accept' | 'dismiss'): void => {
  if (action === 'accept') {
    showSuccess('Order cancellation accepted')
  } else {
    showSuccess('Cancellation request dismissed — contact customer')
  }
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

  // Check for items unavailable on the target channel
  if (data.channelId && data.channelId !== currentOrder.value.channelId) {
    const unavailable = await ordersStore.getUnavailableItemsForChannel(
      currentOrder.value.bills,
      data.channelId
    )
    if (unavailable.length > 0) {
      const names = [...new Set(unavailable.map(u => u.itemName))].join(', ')
      showError(
        `Cannot switch channel: the following items are not available on this channel: ${names}`,
        'warning'
      )
      return
    }
  }

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
      const oldChannelId = currentOrder.value.channelId
      if (data.channelId) currentOrder.value.channelId = data.channelId
      if (data.channelCode) currentOrder.value.channelCode = data.channelCode

      // Reprice items if channel changed (e.g., takeaway→GoFood, dine_in→Grab)
      const newChannelId = currentOrder.value.channelId
      if (newChannelId && newChannelId !== oldChannelId) {
        await ordersStore.repriceItemsForChannel(currentOrder.value.bills, newChannelId)
      }

      // If converting from dine-in to takeaway/delivery, clear table assignment
      if (data.orderType !== 'dine_in' && currentOrder.value.tableId) {
        const tableId = currentOrder.value.tableId
        currentOrder.value.tableId = undefined

        // Free the table
        await tablesStore.freeTable(tableId, currentOrder.value.id)
      }

      // Recalculate totals with new channel taxes
      await ordersStore.recalculateOrderTotals(currentOrder.value.id)

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

      // Watchdog: track prepared item cancellations (non-blocking)
      if (item.status === 'cooking' || item.status === 'ready') {
        import('@/core/watchdog/WatchdogService').then(({ onItemCancelled }) => {
          const currentShift = shiftsStore.currentShift
          if (currentShift) {
            onItemCancelled(currentShift.id, item.menuItemName, authStore.user?.name || 'Unknown')
          }
        })
      }
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

    // Channel-aware pricing: use channel price if order has a channel
    let effectivePrice = variant.price
    if (currentOrder.value?.channelId) {
      const cp = channelsStore.getChannelPrice(
        currentOrder.value.channelId,
        menuItem.id,
        variant.id,
        variant.price
      )
      effectivePrice = cp.netPrice
    }

    const effectiveVariant =
      effectivePrice !== variant.price ? { ...variant, price: effectivePrice } : variant

    // Create PosMenuItem from MenuItem
    const posMenuItem = {
      id: menuItem.id,
      name: menuItem.name,
      categoryId: menuItem.categoryId,
      categoryName: menuItem.categoryName || '',
      price: effectivePrice,
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
      effectiveVariant as any,
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

    // Channel-aware tax calculation
    const orderChannelId = currentOrder.value.channelId || ''
    const channel = orderChannelId ? channelsStore.getChannelById(orderChannelId) : null
    const isInclusive = channel?.taxMode === 'inclusive'
    const channelTaxRate = channel?.taxes?.reduce((sum, t) => sum + t.taxPercentage, 0) ?? 15
    const checkoutTaxes = isInclusive ? 0 : discountedAmount * (channelTaxRate / 100)

    console.log('💳 [OrderSection] Checkout amounts recalculated for unpaid items only:', {
      itemsCount: itemsToShow.length,
      itemIds: itemIds,
      billIds: billIds,
      subtotal: checkoutSubtotal,
      discount: checkoutDiscount,
      channelId: orderChannelId,
      taxRate: channelTaxRate,
      taxMode: channel?.taxMode || 'exclusive',
      taxes: checkoutTaxes,
      total: discountedAmount + checkoutTaxes
    })

    // Открыть Payment Dialog с правильными данными
    paymentDialogData.value = {
      amount: checkoutSubtotal,
      discount: checkoutDiscount,
      billIds,
      orderId: currentOrder.value.id,
      itemIds,
      items: itemsToShow,
      channelId: orderChannelId
    }

    // Validate loyalty conflicts for multi-bill checkout
    if (billIds.length > 1) {
      const bills = billIds
        .map(id => currentOrder.value!.bills.find(b => b.id === id))
        .filter(Boolean)
      const customerIds = [...new Set(bills.map(b => b!.customerId).filter(Boolean))]
      const cardIds = [...new Set(bills.map(b => b!.stampCardId).filter(Boolean))]
      const hasCustomerOnSome = bills.some(b => b!.customerId)
      const allHaveCustomer = bills.every(b => b!.customerId)
      const hasCardOnSome = bills.some(b => b!.stampCardId)
      const allHaveCard = bills.every(b => b!.stampCardId)

      // Different customers across bills
      if (customerIds.length > 1) {
        showError(
          'Bills have different customers. Assign the same customer to all bills or pay separately.'
        )
        return
      }
      // Different cards across bills
      if (cardIds.length > 1) {
        showError(
          'Bills have different stamp cards. Assign the same card to all bills or pay separately.'
        )
        return
      }
      // Some bills have customer, some don't
      if (hasCustomerOnSome && !allHaveCustomer) {
        showError(
          "Some bills have a customer and some don't. Assign the same customer to all bills or pay separately."
        )
        return
      }
      // Some bills have card, some don't
      if (hasCardOnSome && !allHaveCard) {
        showError(
          "Some bills have a stamp card and some don't. Assign the same card to all bills or pay separately."
        )
        return
      }
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
    stampCardReward?: {
      stamps: number
      category: string
      categoryIds: string[]
      maxDiscount: number
    }
  }
  pointsRedeemed?: number
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

    // Save bill discount to order (manual discount + loyalty points)
    // Discount is saved on the first bill; paymentsStore sums all bills
    {
      const manualDiscount = paymentData.billDiscount?.amount || 0
      const manualReason = paymentData.billDiscount?.reason || ''
      const pointsDiscount = paymentData.pointsRedeemed || 0
      const totalDiscount = manualDiscount + pointsDiscount

      if (totalDiscount > 0) {
        // Determine reason: points-only, manual-only, or combined
        const reason =
          pointsDiscount > 0 && manualDiscount === 0
            ? 'loyalty_points'
            : manualDiscount > 0 && pointsDiscount === 0
              ? manualReason
              : manualReason // Combined: keep manual reason, points tracked via loyalty_transactions

        console.log('💰 Saving bill discount to order:', {
          manualDiscount,
          pointsDiscount,
          totalDiscount,
          reason
        })

        await ordersStore.saveBillDiscount(
          paymentDialogData.value.billIds[0],
          totalDiscount,
          reason
        )
      }
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

      // 🎯 Redeem loyalty points AFTER payment success (P2 fix: no orphan deductions)
      if (
        paymentData.pointsRedeemed &&
        paymentData.pointsRedeemed > 0 &&
        currentOrder.value?.customerId
      ) {
        try {
          const redeemResult = await loyaltyStore.redeemPoints(
            currentOrder.value.customerId,
            paymentDialogData.value.orderId,
            paymentData.pointsRedeemed
          )
          if (redeemResult.success) {
            console.log(
              `🎯 Points redeemed: ${formatIDR(paymentData.pointsRedeemed)}, remaining: ${formatIDR(redeemResult.newBalance)}`
            )
          }
        } catch (err) {
          console.error('🎯 Points redemption failed (payment already succeeded):', err)
        }
      }

      // 🎯 Record stamp card reward redemption (if reward discount was used)
      if (
        paymentData.billDiscount?.reason === 'stamp_card_reward' &&
        paymentData.billDiscount.stampCardReward &&
        loyaltyCard.value
      ) {
        try {
          await loyaltyStore.createRedemption({
            cardId: loyaltyCard.value.cardId,
            cycle: loyaltyCard.value.cycle,
            orderId: paymentDialogData.value.orderId,
            paymentId: result.data?.id || null,
            discountEventId: null, // filled later by saveBillDiscount if available
            rewardTier: paymentData.billDiscount.stampCardReward.stamps,
            category: paymentData.billDiscount.stampCardReward.category,
            categoryIds: paymentData.billDiscount.stampCardReward.categoryIds,
            maxDiscount: paymentData.billDiscount.stampCardReward.maxDiscount,
            actualDiscount: paymentData.billDiscount.amount,
            stampsAtRedemption: loyaltyCard.value.stamps
          })
          console.log(
            '🎯 Stamp card reward redeemed:',
            paymentData.billDiscount.stampCardReward.category
          )
        } catch (err) {
          console.error(
            '🎯 Stamp reward redemption record failed (payment already succeeded):',
            err
          )
        }
      }

      // 🎯 Post-payment loyalty hooks (non-blocking)
      // Cashback/stamps based on actual money paid, NOT including redeemed points
      // Use bill-level customer (not order-level) for correct multi-bill loyalty
      processLoyaltyAfterPayment(
        paymentDialogData.value.orderId,
        paymentDialogData.value.billIds,
        paymentData.amount
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

// ===== LOYALTY HANDLERS =====

/**
 * Non-blocking post-payment processing (BILL-LEVEL customer):
 * 1. ALWAYS update customer stats (total_spent, total_visits, etc.)
 * 2. If loyalty enabled → apply cashback (tier-based %)
 * 3. If stamp card attached & loyalty enabled → add stamps
 *
 * Customer is resolved from BILL first, then falls back to ORDER.
 * Stamp card is resolved: loyaltyCard ref → bill.stampCardId → customer's active card.
 */
async function processLoyaltyAfterPayment(
  orderId: string,
  billIds: string[],
  paidAmount: number
): Promise<void> {
  const order = ordersStore.orders.find(o => o.id === orderId)
  if (!order) return

  // Resolve customer from BILL level (first bill with a customer wins)
  const paidBills = billIds
    .map(id => order.bills.find(b => b.id === id))
    .filter(Boolean) as import('@/stores/pos/types').PosBill[]
  const billCustomerId = paidBills.find(b => b.customerId)?.customerId || order.customerId || null

  if (!billCustomerId) return // No customer — nothing to do

  const customer = customersStore.getById(billCustomerId)
  const loyaltyDisabled = customer?.disableLoyaltyAccrual === true

  // 1. ALWAYS update customer stats (regardless of loyalty settings)
  try {
    const statsResult = await customersService.updateStats(billCustomerId, orderId, paidAmount)
    if (statsResult.success) {
      console.log(
        `📊 Customer stats updated: ${customer?.name} — visits: ${statsResult.totalVisits}, spent: ${formatIDR(statsResult.totalSpent || 0)}`
      )
      if (statsResult.tierChanged) {
        showSuccess(`${customer?.name} upgraded to ${statsResult.tier?.toUpperCase()}!`)
      }
      await customersStore.refreshCustomer(billCustomerId)
    }
  } catch (err) {
    console.error('📊 Customer stats update failed:', err)
  }

  // 2. Apply cashback for digital loyalty customer (only if loyalty enabled AND on cashback program)
  const onCashbackProgram = customer?.loyaltyProgram === 'cashback'
  if (!loyaltyDisabled && onCashbackProgram) {
    try {
      const result = await loyaltyStore.applyCashback(billCustomerId, orderId, paidAmount)
      if (result.success) {
        console.log(
          `🎯 Cashback applied: ${formatIDR(result.cashback)} (${result.cashbackPct}% ${result.tier})`
        )
        showSuccess(
          `Cashback +${formatIDR(result.cashback)} (${result.cashbackPct}%). Balance: ${formatIDR(result.newBalance)}`
        )
      }
    } catch (err) {
      console.error('🎯 Cashback failed:', err)
    }
  } else if (loyaltyDisabled) {
    console.log('🎯 Cashback skipped: loyalty accrual disabled for', customer?.name)
  } else if (!onCashbackProgram) {
    console.log('🎯 Cashback skipped: customer on stamps program', customer?.name)
  }

  // 3. Add stamps — resolve card: loyaltyCard ref → bill.stampCardId → customer's active card
  let card = loyaltyCard.value
  if (!card) {
    // Try to load from bill's stampCardId
    const billStampCardId = paidBills.find(b => b.stampCardId)?.stampCardId
    if (billStampCardId) {
      try {
        card = await loyaltyStore.getCardById(billStampCardId)
      } catch (err) {
        console.error('🎯 Failed to load stamp card from bill:', err)
      }
    }
    // Fallback: find customer's active stamp card
    if (!card) {
      try {
        card = await loyaltyStore.getActiveCardByCustomerId(billCustomerId)
      } catch (err) {
        console.error('🎯 Failed to find customer stamp card:', err)
      }
    }
  }

  const onStampsProgram = customer?.loyaltyProgram !== 'cashback'
  if (card && card.status === 'active' && !loyaltyDisabled && onStampsProgram) {
    try {
      const result = await loyaltyStore.addStamps(card.cardNumber, orderId, paidAmount)
      if (result.success && result.stampsAdded > 0) {
        console.log(
          `🎯 Stamps added: +${result.stampsAdded} (total: ${result.totalStamps}/${result.stampsPerCycle})`
        )
        showSuccess(
          `+${result.stampsAdded} stamp(s)! Total: ${result.totalStamps}/${result.stampsPerCycle}`
        )
        if (result.newCycle) {
          showSuccess('Stamp cycle complete! New cycle started.')
          await customersStore.refreshCustomer(billCustomerId)
          console.log('🎯 Customer upgraded to cashback program after stamp cycle completion')
        }
      }
    } catch (err) {
      console.error('🎯 Stamp failed:', err)
    }
  } else if (loyaltyDisabled && card) {
    console.log('🎯 Stamps skipped: loyalty accrual disabled for', customer?.name)
  } else if (card && !onStampsProgram) {
    console.log('🎯 Stamps skipped: customer on cashback program', customer?.name)
  }
}

// Loyalty handlers for PaymentDialog inline search
const handlePaymentLoyaltyCustomer = async (customer: Customer | null): Promise<void> => {
  if (!currentOrder.value) return
  const billIds = paymentDialogData.value.billIds
  if (!billIds.length) return

  // Update ALL bills in the checkout
  for (const billId of billIds) {
    const bill = currentOrder.value.bills.find(b => b.id === billId)
    if (!bill) continue
    bill.customerId = customer?.id
    bill.customerName = customer?.name
  }

  if (customer) {
    currentOrder.value.customerId = customer.id
    currentOrder.value.customerName = customer.name
    // Ensure customer is in store cache with fresh balance
    try {
      await customersStore.refreshCustomer(customer.id)
    } catch {
      /* not critical */
    }

    // Auto-attach stamp card if customer has one and no card is attached yet
    if (!loyaltyCard.value) {
      try {
        const card = await loyaltyStore.getActiveCardByCustomerId(customer.id)
        if (card) {
          loyaltyCard.value = card
          // Also set stampCardId on bills
          for (const billId of billIds) {
            const bill = currentOrder.value.bills.find(b => b.id === billId)
            if (bill) bill.stampCardId = card.cardId
          }
          console.log('🎯 Auto-attached stamp card:', card.cardNumber)
        }
      } catch {
        /* not critical */
      }
    }
  }

  await ordersStore.updateOrder(currentOrder.value)
  console.log(
    '🎯 Payment loyalty customer:',
    customer?.name || 'detached',
    `(${billIds.length} bills)`
  )
}

const handlePaymentLoyaltyCard = async (card: StampCardInfo | null): Promise<void> => {
  if (!currentOrder.value) return
  const billIds = paymentDialogData.value.billIds
  if (!billIds.length) return

  loyaltyCard.value = card

  // Update ALL bills in the checkout
  for (const billId of billIds) {
    const bill = currentOrder.value.bills.find(b => b.id === billId)
    if (!bill) continue

    bill.stampCardId = card?.cardId || undefined

    if (card?.customerId && !bill.customerId) {
      bill.customerId = card.customerId
      const linkedCustomer = customersStore.getById(card.customerId)
      if (linkedCustomer) {
        bill.customerName = linkedCustomer.name
      }
    }
  }

  currentOrder.value.stampCardId = card?.cardId || undefined
  if (card?.customerId && !currentOrder.value.customerId) {
    currentOrder.value.customerId = card.customerId
    const linkedCustomer = customersStore.getById(card.customerId)
    if (linkedCustomer) {
      currentOrder.value.customerName = linkedCustomer.name
    }
  }

  await ordersStore.updateOrder(currentOrder.value)
  console.log(
    '🎯 Payment loyalty card:',
    card?.cardNumber || 'detached',
    `(${billIds.length} bills)`
  )
}

// Open LoyaltyDialog from PaymentDialog (uses first bill as context)
const handlePaymentOpenLoyalty = (tab: 'card' | 'customer') => {
  const billId = paymentDialogData.value.billIds[0]
  if (!billId) return
  loyaltyBillId.value = billId
  loyaltyDialogTab.value = tab
  showLoyaltyDialog.value = true
}

const handleDetachBillLoyalty = async (billId: string, what: 'card' | 'customer') => {
  if (!currentOrder.value) return
  const bill = currentOrder.value.bills.find(b => b.id === billId)
  if (!bill) return

  if (what === 'customer') {
    bill.customerId = undefined
    bill.customerName = undefined
    // Clear order-level if no other bill has a customer
    const anyCustomer = currentOrder.value.bills.some(b => b.id !== billId && b.customerId)
    if (!anyCustomer) {
      currentOrder.value.customerId = undefined
      currentOrder.value.customerName = undefined
    }
  } else {
    bill.stampCardId = undefined
    loyaltyCard.value = null
    const anyCard = currentOrder.value.bills.some(b => b.id !== billId && b.stampCardId)
    if (!anyCard) {
      currentOrder.value.stampCardId = undefined
    }
  }

  await ordersStore.updateOrder(currentOrder.value)
  console.log(`🎯 Detached ${what} from bill:`, billId)
}

const handleOpenBillLoyalty = (billId: string, tab: 'card' | 'customer') => {
  loyaltyBillId.value = billId
  loyaltyDialogTab.value = tab
  showLoyaltyDialog.value = true
}

// Computed: loyalty props for dialog based on current bill
const loyaltyDialogBill = computed(() => {
  if (!loyaltyBillId.value || !currentOrder.value) return null
  return currentOrder.value.bills.find(b => b.id === loyaltyBillId.value) || null
})

const handleLoyaltyCustomer = async (customer: Customer | null): Promise<void> => {
  if (!currentOrder.value || !loyaltyBillId.value) return
  const bill = currentOrder.value.bills.find(b => b.id === loyaltyBillId.value)
  if (!bill) return

  // Update bill with customer info
  bill.customerId = customer?.id
  bill.customerName = customer?.name

  // If opened from PaymentDialog, update ALL payment bills
  if (showPaymentDialog.value && paymentDialogData.value.billIds.length > 1) {
    for (const bid of paymentDialogData.value.billIds) {
      if (bid === loyaltyBillId.value) continue
      const b = currentOrder.value.bills.find(x => x.id === bid)
      if (b) {
        b.customerId = customer?.id
        b.customerName = customer?.name
      }
    }
  }

  // Also set on order level for backwards compat (first bill wins)
  if (customer) {
    currentOrder.value.customerId = customer.id
    currentOrder.value.customerName = customer.name
    // Ensure customer is in store cache with fresh balance (for PaymentDialog)
    try {
      await customersStore.refreshCustomer(customer.id)
    } catch {
      /* not critical */
    }

    // Auto-attach stamp card only if customer is on stamps program
    if (!bill.stampCardId && !loyaltyCard.value && customer.loyaltyProgram === 'stamps') {
      try {
        const card = await loyaltyStore.getActiveCardByCustomerId(customer.id)
        if (card) {
          loyaltyCard.value = card
          bill.stampCardId = card.cardId
          // If multi-bill payment, attach to all bills
          if (showPaymentDialog.value && paymentDialogData.value.billIds.length > 1) {
            for (const bid of paymentDialogData.value.billIds) {
              const b = currentOrder.value.bills.find(x => x.id === bid)
              if (b) b.stampCardId = card.cardId
            }
          }
          console.log('🎯 Auto-attached stamp card:', card.cardNumber)
        }
      } catch {
        /* not critical */
      }
    }
  }

  await ordersStore.updateOrder(currentOrder.value)
  showLoyaltyDialog.value = false
  console.log(
    '🎯 Bill loyalty customer updated:',
    customer?.name || 'detached',
    'bill:',
    loyaltyBillId.value
  )
}

const handleLoyaltyCard = async (card: StampCardInfo | null): Promise<void> => {
  if (!currentOrder.value || !loyaltyBillId.value) return
  const bill = currentOrder.value.bills.find(b => b.id === loyaltyBillId.value)
  if (!bill) return

  // Save locally for post-payment hooks
  loyaltyCard.value = card

  // Store card UUID on bill
  bill.stampCardId = card?.cardId || undefined

  // Auto-link card's customer if present and no customer on this bill yet
  if (card?.customerId && !bill.customerId) {
    bill.customerId = card.customerId
    const linkedCustomer = customersStore.getById(card.customerId)
    if (linkedCustomer) {
      bill.customerName = linkedCustomer.name
    }
  }

  // If opened from PaymentDialog, update ALL payment bills
  if (showPaymentDialog.value && paymentDialogData.value.billIds.length > 1) {
    for (const bid of paymentDialogData.value.billIds) {
      if (bid === loyaltyBillId.value) continue
      const b = currentOrder.value.bills.find(x => x.id === bid)
      if (b) {
        b.stampCardId = card?.cardId || undefined
        if (card?.customerId && !b.customerId) {
          b.customerId = card.customerId
          const linkedCustomer = customersStore.getById(card.customerId)
          if (linkedCustomer) b.customerName = linkedCustomer.name
        }
      }
    }
  }

  // Also set on order level for backwards compat
  currentOrder.value.stampCardId = card?.cardId || undefined
  if (card?.customerId && !currentOrder.value.customerId) {
    currentOrder.value.customerId = card.customerId
    currentOrder.value.customerName = bill.customerName
  }

  await ordersStore.updateOrder(currentOrder.value)
  showLoyaltyDialog.value = false
  console.log(
    '🎯 Bill loyalty card updated:',
    card?.cardNumber || 'detached',
    'bill:',
    loyaltyBillId.value
  )
}

const convertCardTier = computed(() => {
  const bill = loyaltyDialogBill.value
  const cid = bill?.customerId || currentOrder.value?.customerId
  if (!cid) return 'member'
  return customersStore.getById(cid)?.tier || 'member'
})

const convertCardCustomerId = computed(() => {
  const bill = loyaltyDialogBill.value
  return bill?.customerId || currentOrder.value?.customerId || ''
})

const convertCardCustomerName = computed(() => {
  const bill = loyaltyDialogBill.value
  return bill?.customerName || currentOrder.value?.customerName || ''
})

const handleConvertCard = (): void => {
  if (!loyaltyCard.value || !convertCardCustomerId.value) {
    showError('Attach both a customer and a stamp card to convert')
    return
  }
  showConvertCardDialog.value = true
}

const handleCardConverted = async (
  result: import('@/stores/loyalty').ConvertResult
): Promise<void> => {
  showSuccess(`Card converted! +${formatIDR(result.totalPoints)} points`)
  // Clear the card from the bill since it's now closed
  loyaltyCard.value = null
  if (currentOrder.value && loyaltyBillId.value) {
    const bill = currentOrder.value.bills.find(b => b.id === loyaltyBillId.value)
    if (bill) {
      bill.stampCardId = undefined
    }
    currentOrder.value.stampCardId = undefined
    ordersStore.updateOrder(currentOrder.value)

    // M6 FIX: Refresh customer data so balance is up to date
    const cid = bill?.customerId || currentOrder.value.customerId
    if (cid) {
      await customersStore.refreshCustomer(cid)
    }
  }
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

      // Save to database (order-level only, no item re-upsert)
      await ordersStore.updateOrderOnly(currentOrder.value)

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

  // Calculate totals — channel-aware
  const subtotal = paymentDialogData.value.amount
  const discount = paymentDialogData.value.discount
  const chId = paymentDialogData.value.channelId
  const channel = chId ? channelsStore.getChannelById(chId) : null
  const isInclusive = channel?.taxMode === 'inclusive'
  const discountedAmount = subtotal - discount

  const taxes = (channel?.taxes?.length ? channel.taxes : []).map(t => ({
    name: t.taxName,
    percentage: t.taxPercentage,
    amount: isInclusive ? 0 : discountedAmount * (t.taxPercentage / 100)
  }))

  // Fallback to global taxes if no channel
  if (taxes.length === 0) {
    const paymentSettingsStore = usePaymentSettingsStore()
    for (const t of paymentSettingsStore.activeTaxes) {
      taxes.push({
        name: t.name,
        percentage: t.percentage,
        amount: discountedAmount * (t.percentage / 100)
      })
    }
  }

  const totalTax = taxes.reduce((sum, t) => sum + t.amount, 0)
  const total = discountedAmount + totalTax

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
    taxes,
    taxInclusive: isInclusive,
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

const handleCancelOrderConfirm = async (data: {
  reason: import('@/stores/pos/types').CancellationReason
  notes: string
}): Promise<void> => {
  if (!currentOrder.value) return

  try {
    loading.value.actions = true
    loadingMessage.value = 'Cancelling order...'
    showCancelOrderDialog.value = false

    const order = currentOrder.value

    // Collect prepared items BEFORE cancelling (for write-offs)
    const preparedItems = order.bills.flatMap((b, _bi) =>
      b.items
        .filter(i => i.status === 'cooking' || i.status === 'ready')
        .map(i => ({ item: i, billId: b.id }))
    )

    // Cancel the order via RPC (sets status in DB, cancels all items)
    const result = await ordersStore.cancelOrder(order.id, data.reason, data.notes)

    if (result.success) {
      // Run write-offs for prepared items (non-blocking, fire-and-forget)
      // Items are already cancelled in DB by RPC, so we create write-offs directly
      if (preparedItems.length > 0) {
        ;(async () => {
          try {
            const { createDecompositionEngine } = await import(
              '@/core/decomposition/DecompositionEngine'
            )
            const { createWriteOffAdapter } = await import(
              '@/core/decomposition/adapters/WriteOffAdapter'
            )
            const { useStorageStore } = await import('@/stores/storage/storageStore')

            const engine = await createDecompositionEngine()
            const adapter = createWriteOffAdapter()
            const storageStore = useStorageStore()
            const currentUser = authStore.user?.name || 'Unknown'

            for (const { item } of preparedItems) {
              try {
                const traversal = await engine.traverse(
                  {
                    menuItemId: item.menuItemId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    selectedModifiers: item.selectedModifiers || []
                  },
                  adapter.getTraversalOptions()
                )
                const woResult = await adapter.transform(traversal, {
                  menuItemId: item.menuItemId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  selectedModifiers: item.selectedModifiers || []
                })
                if (woResult.items && woResult.items.length > 0) {
                  await storageStore.createWriteOff({
                    department: item.department || 'kitchen',
                    responsiblePerson: currentUser,
                    reason: 'other',
                    items: woResult.items.map(wi => ({
                      itemId: wi.type === 'product' ? wi.productId! : wi.preparationId!,
                      itemName: wi.type === 'product' ? wi.productName! : wi.preparationName!,
                      itemType: wi.type as 'product' | 'preparation',
                      quantity: wi.quantity,
                      unit: wi.unit
                    })),
                    notes: `Order ${order.orderNumber} cancelled: ${item.menuItemName} (${data.reason}${data.notes ? ': ' + data.notes : ''})`
                  })
                }
              } catch {
                // Non-critical per item
              }
            }
          } catch {
            // Non-critical — cancellation already succeeded
          }
        })()

        // Watchdog alert (non-blocking)
        import('@/core/watchdog/WatchdogService').then(({ onItemCancelled }) => {
          const currentShift = shiftsStore.currentShift
          if (currentShift) {
            onItemCancelled(
              currentShift.id,
              `Order ${order.orderNumber} (${preparedItems.length} items)`,
              authStore.user?.name || 'Unknown'
            )
          }
        })
      }

      showSuccess('Order cancelled successfully')
    } else {
      showError(result.error || 'Failed to cancel order')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel order'
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
  flex-shrink: 0;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  z-index: 10;
}

.online-order-bar {
  background: rgba(0, 150, 136, 0.08);
  border-bottom: 1px solid rgba(0, 150, 136, 0.15);
  padding: 6px 16px;
}

.online-order-bar-content {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.online-field {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
}

.online-comment {
  width: 100%;
  font-style: italic;
  color: rgba(255, 255, 255, 0.65);
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
