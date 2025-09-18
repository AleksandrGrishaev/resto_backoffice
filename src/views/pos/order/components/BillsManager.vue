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
}>()

// Computed
const activeBill = computed(() => {
  if (!props.activeBillId) return null
  return props.bills.find(bill => bill.id === props.activeBillId) || null
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
  max-height: calc(100vh - 400px); /* Ограничиваем высоту для scroll */
  min-height: 200px;
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
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .items-list {
    padding: var(--spacing-sm);
  }

  /* Обеспечиваем правильную работу scroll на мобильных */
  .bills-manager {
    height: 100%;
    overflow: hidden;
  }

  .bill-content {
    min-height: 0; /* Критично для мобильного flex */
  }
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
   DARK MODE ADJUSTMENTS
   ============================================= */

@media (prefers-color-scheme: dark) {
  .bill-summary {
    background: rgba(var(--v-theme-surface), 0.9);
  }
}
</style>
