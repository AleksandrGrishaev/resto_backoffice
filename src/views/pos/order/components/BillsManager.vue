<!-- src/views/pos/order/components/BillsManager.vue -->
<template>
  <div class="bills-manager">
    <!-- Bills Navigation Tabs -->
    <BillsTabs
      :bills="bills"
      :active-bill-id="activeBillId"
      :order-type="order?.type || 'dine_in'"
      :can-add-bill="canAddBill"
      :show-selection-mode="true"
      :is-bill-selected="ordersStore.isBillSelected"
      @select-bill="handleSelectBill"
      @add-bill="handleAddBill"
      @toggle-bill-selection="handleToggleBillSelection"
      @rename-bill="handleRenameBill"
      @remove-bill="handleRemoveBill"
    />

    <!-- Bill Content -->
    <div v-if="activeBill" class="bill-content">
      <!-- Empty State -->
      <div v-if="activeBill.items.length === 0" class="empty-state pa-8">
        <div class="text-center">
          <v-icon size="48" color="grey-darken-1" class="mb-4">mdi-receipt-text-outline</v-icon>
          <div class="text-h6 text-grey-darken-1 mb-2">No items in this bill</div>
          <div class="text-body-2 text-grey-darken-1">Add items from the menu to get started</div>
        </div>
      </div>

      <!-- Items List -->
      <div v-else class="items-list">
        <BillItem
          v-for="item in activeBill.items"
          :key="item.id"
          :item="item"
          :selected="ordersStore.isItemSelected(item.id)"
          :can-modify="canEditItems"
          :show-checkbox="true"
          :show-status="true"
          :show-actions="true"
          @select="handleItemSelect"
          @update-quantity="handleUpdateQuantity"
          @modify="handleModifyItem"
          @cancel="handleCancelItem"
          @add-note="handleAddNote"
        />
      </div>

      <!-- Bill Summary -->
      <div class="bill-summary pa-4 bg-grey-lighten-4">
        <div class="d-flex justify-space-between align-center text-body-1">
          <span class="font-weight-medium">Bill Total:</span>
          <span class="font-weight-bold text-primary">
            {{ formatPrice(activeBill.total || 0) }}
          </span>
        </div>

        <!-- Selection Summary -->
        <div v-if="ordersStore.hasSelection" class="selection-summary mt-2 pt-2 border-t">
          <div class="d-flex justify-space-between align-center text-caption text-primary">
            <span>{{ ordersStore.selectedItemsCount }} items selected</span>
            <span class="font-weight-medium">
              {{ formatPrice(getSelectedItemsTotal.value) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- No Active Bill State -->
    <div v-else class="no-bill-state pa-8">
      <div class="text-center">
        <v-icon size="48" color="grey-darken-2" class="mb-4">mdi-receipt-plus</v-icon>
        <div class="text-h6 text-grey-darken-1 mb-2">No active bill</div>
        <div class="text-body-2 text-grey-darken-1 mb-4">
          Select a bill from the tabs above or create a new one
        </div>
        <v-btn v-if="canAddBill" color="primary" variant="flat" @click="handleAddBill">
          <v-icon start>mdi-plus</v-icon>
          Create First Bill
        </v-btn>
      </div>
    </div>

    <!-- Action Bar -->
    <div
      v-if="activeBill && activeBill.items.length > 0"
      class="action-bar pa-4 bg-surface elevation-2"
    >
      <div class="d-flex align-center gap-3">
        <!-- Send to Kitchen Button -->
        <v-btn
          v-if="hasUnsavedChanges && hasItemsToSend"
          color="primary"
          variant="flat"
          size="large"
          :loading="isSendingToKitchen"
          :disabled="!ordersStore.hasSelection && !hasNewItems"
          @click="handleSendToKitchen"
        >
          <v-icon start>mdi-chef-hat</v-icon>
          Send to Kitchen
          <v-badge
            v-if="ordersStore.selectedItemsCount > 0"
            :content="ordersStore.selectedItemsCount"
            color="warning"
            class="ml-2"
          />
        </v-btn>

        <v-spacer />

        <!-- Selection Actions -->
        <div v-if="ordersStore.hasSelection" class="selection-actions d-flex gap-2">
          <!-- Move Button -->
          <v-btn icon variant="outlined" size="large" @click="handleMoveItems">
            <v-icon>mdi-arrow-right</v-icon>
            <v-tooltip activator="parent" location="top">
              Move {{ ordersStore.selectedItemsCount }} items
            </v-tooltip>
          </v-btn>

          <!-- Clear Selection Button -->
          <v-btn icon variant="text" size="large" @click="ordersStore.clearSelection">
            <v-icon>mdi-selection-off</v-icon>
            <v-tooltip activator="parent" location="top">Clear Selection</v-tooltip>
          </v-btn>
        </div>

        <!-- Checkout Button -->
        <v-btn
          color="success"
          variant="flat"
          size="large"
          :loading="isProcessingCheckout"
          @click="handleCheckout"
        >
          <v-icon start>mdi-credit-card</v-icon>
          {{ ordersStore.selectedItemsCount > 0 ? 'Checkout Selected' : 'Checkout All' }}
          <v-badge
            v-if="ordersStore.selectedItemsCount > 0"
            :content="ordersStore.selectedItemsCount"
            color="info"
            class="ml-2"
          />
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosOrder, PosBill, PosBillItem } from '@/stores/pos/types'
import { formatIDR, DebugUtils } from '@/utils'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'

// Components
import BillsTabs from './BillsTabs.vue'
import BillItem from './BillItem.vue'

// Alias для удобства
const formatPrice = formatIDR

const MODULE_NAME = 'BillsManager'

// Store
const ordersStore = usePosOrdersStore()

// Props
interface Props {
  order?: PosOrder | null
  bills: PosBill[]
  activeBillId: string | null
  canAddBill?: boolean
  canEditItems?: boolean
  hasUnsavedChanges?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canAddBill: true,
  canEditItems: true,
  hasUnsavedChanges: false
})

