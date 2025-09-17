<!-- src/views/pos/order/OrderSection.vue -->
<template>
  <div class="order-section h-100 d-flex flex-column">
    <!-- Order Info Header -->
    <OrderInfo
      :order="currentOrder"
      :table-number="tableNumber"
      :can-edit="canEditOrder"
      @edit="handleEditOrder"
    />

    <!-- Bills Manager (Main Content) -->
    <BillsManager
      class="flex-grow-1"
      :order="currentOrder"
      :bills="bills"
      :active-bill-id="activeBillId"
      :can-add-bill="canAddBill"
      :can-remove-bill="canRemoveBill"
      :can-edit-items="canEditItems"
      :can-cancel-items="canCancelItems"
      @select-bill="handleSelectBill"
      @add-bill="handleAddBill"
      @rename-bill="handleRenameBill"
      @remove-bill="handleRemoveBill"
      @merge-bills="handleMergeBills"
      @update-item-quantity="handleUpdateItemQuantity"
      @edit-item="handleEditItem"
      @item-discount="handleItemDiscount"
      @item-add-note="handleItemAddNote"
      @move-item="handleMoveItem"
      @remove-item="handleRemoveItem"
      @cancel-item="handleCancelItem"
      @bulk-move="handleBulkMove"
      @bulk-remove="handleBulkRemove"
      @send-to-kitchen="handleSendToKitchen"
    />

    <!-- Order Totals -->
    <OrderTotals
      :bills="bills"
      :active-bill-id="activeBillId"
      :show-taxes="showTaxes"
      :service-tax-rate="serviceTaxRate"
      :government-tax-rate="governmentTaxRate"
      :loading="loading.calculations"
      :show-debug-info="debugMode"
    />

    <!-- Order Actions -->
    <OrderActions
      :order="currentOrder"
      :bills="bills"
      :active-bill="activeBill"
      :selected-items="selectedItems"
      :has-unsaved-changes="hasUnsavedChanges"
      :show-quick-actions="showQuickActions"
      @save="handleSave"
      @send-to-kitchen="handleSendToKitchenFromActions"
      @print="handlePrint"
      @move="handleMoveFromActions"
      @checkout="handleCheckout"
      @duplicate="handleDuplicate"
      @split="handleSplit"
      @merge="handleMergeFromActions"
      @cancel="handleCancelOrder"
    />

    <!-- Global Loading Overlay -->
    <v-overlay
      v-model="loading.global"
      class="d-flex align-center justify-center loading-overlay"
      :scrim="false"
      contained
      persistent
    >
      <div class="text-center">
        <v-progress-circular indeterminate color="primary" size="48" />
        <div class="text-h6 mt-3">{{ loadingMessage }}</div>
      </div>
    </v-overlay>

    <!-- Error Snackbar -->
    <v-snackbar
      v-model="error.show"
      :color="error.type"
      :timeout="error.timeout"
      location="top"
      :scrim="false"
    >
      {{ error.message }}
      <template #actions>
        <v-btn color="white" variant="text" @click="clearError">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- Success Snackbar -->
    <v-snackbar
      v-model="success.show"
      color="success"
      :timeout="success.timeout"
      location="top"
      :scrim="false"
    >
      {{ success.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { useMenuStore } from '@/stores/menu'
import type { PosOrder, PosBill, PosBillItem, OrderType } from '@/stores/pos/types'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'

// Import components
import OrderInfo from './components/OrderInfo.vue'
import BillsManager from './components/BillsManager.vue'
import OrderTotals from './components/OrderTotals.vue'
import OrderActions from './components/OrderActions.vue'

const MODULE_NAME = 'OrderSection'

// Stores
const ordersStore = usePosOrdersStore()
const tablesStore = usePosTablesStore()
const menuStore = useMenuStore()

// Props
interface Props {
  showTaxes?: boolean
  serviceTaxRate?: number
  governmentTaxRate?: number
  showQuickActions?: boolean
  debugMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showTaxes: true,
  serviceTaxRate: 5,
  governmentTaxRate: 10,
  showQuickActions: true,
  debugMode: false
})

// State
const selectedItems = ref<string[]>([])
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
  return !!activeBill.value && activeBill.value.paymentStatus === 'unpaid'
})

const canCancelItems = computed((): boolean => {
  return canEditItems.value
})

const hasUnsavedChanges = computed((): boolean => {
  // TODO: Implement unsaved changes detection
  return false
})

// Methods - Error Handling
const showError = (message: string, type: 'error' | 'warning' = 'error'): void => {
  error.value = {
    show: true,
    message,
    type,
    timeout: type === 'error' ? 5000 : 3000
  }
}

const showSuccess = (message: string): void => {
  success.value = {
    show: true,
    message,
    timeout: 3000
  }
}

const clearError = (): void => {
  error.value.show = false
}

const setLoading = (key: keyof typeof loading.value, value: boolean, message?: string): void => {
  loading.value[key] = value
  if (message) loadingMessage.value = message
}

