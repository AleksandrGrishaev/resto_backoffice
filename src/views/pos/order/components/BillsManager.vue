<!-- src/views/pos/order/components/BillsManager.vue -->
<template>
  <div class="bills-manager flex-grow-1 d-flex flex-column">
    <!-- Bills Tabs Navigation -->
    <BillsTabs
      :bills="bills"
      :active-bill-id="activeBillId"
      :can-add-bill="canAddBill"
      :can-remove-bill="canRemoveBill"
      :max-bills="maxBills"
      @select-bill="handleSelectBill"
      @add-bill="handleAddBill"
      @rename-bill="handleRenameBill"
      @remove-bill="handleRemoveBill"
      @merge-bills="handleMergeBills"
    />

    <!-- Bill Content Area -->
    <div class="bill-content flex-grow-1 d-flex flex-column">
      <!-- Empty State - No Bills -->
      <div
        v-if="bills.length === 0"
        class="empty-state flex-grow-1 d-flex flex-column justify-center align-center pa-8"
      >
        <v-icon icon="mdi-receipt-outline" size="64" class="text-medium-emphasis mb-4" />
        <div class="text-h6 text-center mb-2">No Bills Created</div>
        <div class="text-body-2 text-medium-emphasis text-center mb-4">
          Create a bill to start adding items from the menu
        </div>
        <v-btn color="primary" size="large" :disabled="!canAddBill" @click="handleAddBill">
          <v-icon start>mdi-plus</v-icon>
          Create First Bill
        </v-btn>
      </div>

      <!-- Empty State - No Active Bill -->
      <div
        v-else-if="!activeBill"
        class="empty-state flex-grow-1 d-flex flex-column justify-center align-center pa-8"
      >
        <v-icon icon="mdi-cursor-pointer" size="64" class="text-medium-emphasis mb-4" />
        <div class="text-h6 text-center mb-2">Select a Bill</div>
        <div class="text-body-2 text-medium-emphasis text-center mb-4">
          Choose a bill from the tabs above to view and manage its items
        </div>
      </div>

      <!-- Empty State - No Items in Bill -->
      <div
        v-else-if="activeBill.items.length === 0"
        class="empty-state flex-grow-1 d-flex flex-column justify-center align-center pa-8"
      >
        <v-icon icon="mdi-cart-outline" size="64" class="text-medium-emphasis mb-4" />
        <div class="text-h6 text-center mb-2">{{ activeBill.name }} is Empty</div>
        <div class="text-body-2 text-medium-emphasis text-center mb-4">
          Add items to this bill from the menu section
        </div>
        <div class="bill-info text-center">
          <v-chip
            :color="getPaymentStatusColor(activeBill.paymentStatus)"
            variant="flat"
            class="mb-2"
          >
            <v-icon start size="16">{{ getPaymentStatusIcon(activeBill.paymentStatus) }}</v-icon>
            {{ getPaymentStatusLabel(activeBill.paymentStatus) }}
          </v-chip>
        </div>
      </div>

      <!-- Bill Items List -->
      <div v-else class="bill-items flex-grow-1 overflow-y-auto">
        <!-- Bill Header Info -->
        <div class="bill-header pa-4 bg-surface-variant">
          <div class="d-flex justify-space-between align-center">
            <div class="bill-info">
              <div class="bill-title text-h6 font-weight-medium">
                {{ activeBill.name }}
              </div>
              <div class="bill-subtitle text-caption text-medium-emphasis">
                {{ activeBill.items.length }} items • {{ formatPrice(activeBill.subtotal || 0) }}
              </div>
            </div>

            <div class="bill-status">
              <v-chip
                :color="getPaymentStatusColor(activeBill.paymentStatus)"
                variant="flat"
                size="small"
              >
                <v-icon start size="14">
                  {{ getPaymentStatusIcon(activeBill.paymentStatus) }}
                </v-icon>
                {{ getPaymentStatusLabel(activeBill.paymentStatus) }}
              </v-chip>
            </div>
          </div>
        </div>

        <!-- Items List -->
        <div class="items-list pa-4">
          <!-- Bulk Selection Header -->
          <div v-if="showBulkSelection" class="bulk-selection-header mb-3">
            <div
              class="d-flex align-center justify-space-between pa-3 rounded bg-primary-lighten-5"
            >
              <div class="selection-info">
                <v-checkbox
                  :model-value="isAllItemsSelected"
                  :indeterminate="isSomeItemsSelected && !isAllItemsSelected"
                  label="Select All"
                  hide-details
                  @update:model-value="handleSelectAllItems"
                />
                <span v-if="selectedItems.size > 0" class="text-caption ml-2">
                  {{ selectedItems.size }} items selected
                </span>
              </div>

              <div class="selection-actions">
                <v-btn
                  size="small"
                  variant="outlined"
                  :disabled="selectedItems.size === 0"
                  @click="handleBulkMove"
                >
                  <v-icon start size="16">mdi-arrow-right</v-icon>
                  Move
                </v-btn>

                <v-btn
                  size="small"
                  variant="outlined"
                  color="error"
                  class="ml-2"
                  :disabled="selectedItems.size === 0"
                  @click="handleBulkRemove"
                >
                  <v-icon start size="16">mdi-delete</v-icon>
                  Remove
                </v-btn>
              </div>
            </div>
          </div>

          <!-- Item Components -->
          <BillItem
            v-for="item in activeBill.items"
            :key="item.id"
            :item="item"
            :is-selected="selectedItems.has(item.id)"
            :selectable="showBulkSelection"
            :can-edit="canEditItems"
            :can-cancel="canCancelItems"
            @select="handleItemSelect(item.id, $event)"
            @update-quantity="handleUpdateQuantity"
            @edit="handleEditItem"
            @discount="handleItemDiscount"
            @add-note="handleItemAddNote"
            @move="handleMoveItem"
            @remove="handleRemoveItem"
            @cancel="handleCancelItem"
          />
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div v-if="activeBill && activeBill.items.length > 0" class="action-bar pa-3 bg-surface">
      <div class="d-flex align-center justify-space-between">
        <!-- Left Actions -->
        <div class="left-actions d-flex align-center gap-2">
          <v-btn
            :color="showBulkSelection ? 'primary' : 'surface-variant'"
            :variant="showBulkSelection ? 'flat' : 'outlined'"
            size="small"
            @click="toggleBulkSelection"
          >
            <v-icon start size="16">mdi-checkbox-multiple-marked</v-icon>
            {{ showBulkSelection ? 'Done' : 'Select' }}
          </v-btn>

          <v-btn
            variant="outlined"
            size="small"
            :disabled="activeBill.items.length === 0"
            @click="handleSendToKitchen"
          >
            <v-icon start size="16">mdi-chef-hat</v-icon>
            Send to Kitchen
          </v-btn>
        </div>

        <!-- Bill Total -->
        <div class="bill-total text-right">
          <div class="total-label text-caption text-medium-emphasis">Bill Total</div>
          <div class="total-amount text-h6 font-weight-bold text-primary">
            {{ formatPrice(activeBill.total || 0) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosBill, PosBillItem } from '@/stores/pos/types'
import BillsTabs from './BillsTabs.vue'
import BillItem from './BillItem.vue'

// Props
interface Props {
  bills: PosBill[]
  activeBillId: string | null
  canAddBill?: boolean
  canRemoveBill?: boolean
  canEditItems?: boolean
  canCancelItems?: boolean
  maxBills?: number
}

const props = withDefaults(defineProps<Props>(), {
  canAddBill: true,
  canRemoveBill: true,
  canEditItems: true,
  canCancelItems: true,
  maxBills: 10
})

// Emits
const emit = defineEmits<{
  'select-bill': [billId: string]
  'add-bill': []
  'rename-bill': [billId: string, newName: string]
  'remove-bill': [billId: string]
  'merge-bills': []
  'update-item-quantity': [itemId: string, quantity: number]
  'edit-item': [item: PosBillItem]
  'item-discount': [item: PosBillItem]
  'item-add-note': [item: PosBillItem]
  'move-item': [item: PosBillItem]
  'remove-item': [item: PosBillItem]
  'cancel-item': [item: PosBillItem]
  'bulk-move': [itemIds: string[]]
  'bulk-remove': [itemIds: string[]]
  'send-to-kitchen': [billId: string]
}>()

// State
const selectedItems = ref<Set<string>>(new Set())
const showBulkSelection = ref(false)

// Computed
const activeBill = computed((): PosBill | null => {
  return props.bills.find(bill => bill.id === props.activeBillId) || null
})

const isAllItemsSelected = computed((): boolean => {
  if (!activeBill.value || activeBill.value.items.length === 0) return false
  return activeBill.value.items.every(item => selectedItems.value.has(item.id))
})

const isSomeItemsSelected = computed((): boolean => {
  return selectedItems.value.size > 0 && !isAllItemsSelected.value
})

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    default:
      return 'grey'
  }
}