// Emits
const emit = defineEmits<{
  'select-bill': [billId: string]
  'add-bill': []
  'rename-bill': [billId: string, newName: string]
  'remove-bill': [billId: string]
  'update-item-quantity': [itemId: string, quantity: number]
  'modify-item': [itemId: string]
  'cancel-item': [itemId: string]
  'add-note': [itemId: string]
  'send-to-kitchen': [itemIds: string[]]
  'move-items': [itemIds: string[], sourceBillId: string]
  checkout: [itemIds: string[], billId: string]
}>()

// Local State
const isSendingToKitchen = ref(false)
const isProcessingCheckout = ref(false)

// Computed
const activeBill = computed(() => {
  if (!props.activeBillId) return null
  return props.bills.find(bill => bill.id === props.activeBillId) || null
})

const hasNewItems = computed(() => {
  return activeBill.value?.items.some(item => item.status === 'pending') || false
})

const hasItemsToSend = computed(() => {
  return (
    activeBill.value?.items.some(item => item.status === 'pending' || item.status === 'active') ||
    false
  )
})

const getSelectedItemsTotal = computed((): number => {
  if (!activeBill.value || ordersStore.selectedItemsCount === 0) return 0

  return activeBill.value.items.reduce((sum, item) => {
    return ordersStore.isItemSelected(item.id) ? sum + item.totalPrice : sum
  }, 0)
})

// Methods - Bill Management
const handleSelectBill = (billId: string): void => {
  emit('select-bill', billId)
}

const handleAddBill = (): void => {
  emit('add-bill')
}

const handleToggleBillSelection = (billId: string): void => {
  ordersStore.toggleBillSelection(billId)

  DebugUtils.debug(MODULE_NAME, 'Bill selection toggled', {
    billId,
    isSelected: ordersStore.isBillSelected(billId),
    selectedItemsCount: ordersStore.selectedItemsCount,
    selectedBillsCount: ordersStore.selectedBillsCount
  })
}

const handleRenameBill = (billId: string, newName: string): void => {
  emit('rename-bill', billId, newName)
}

const handleRemoveBill = (billId: string): void => {
  emit('remove-bill', billId)
}

// Methods - Item Management
const handleItemSelect = (itemId: string, selected: boolean): void => {
  ordersStore.toggleItemSelection(itemId)

  DebugUtils.debug(MODULE_NAME, 'Item selection changed', {
    itemId,
    selected: ordersStore.isItemSelected(itemId),
    selectedItemsCount: ordersStore.selectedItemsCount
  })
}

const handleUpdateQuantity = (itemId: string, quantity: number): void => {
  emit('update-item-quantity', itemId, quantity)
}

const handleModifyItem = (itemId: string): void => {
  emit('modify-item', itemId)
}

const handleCancelItem = (itemId: string): void => {
  emit('cancel-item', itemId)
}

const handleAddNote = (itemId: string): void => {
  emit('add-note', itemId)
}

