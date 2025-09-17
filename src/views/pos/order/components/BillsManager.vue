<!-- src/views/pos/order/components/BillsManager.vue -->
<template>
  <div class="bills-manager h-100 d-flex flex-column">
    <!-- Bills Tabs Header -->
    <BillsTabs
      :bills="bills"
      :active-bill-id="activeBillId"
      :selected-bills="selectedBills"
      :can-add-bill="canAddBill"
      :order-type="order?.type || null"
      :show-selection-mode="true"
      @select-bill="handleSelectBill"
      @add-bill="handleAddBill"
      @toggle-bill-selection="handleToggleBillSelection"
    />

    <!-- Bill Content -->
    <div class="bill-content flex-grow-1 d-flex flex-column">
      <!-- Empty State - No Active Bill -->
      <div
        v-if="!activeBill"
        class="empty-state flex-grow-1 d-flex flex-column justify-center align-center pa-8"
      >
        <v-icon icon="mdi-receipt-text-outline" size="64" class="text-medium-emphasis mb-4" />
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
      </div>

      <!-- Bill Items List -->
      <div v-else class="bill-items flex-grow-1 overflow-y-auto">
        <!-- Item List -->
        <div class="items-list">
          <BillItem
            v-for="item in activeBill.items"
            :key="item.id"
            :item="item"
            :is-selected="selectedItems.has(item.id)"
            :show-checkbox="true"
            @select="handleItemSelect(item.id, $event)"
            @update-quantity="handleUpdateQuantity"
          />
        </div>
      </div>
    </div>

    <!-- Order Totals -->
    <div
      v-if="activeBill && activeBill.items.length > 0"
      class="order-totals pa-4 bg-surface-variant"
    >
      <div class="totals-content">
        <!-- Subtotal -->
        <div class="total-line d-flex justify-space-between">
          <span class="total-label">Subtotal</span>
          <span class="total-amount">{{ formatPrice(activeBill.subtotal || 0) }}</span>
        </div>

        <!-- Service Tax -->
        <div class="total-line d-flex justify-space-between">
          <span class="total-label">Service Tax (5%)</span>
          <span class="total-amount">{{ formatPrice((activeBill.subtotal || 0) * 0.05) }}</span>
        </div>

        <!-- Government Tax -->
        <div class="total-line d-flex justify-space-between">
          <span class="total-label">Government Tax (10%)</span>
          <span class="total-amount">{{ formatPrice((activeBill.subtotal || 0) * 0.1) }}</span>
        </div>

        <!-- Total -->
        <v-divider class="my-2" />
        <div class="total-line total-final d-flex justify-space-between">
          <span class="total-label text-h6 font-weight-bold">Total</span>
          <span class="total-amount text-h6 font-weight-bold">
            {{ formatPrice(activeBill.total || 0) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div v-if="activeBill && activeBill.items.length > 0" class="action-bar pa-4 bg-surface">
      <div class="d-flex align-center gap-3">
        <!-- Send to Kitchen Button - показывается если есть новые позиции -->
        <v-btn
          v-if="hasUnsavedChanges"
          color="primary"
          variant="flat"
          size="large"
          :loading="isSendingToKitchen"
          :disabled="selectedItems.size === 0 && !isFullBillSelected"
          @click="handleSendToKitchen"
        >
          Send to Kitchen
        </v-btn>

        <v-spacer />

        <!-- Move Button - активна только при выделении -->
        <v-btn
          icon
          variant="outlined"
          size="large"
          :disabled="selectedItems.size === 0 && !isFullBillSelected"
          @click="handleMoveItems"
        >
          <v-icon>mdi-arrow-right</v-icon>
        </v-btn>

        <!-- Checkout Button -->
        <v-btn
          color="success"
          variant="flat"
          size="large"
          :loading="isProcessingCheckout"
          @click="handleCheckout"
        >
          Checkout
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosOrder, PosBill, PosBillItem } from '@/stores/pos/types'
import { formatIDR, DebugUtils } from '@/utils'

// Alias для удобства
const formatPrice = formatIDR
import BillsTabs from './BillsTabs.vue'
import BillItem from './BillItem.vue'

const MODULE_NAME = 'BillsManager'

// Props
interface Props {
  order?: PosOrder | null
  bills: PosBill[]
  activeBillId: string | null
  canAddBill?: boolean
  hasUnsavedChanges?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canAddBill: true,
  hasUnsavedChanges: false
})

// Emits
const emit = defineEmits<{
  'select-bill': [billId: string]
  'add-bill': []
  'update-item-quantity': [itemId: string, quantity: number]
  'send-to-kitchen': [itemIds: string[]]
  'move-items': [itemIds: string[], sourceBillId: string]
  checkout: [itemIds: string[], billId: string]
}>()

// State
const selectedItems = ref<Set<string>>(new Set())
const selectedBills = ref<Set<string>>(new Set())
const isSendingToKitchen = ref(false)
const isProcessingCheckout = ref(false)