const getPaymentStatusIcon = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'mdi-check'
    case 'partial':
      return 'mdi-clock-time-four'
    default:
      return 'mdi-help'
  }
}

const getPaymentStatusLabel = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'PAID'
    case 'partial':
      return 'PARTIAL'
    default:
      return 'UNPAID'
  }
}

// Event Handlers - Bills Management
const handleSelectBill = (billId: string): void => {
  console.log('🧾 Bills Manager - Select bill:', { billId })

  // Clear selection when switching bills
  selectedItems.value.clear()
  showBulkSelection.value = false

  emit('select-bill', billId)
}

const handleAddBill = (): void => {
  console.log('➕ Bills Manager - Add bill')
  emit('add-bill')
}

const handleRenameBill = (billId: string, newName: string): void => {
  console.log('✏️ Bills Manager - Rename bill:', { billId, newName })
  emit('rename-bill', billId, newName)
}

const handleRemoveBill = (billId: string): void => {
  console.log('🗑️ Bills Manager - Remove bill:', { billId })

  // Clear selection if removing active bill
  if (billId === props.activeBillId) {
    selectedItems.value.clear()
    showBulkSelection.value = false
  }

  emit('remove-bill', billId)
}

const handleMergeBills = (): void => {
  console.log('🔗 Bills Manager - Merge bills')
  emit('merge-bills')
}