// Methods - Actions
const handleSendToKitchen = async (): Promise<void> => {
  if (!activeBill.value) return

  try {
    isSendingToKitchen.value = true

    let itemIds: string[] = []

    if (ordersStore.selectedItemsCount > 0) {
      // Отправляем выбранные элементы
      itemIds = ordersStore.selectedItemIds
      DebugUtils.info(MODULE_NAME, 'Sending selected items to kitchen', {
        itemIds,
        count: itemIds.length
      })
    } else if (hasNewItems.value) {
      // Отправляем все новые элементы
      itemIds = activeBill.value.items
        .filter(item => item.status === 'pending')
        .map(item => item.id)
      DebugUtils.info(MODULE_NAME, 'Sending new items to kitchen', {
        itemIds,
        count: itemIds.length
      })
    }

    if (itemIds.length > 0) {
      emit('send-to-kitchen', itemIds)
      ordersStore.clearSelection()
    } else {
      DebugUtils.warn(MODULE_NAME, 'No items to send to kitchen')
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to send to kitchen', { error })
  } finally {
    isSendingToKitchen.value = false
  }
}

const handleMoveItems = (): void => {
  if (!props.activeBillId || ordersStore.selectedItemsCount === 0) {
    DebugUtils.warn(MODULE_NAME, 'No items selected for move')
    return
  }

  const itemIds = ordersStore.selectedItemIds

  DebugUtils.info(MODULE_NAME, 'Opening move dialog', {
    itemIds,
    sourceBillId: props.activeBillId,
    count: itemIds.length
  })

  emit('move-items', itemIds, props.activeBillId)
}

const handleCheckout = async (): Promise<void> => {
  if (!props.activeBillId || !activeBill.value) {
    DebugUtils.warn(MODULE_NAME, 'No active bill for checkout')
    return
  }

  try {
    isProcessingCheckout.value = true

    let itemIds = ordersStore.selectedItemIds

    // Если ничего не выбрано, берем все позиции счета
    if (itemIds.length === 0) {
      itemIds = activeBill.value.items.map(item => item.id)
      DebugUtils.info(MODULE_NAME, 'No items selected, checking out entire bill', {
        billId: props.activeBillId,
        itemCount: itemIds.length
      })
    } else {
      DebugUtils.info(MODULE_NAME, 'Checking out selected items', {
        billId: props.activeBillId,
        itemIds,
        count: itemIds.length
      })
    }

    emit('checkout', itemIds, props.activeBillId)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Checkout failed', { error })
  } finally {
    isProcessingCheckout.value = false
  }
}
</script>

<style scoped>
/* =============================================
   BILLS MANAGER LAYOUT
   ============================================= */

.bills-manager {
  background: rgb(var(--v-theme-background));
  height: 100%;
  display: flex;
  flex-direction: column;
}

.bill-content {
  background: rgb(var(--v-theme-background));
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* =============================================
   ITEMS LIST
   ============================================= */

.items-list {
  padding: var(--spacing-md);
  flex: 1;
  overflow-y: auto;
}

/* =============================================
   EMPTY STATES
   ============================================= */

.empty-state,
.no-bill-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.empty-state {
  animation: fadeIn 0.5s ease;
}

.no-bill-state {
  animation: slideUp 0.4s ease;
}

/* =============================================
   BILL SUMMARY
   ============================================= */

.bill-summary {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}

.selection-summary {
  border-top: 1px solid rgba(var(--v-theme-primary), 0.2);
}

/* =============================================
   ACTION BAR
   ============================================= */

.action-bar {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
  flex-shrink: 0;
  min-height: 80px;
}

.selection-actions {
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: var(--v-border-radius-lg);
  padding: var(--spacing-xs);
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .items-list {
    padding: var(--spacing-sm);
  }

  .action-bar {
    padding: var(--spacing-sm) !important;
    min-height: 64px;
  }

  .action-bar .d-flex {
    flex-wrap: wrap;
    gap: 8px;
  }

  .selection-actions {
    order: -1;
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .action-bar .d-flex {
    flex-direction: column;
  }

  .action-bar .v-btn {
    width: 100%;
  }

  .action-bar .v-spacer {
    display: none;
  }

  .selection-actions {
    flex-direction: row;
    width: auto;
  }
}

/* =============================================
   LOADING STATES
   ============================================= */

.bills-manager.loading {
  opacity: 0.8;
  pointer-events: none;
}

.v-btn:disabled {
  opacity: 0.4;
}

.v-btn.v-btn--loading {
  opacity: 0.8;
}

/* =============================================
   ANIMATIONS
   ============================================= */

.bills-manager {
  transition: all 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =============================================
   SELECTION HIGHLIGHTS
   ============================================= */

.action-bar:has(.selection-actions) {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.08),
    rgba(var(--v-theme-surface), 1)
  );
  border-color: rgba(var(--v-theme-primary), 0.2);
}

/* =============================================
   SCROLLBAR STYLING
   ============================================= */

.items-list::-webkit-scrollbar {
  width: 8px;
}

.items-list::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 4px;
}

.items-list::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 4px;
}

.items-list::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

/* =============================================
   BADGES AND INDICATORS
   ============================================= */

.v-badge :deep(.v-badge__badge) {
  font-size: 0.7rem;
  height: 18px;
  min-width: 18px;
}

/* =============================================
   DARK MODE ADJUSTMENTS
   ============================================= */

@media (prefers-color-scheme: dark) {
  .bill-summary {
    background: rgba(var(--v-theme-surface), 0.9);
  }

  .selection-actions {
    background: rgba(var(--v-theme-primary), 0.1);
  }
}
</style>