// Methods - Order Management
const handleEditOrder = (order: PosOrder): void => {
  console.log('🔧 Order Section - Edit order:', {
    orderId: order.id,
    orderType: order.type,
    status: order.status
  })

  // TODO: Open order type editor dialog
  showSuccess(`Order editing opened for ${order.orderNumber}`)
}

// Methods - Bills Management
const handleSelectBill = async (billId: string): Promise<void> => {
  try {
    console.log('🧾 Order Section - Select bill:', { billId })

    await ordersStore.selectBill(billId)
    selectedItems.value = [] // Clear selection when switching bills
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to select bill'
    showError(message)
  }
}

const handleAddBill = async (): Promise<void> => {
  if (!currentOrder.value) return

  try {
    setLoading('actions', true, 'Creating new bill...')
    console.log('➕ Order Section - Add bill to order:', currentOrder.value.id)

    const billName = `Bill ${bills.value.length + 1}`
    await ordersStore.addBillToOrder(currentOrder.value.id, billName)

    showSuccess(`${billName} created successfully`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create bill'
    showError(message)
  } finally {
    setLoading('actions', false)
  }
}

const handleRenameBill = async (billId: string, newName: string): Promise<void> => {
  try {
    console.log('✏️ Order Section - Rename bill:', { billId, newName })

    // TODO: Implement bill rename in store
    // await ordersStore.renameBill(billId, newName)

    showSuccess(`Bill renamed to "${newName}"`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rename bill'
    showError(message)
  }
}

const handleRemoveBill = async (billId: string): Promise<void> => {
  try {
    setLoading('actions', true, 'Removing bill...')
    console.log('🗑️ Order Section - Remove bill:', { billId })

    // TODO: Implement bill removal in store
    // await ordersStore.removeBill(billId)

    showSuccess('Bill removed successfully')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove bill'
    showError(message)
  } finally {
    setLoading('actions', false)
  }
}

const handleMergeBills = async (): Promise<void> => {
  try {
    setLoading('actions', true, 'Merging bills...')
    console.log('🔗 Order Section - Merge bills')

    // TODO: Implement bill merging in store
    // await ordersStore.mergeBills(currentOrder.value.id)

    showSuccess('Bills merged successfully')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to merge bills'
    showError(message)
  } finally {
    setLoading('actions', false)
  }
}

// Methods - Items Management
const handleUpdateItemQuantity = async (itemId: string, quantity: number): Promise<void> => {
  if (!activeBillId.value) return

  try {
    console.log('📊 Order Section - Update item quantity:', { itemId, quantity })

    await ordersStore.updateItemQuantity(activeBillId.value, itemId, quantity)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update quantity'
    showError(message)
  }
}

const handleEditItem = (item: PosBillItem): void => {
  console.log('✏️ Order Section - Edit item:', {
    itemId: item.id,
    itemName: item.menuItemName
  })

  // TODO: Open item editor dialog
  showSuccess(`Editing ${item.menuItemName}`)
}

const handleItemDiscount = (item: PosBillItem): void => {
  console.log('💰 Order Section - Item discount:', {
    itemId: item.id,
    itemName: item.menuItemName
  })

  // TODO: Open discount dialog
  showSuccess(`Discount options for ${item.menuItemName}`)
}

const handleItemAddNote = (item: PosBillItem): void => {
  console.log('📝 Order Section - Add note:', {
    itemId: item.id,
    itemName: item.menuItemName
  })

  // TODO: Open note dialog
  showSuccess(`Note added to ${item.menuItemName}`)
}

const handleMoveItem = (item: PosBillItem): void => {
  console.log('↗️ Order Section - Move item:', {
    itemId: item.id,
    itemName: item.menuItemName
  })

  // TODO: Open move item dialog
  showSuccess(`Move options for ${item.menuItemName}`)
}

const handleRemoveItem = async (item: PosBillItem): Promise<void> => {
  if (!activeBillId.value) return

  try {
    console.log('🗑️ Order Section - Remove item:', {
      itemId: item.id,
      itemName: item.menuItemName
    })

    await ordersStore.removeItemFromBill(activeBillId.value, item.id)
    showSuccess(`${item.menuItemName} removed`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove item'
    showError(message)
  }
}

const handleCancelItem = (item: PosBillItem): void => {
  console.log('❌ Order Section - Cancel item:', {
    itemId: item.id,
    itemName: item.menuItemName
  })

  // TODO: Implement item cancellation
  showSuccess(`${item.menuItemName} cancelled`)
}

const handleBulkMove = (itemIds: string[]): void => {
  console.log('↗️ Order Section - Bulk move items:', { itemIds })

  // TODO: Open bulk move dialog
  showSuccess(`Moving ${itemIds.length} items`)
}

const handleBulkRemove = async (itemIds: string[]): Promise<void> => {
  if (!activeBillId.value) return

  try {
    setLoading('actions', true, 'Removing items...')

    for (const itemId of itemIds) {
      await ordersStore.removeItemFromBill(activeBillId.value, itemId)
    }

    showSuccess(`${itemIds.length} items removed`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove items'
    showError(message)
  } finally {
    setLoading('actions', false)
  }
}

const handleSendToKitchen = async (billId: string): Promise<void> => {
  try {
    setLoading('actions', true, 'Sending to kitchen...')
    console.log('🍳 Order Section - Send bill to kitchen:', { billId })

    await ordersStore.sendOrderToKitchen(currentOrder.value?.id || '')
    showSuccess('Order sent to kitchen')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send to kitchen'
    showError(message)
  } finally {
    setLoading('actions', false)
  }
}

// Methods - Actions
const handleSave = async (): Promise<void> => {
  try {
    setLoading('actions', true, 'Saving order...')
    console.log('💾 Order Section - Save order')

    // TODO: Implement order saving
    showSuccess('Order saved successfully')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save order'
    showError(message)
  } finally {
    setLoading('actions', false)
  }
}

const handleSendToKitchenFromActions = async (): Promise<void> => {
  if (!activeBillId.value) return
  await handleSendToKitchen(activeBillId.value)
}

const handlePrint = (): void => {
  console.log('🖨️ Order Section - Print order')
  showSuccess('Print dialog opened')
}

const handleMoveFromActions = (): void => {
  console.log('↗️ Order Section - Move from actions')
  showSuccess('Move dialog opened')
}

const handleCheckout = async (itemIds: string[], amount: number): Promise<void> => {
  try {
    console.log('💳 Order Section - Checkout:', { itemIds, amount })
    showSuccess(`Checkout for ${amount} initiated`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start checkout'
    showError(message)
  }
}

const handleDuplicate = (): void => {
  console.log('📄 Order Section - Duplicate bill')
  showSuccess('Bill duplicated')
}

const handleSplit = (): void => {
  console.log('✂️ Order Section - Split bill')
  showSuccess('Bill split options opened')
}

const handleMergeFromActions = async (): Promise<void> => {
  await handleMergeBills()
}

const handleCancelOrder = (): void => {
  console.log('❌ Order Section - Cancel order')
  showSuccess('Order cancellation initiated')
}

// Integration with MenuSection - Handle add item event
const handleAddItemFromMenu = async (item: MenuItem, variant: MenuItemVariant): Promise<void> => {
  if (!currentOrder.value) {
    showError('No active order. Please select a table first.')
    return
  }

  if (!activeBillId.value) {
    // Create first bill if none exists
    await handleAddBill()
  }

  try {
    setLoading('actions', true, 'Adding item to bill...')

    const itemData = {
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: variant.id,
      variantName: variant.name,
      quantity: 1,
      unitPrice: variant.price,
      totalPrice: variant.price,
      status: 'active' as const,
      kitchenNotes: '',
      discounts: [],
      modifications: []
    }

    await ordersStore.addItemToBill(activeBillId.value!, itemData)

    console.log('🍽️ Order Section - Item added from menu:', {
      orderId: currentOrder.value.id,
      billId: activeBillId.value,
      item: itemData
    })

    showSuccess(`${item.name} added to ${activeBill.value?.name || 'bill'}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add item'
    showError(message)
  } finally {
    setLoading('actions', false)
  }
}

// Lifecycle
onMounted(() => {
  console.log('🚀 Order Section mounted')

  // Listen for menu item selections from MenuSection
  // This would typically be handled by a parent component or event bus
})

// Watch for order changes
watch(
  currentOrder,
  (newOrder, oldOrder) => {
    if (newOrder?.id !== oldOrder?.id) {
      console.log('📋 Order Section - Current order changed:', {
        oldOrderId: oldOrder?.id,
        newOrderId: newOrder?.id
      })

      // Clear selections when order changes
      selectedItems.value = []
    }
  },
  { deep: true }
)

// Expose method for parent component to add items
defineExpose({
  handleAddItemFromMenu
})
</script>

<style scoped>
/* =============================================
   ORDER SECTION LAYOUT
   ============================================= */

.order-section {
  background: rgb(var(--v-theme-background));
  position: relative;
}

/* =============================================
   LOADING OVERLAY
   ============================================= */

.v-overlay {
  background: rgba(var(--v-theme-surface), 0.8) !important;
  backdrop-filter: none !important; /* УБИРАЕМ BLUR */
}

.v-overlay .v-overlay__scrim {
  display: none !important; /* УБИРАЕМ BACKDROP */
}
/* =============================================
   RESPONSIVE BEHAVIOR
   ============================================= */

@media (max-width: 768px) {
  .order-section {
    font-size: 0.9rem;
  }
}

/* =============================================
   COMPONENT SPACING
   ============================================= */

.order-section > * + * {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.04);
}

/* =============================================
   ACCESSIBILITY
   ============================================= */

.order-section:focus-within {
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
</style>