// Event Handlers - Item Management
const handleUpdateQuantity = (itemId: string, quantity: number): void => {
  console.log('📊 Bills Manager - Update quantity:', { itemId, quantity })
  emit('update-item-quantity', itemId, quantity)
}

const handleEditItem = (item: PosBillItem): void => {
  console.log('✏️ Bills Manager - Edit item:', { itemId: item.id, itemName: item.menuItemName })
  emit('edit-item', item)
}

const handleItemDiscount = (item: PosBillItem): void => {
  console.log('💰 Bills Manager - Item discount:', { itemId: item.id, itemName: item.menuItemName })
  emit('item-discount', item)
}

const handleItemAddNote = (item: PosBillItem): void => {
  console.log('📝 Bills Manager - Add note:', { itemId: item.id, itemName: item.menuItemName })
  emit('item-add-note', item)
}

const handleMoveItem = (item: PosBillItem): void => {
  console.log('↗️ Bills Manager - Move item:', { itemId: item.id, itemName: item.menuItemName })
  emit('move-item', item)
}

const handleRemoveItem = (item: PosBillItem): void => {
  console.log('🗑️ Bills Manager - Remove item:', { itemId: item.id, itemName: item.menuItemName })
  emit('remove-item', item)
}

const handleCancelItem = (item: PosBillItem): void => {
  console.log('❌ Bills Manager - Cancel item:', { itemId: item.id, itemName: item.menuItemName })
  emit('cancel-item', item)
}

// Event Handlers - Bulk Operations
const toggleBulkSelection = (): void => {
  showBulkSelection.value = !showBulkSelection.value
  if (!showBulkSelection.value) {
    selectedItems.value.clear()
  }

  console.log('📋 Bills Manager - Toggle bulk selection:', { enabled: showBulkSelection.value })
}