// Computed
const activeBill = computed(() => {
  if (!props.activeBillId) return null
  return props.bills.find(bill => bill.id === props.activeBillId) || null
})

const isFullBillSelected = computed(() => {
  return props.activeBillId ? selectedBills.value.has(props.activeBillId) : false
})

const getSelectedItemIds = computed(() => {
  if (isFullBillSelected.value && activeBill.value) {
    // Если выбран целый счет, возвращаем все его позиции
    return activeBill.value.items.map(item => item.id)
  }
  return Array.from(selectedItems.value)
})

// Methods
const handleSelectBill = (billId: string): void => {
  // При переключении счета очищаем выделения
  selectedItems.value.clear()
  selectedBills.value.clear()

  emit('select-bill', billId)
}

const handleAddBill = (): void => {
  emit('add-bill')
}

const handleItemSelect = (itemId: string, selected: boolean): void => {
  if (selected) {
    selectedItems.value.add(itemId)
  } else {
    selectedItems.value.delete(itemId)
  }

  // Если выбраны все позиции счета, автоматически выбираем счет
  if (activeBill.value && selectedItems.value.size === activeBill.value.items.length) {
    if (props.activeBillId) {
      selectedBills.value.add(props.activeBillId)
    }
  } else {
    // Иначе снимаем выделение со счета
    if (props.activeBillId) {
      selectedBills.value.delete(props.activeBillId)
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Item selection changed', {
    itemId,
    selected,
    selectedItemsCount: selectedItems.value.size,
    selectedBillsCount: selectedBills.value.size
  })
}

const handleToggleBillSelection = (billId: string): void => {
  if (selectedBills.value.has(billId)) {
    // Снимаем выделение со счета и всех его позиций
    selectedBills.value.delete(billId)

    if (activeBill.value && billId === activeBill.value.id) {
      activeBill.value.items.forEach(item => {
        selectedItems.value.delete(item.id)
      })
    }
  } else {
    // Выделяем счет и все его позиции
    selectedBills.value.add(billId)

    if (activeBill.value && billId === activeBill.value.id) {
      activeBill.value.items.forEach(item => {
        selectedItems.value.add(item.id)
      })
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Bill selection toggled', {
    billId,
    isSelected: selectedBills.value.has(billId),
    selectedItemsCount: selectedItems.value.size,
    selectedBillsCount: selectedBills.value.size
  })
}

const handleUpdateQuantity = (itemId: string, quantity: number): void => {
  emit('update-item-quantity', itemId, quantity)
}

const handleSendToKitchen = async (): Promise<void> => {
  const itemIds = getSelectedItemIds.value

  if (itemIds.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'No items selected for kitchen')
    return
  }

  try {
    isSendingToKitchen.value = true

    DebugUtils.info(MODULE_NAME, 'Sending items to kitchen', {
      itemIds,
      count: itemIds.length
    })

    emit('send-to-kitchen', itemIds)

    // Очищаем выделение после отправки
    selectedItems.value.clear()
    selectedBills.value.clear()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to send to kitchen', { error })
  } finally {
    isSendingToKitchen.value = false
  }
}

const handleMoveItems = (): void => {
  const itemIds = getSelectedItemIds.value

  if (itemIds.length === 0 || !props.activeBillId) {
    DebugUtils.warn(MODULE_NAME, 'No items selected for move')
    return
  }

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

    let itemIds = getSelectedItemIds.value

    // Если ничего не выбрано, выбираем все позиции счета
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

// Watchers
watch(
  () => props.activeBillId,
  (newBillId, oldBillId) => {
    if (newBillId !== oldBillId) {
      // При смене активного счета очищаем выделения
      selectedItems.value.clear()
      selectedBills.value.clear()
    }
  }
)

watch(
  () => activeBill.value?.items.length,
  (newLength, oldLength) => {
    if (newLength !== oldLength) {
      // При изменении количества позиций проверяем выделения
      if (activeBill.value) {
        const validItemIds = activeBill.value.items.map(item => item.id)
        const newSelectedItems = new Set(
          Array.from(selectedItems.value).filter(id => validItemIds.includes(id))
        )
        selectedItems.value = newSelectedItems
      }
    }
  }
)
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
   ITEMS LIST
   ============================================= */

.items-list {
  padding: var(--spacing-xs);
}

/* =============================================
   ORDER TOTALS
   ============================================= */

.order-totals {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.total-line {
  margin-bottom: 8px;
}

.total-line:last-child {
  margin-bottom: 0;
}

.total-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.total-amount {
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface));
}

.total-final .total-label,
.total-final .total-amount {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.125rem;
}

/* =============================================
   ACTION BAR
   ============================================= */

.action-bar {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface), 0.95);
  backdrop-filter: blur(10px);
}

.action-bar .v-btn {
  min-height: 48px;
}

/* Move button styling */
.action-bar .v-btn[disabled] {
  opacity: 0.4;
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
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .order-totals,
  .action-bar {
    padding: var(--spacing-sm);
  }

  .action-bar {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .action-bar .v-spacer {
    display: none;
  }

  .action-bar .d-flex {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