const handleItemSelect = (itemId: string, selected: boolean): void => {
  if (selected) {
    selectedItems.value.add(itemId)
  } else {
    selectedItems.value.delete(itemId)
  }

  console.log('☑️ Bills Manager - Item selection changed:', {
    itemId,
    selected,
    totalSelected: selectedItems.value.size
  })
}

const handleSelectAllItems = (selectAll: boolean): void => {
  if (!activeBill.value) return

  if (selectAll) {
    activeBill.value.items.forEach(item => selectedItems.value.add(item.id))
  } else {
    selectedItems.value.clear()
  }

  console.log('☑️ Bills Manager - Select all items:', {
    selectAll,
    totalSelected: selectedItems.value.size
  })
}

const handleBulkMove = (): void => {
  const itemIds = Array.from(selectedItems.value)
  console.log('↗️ Bills Manager - Bulk move:', { itemIds })

  emit('bulk-move', itemIds)
  selectedItems.value.clear()
}

const handleBulkRemove = (): void => {
  const itemIds = Array.from(selectedItems.value)
  console.log('🗑️ Bills Manager - Bulk remove:', { itemIds })

  emit('bulk-remove', itemIds)
  selectedItems.value.clear()
}

const handleSendToKitchen = (): void => {
  if (!activeBill.value) return

  console.log('🍳 Bills Manager - Send to kitchen:', { billId: activeBill.value.id })
  emit('send-to-kitchen', activeBill.value.id)
}
</script>

<style scoped>
/* =============================================
   BILLS MANAGER LAYOUT
   ============================================= */

.bills-manager {
  background: rgb(var(--v-theme-background));
  height: 100%;
}

.bill-content {
  background: rgb(var(--v-theme-background));
}

/* =============================================
   EMPTY STATES
   ============================================= */

.empty-state {
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
}

.empty-state .v-icon {
  opacity: 0.6;
}

/* =============================================
   BILL HEADER
   ============================================= */

.bill-header {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface-variant), 0.5);
}

.bill-info {
  flex: 1;
  min-width: 0;
}

.bill-title {
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
}

.bill-subtitle {
  line-height: 1.2;
  margin-top: 2px;
}

/* =============================================
   ITEMS LIST
   ============================================= */

.items-list {
  background: rgb(var(--v-theme-background));
}

.bulk-selection-header {
  border-radius: var(--v-border-radius-md);
}

/* =============================================
   ACTION BAR
   ============================================= */

.action-bar {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: blur(10px);
}

.left-actions {
  gap: var(--spacing-xs);
}

.bill-total {
  text-align: right;
  min-width: 120px;
}

.total-amount {
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .bill-header {
    padding: var(--spacing-sm) !important;
  }

  .items-list {
    padding: var(--spacing-sm) !important;
  }

  .action-bar {
    padding: var(--spacing-sm) !important;
  }

  .action-bar .d-flex {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }

  .left-actions {
    justify-content: space-between;
  }

  .bill-total {
    text-align: center;
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .bulk-selection-header .d-flex {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }

  .selection-actions {
    justify-content: center;
  }

  .left-actions {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
}

/* =============================================
   SCROLL BEHAVIOR
   ============================================= */

.bill-items {
  scroll-behavior: smooth;
}

.bill-items::-webkit-scrollbar {
  width: 6px;
}

.bill-items::-webkit-scrollbar-track {
  background: transparent;
}

.bill-items::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.bill-items::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

/* =============================================
   LOADING STATES
   ============================================= */

.bills-manager.loading {
  opacity: 0.8;
  pointer-events: none;
}

/* =============================================
   ANIMATIONS
   ============================================= */

.bill-content {
  transition: all 0.3s ease;
}

.bulk-selection-header {
  animation: slideInFromTop 0.3s ease;
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.action-bar {
  animation: slideInFromBottom 0.3s ease;
}

@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
